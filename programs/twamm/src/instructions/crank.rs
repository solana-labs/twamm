//! Crank instruction handler

use {
    crate::{
        error::TwammError,
        math,
        oracle::OraclePrice,
        state::{
            pool::Pool,
            token_pair::{MatchingSide, SettlementType, TokenPair},
        },
    },
    anchor_lang::prelude::*,
    anchor_spl::token::{Token, TokenAccount},
    solana_program::{
        instruction::{AccountMeta, Instruction},
        program,
    },
};

#[derive(Accounts)]
pub struct Crank<'info> {
    // transaction fee payer
    #[account()]
    pub owner: Signer<'info>,

    // crank rewards receiver
    #[account(
        mut,
        constraint = user_account_token_a.mint == custody_token_a.mint,
        has_one = owner
    )]
    pub user_account_token_a: Box<Account<'info, TokenAccount>>,

    // crank rewards receiver
    #[account(
        mut,
        constraint = user_account_token_b.mint == custody_token_b.mint,
        has_one = owner
    )]
    pub user_account_token_b: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"token_pair",
                 token_pair.config_a.mint.as_ref(),
                 token_pair.config_b.mint.as_ref()],
        bump = token_pair.token_pair_bump)]
    pub token_pair: Box<Account<'info, TokenPair>>,

    /// CHECK: empty PDA, authority for token accounts
    #[account(
        mut,
        seeds = [b"transfer_authority"],
        bump = token_pair.transfer_authority_bump
    )]
    pub transfer_authority: AccountInfo<'info>,

    #[account(
        mut,
        constraint = custody_token_a.key() == token_pair.config_a.custody
    )]
    pub custody_token_a: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = custody_token_b.key() == token_pair.config_b.custody
    )]
    pub custody_token_b: Box<Account<'info, TokenAccount>>,

    /// CHECK: oracle account for token a depending on oracle type
    #[account(
        constraint = oracle_token_a.key() == token_pair.config_a.oracle_account
    )]
    pub oracle_token_a: AccountInfo<'info>,

    /// CHECK: oracle account for token b depending on oracle type
    #[account(
        constraint = oracle_token_b.key() == token_pair.config_b.oracle_account
    )]
    pub oracle_token_b: AccountInfo<'info>,

    token_program: Program<'info, Token>,
    // remaining accounts:
    //   1 to TokenPair::MAX_POOLS addresses of current pool accounts (write, unsigned)
    //   Router program (only Jupiter for now)
    //   Router accounts (as is)
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CrankParams {
    router_instruction_data: Vec<u8>,
}

pub fn crank(ctx: Context<Crank>, params: &CrankParams) -> Result<i64> {
    // validate inputs
    let token_pair = ctx.accounts.token_pair.as_mut();
    require!(token_pair.allow_cranks, TwammError::CranksNotAllowed);

    if token_pair.crank_authority != Pubkey::default()
        && token_pair.crank_authority != ctx.accounts.owner.key()
    {
        msg!("Error: Permissionless cranks are not enabled for this token pair");
        return err!(TwammError::CranksNotAllowed);
    }

    // collect and validate pools
    msg!("Load pools");
    let (mut pools, router_program) = token_pair.load_pools(ctx.remaining_accounts)?;
    require!(!pools.is_empty(), TwammError::NothingToSettle);

    let token_a_change;
    let token_b_change;
    let swap_price;
    let swap_amount;
    let receive_amount;
    let supply_side;
    let oracle_price = token_pair
        .get_token_pair_oracle_price(&ctx.accounts.oracle_token_a, &ctx.accounts.oracle_token_b)?;
    if router_program != Pubkey::default() {
        // perform swap
        msg!("Perform swap");
        if ctx.remaining_accounts.len() < pools.len() + 5 {
            return Err(ProgramError::NotEnoughAccountKeys.into());
        }
        let initial_token_a_balance = ctx.accounts.custody_token_a.amount;
        let initial_token_b_balance = ctx.accounts.custody_token_b.amount;

        let authority_seeds: &[&[&[u8]]] =
            &[&[b"transfer_authority", &[token_pair.transfer_authority_bump]]];

        let mut router_accounts = vec![];
        for account in &ctx.remaining_accounts[(pools.len() + 1)..] {
            let is_signer = account.key == &ctx.accounts.transfer_authority.key();
            router_accounts.push(if account.is_writable {
                AccountMeta::new(*account.key, is_signer)
            } else {
                AccountMeta::new_readonly(*account.key, is_signer)
            });
        }

        let instruction = Instruction {
            program_id: router_program,
            accounts: router_accounts,
            data: params.router_instruction_data.clone(),
        };

        program::invoke_signed(
            &instruction,
            &ctx.remaining_accounts[(pools.len() + 1)..],
            authority_seeds,
        )?;

        // verify swap amount
        ctx.accounts.custody_token_a.reload()?;
        ctx.accounts.custody_token_b.reload()?;
        let token_a_balance = ctx.accounts.custody_token_a.amount;
        let token_b_balance = ctx.accounts.custody_token_b.amount;
        if token_a_balance > initial_token_a_balance {
            token_a_change = math::checked_sub(token_a_balance, initial_token_a_balance)?;
            token_b_change = math::checked_sub(initial_token_b_balance, token_b_balance)?;
            swap_amount = token_b_change;
            receive_amount = token_a_change;
            supply_side = MatchingSide::Sell;
        } else {
            token_a_change = math::checked_sub(initial_token_a_balance, token_a_balance)?;
            token_b_change = math::checked_sub(token_b_balance, initial_token_b_balance)?;
            swap_amount = token_a_change;
            receive_amount = token_b_change;
            supply_side = MatchingSide::Buy;
        }
        require_gte!(
            token_a_change,
            std::cmp::max(token_pair.config_a.min_swap_amount, 1),
            TwammError::SettlementAmountTooSmall
        );
        require_gte!(
            token_b_change,
            std::cmp::max(token_pair.config_b.min_swap_amount, 1),
            TwammError::SettlementAmountTooSmall
        );

        // verify swap price against oracle
        msg!("Validate swap price");
        swap_price = OraclePrice::new_from_token(math::checked_token_div(
            token_b_change,
            token_pair.config_b.decimals,
            token_a_change,
            token_pair.config_a.decimals,
        )?);
        let swap_price_f64 = swap_price.checked_as_f64()?;
        let oracle_price_f64 = oracle_price.checked_as_f64()?;
        if (supply_side == MatchingSide::Sell && oracle_price_f64 < swap_price_f64)
            || (supply_side == MatchingSide::Buy && oracle_price_f64 > swap_price_f64)
        {
            require_gte!(
                token_pair.max_swap_price_diff,
                math::checked_float_div(
                    (oracle_price_f64 - swap_price_f64).abs(),
                    oracle_price_f64
                )?,
                TwammError::SettlementPriceOutOfBounds
            );
        }
    } else {
        // crank with internal settlement only, no external token swap
        token_a_change = 0;
        token_b_change = 0;
        swap_amount = 0;
        receive_amount = 0;
        supply_side = MatchingSide::Internal;
        swap_price = oracle_price;
    }

    // settle pools
    msg!("Settle pools");
    let current_time = token_pair.get_time()?;

    // settle pools function takes raw pool refs for easier testing
    let mut pool_refs: Vec<&mut Pool> = Vec::with_capacity(pools.len());
    for pool in pools.iter_mut() {
        pool_refs.push(pool);
    }

    let res = token_pair.settle_pools(
        &mut pool_refs,
        supply_side,
        token_a_change,
        token_b_change,
        swap_price,
        oracle_price,
        current_time,
    )?;

    msg!("Validate settled amounts");
    if swap_amount > 0 {
        require!(
            res.settlement_side != supply_side,
            TwammError::InvalidSettlementSide
        );
        require!(
            res.net_amount_settled > 0,
            TwammError::SettlementAmountTooLarge
        );
    }

    // check settled amount equals to swap amount
    require_eq!(
        swap_amount,
        res.net_amount_settled,
        TwammError::SettlementAmountTooLarge
    );
    require_eq!(
        receive_amount,
        res.source_amount_received,
        TwammError::SettlementError
    );
    require_gte!(
        res.net_amount_required,
        res.net_amount_settled,
        TwammError::SettlementError
    );

    // check required amount to settle is close to the swap amount
    // add some threshold to account for non-deterministic off-chain amount computation
    let swap_amount_threshold = if res.settlement_side == MatchingSide::Sell {
        std::cmp::max(token_pair.config_a.min_swap_amount, 1)
    } else {
        std::cmp::max(token_pair.config_b.min_swap_amount, 1)
    };
    let unsettled_amount = math::checked_sub(res.net_amount_required, res.net_amount_settled)?;
    let unsettled_percent = if unsettled_amount <= swap_amount_threshold {
        0.0
    } else {
        math::checked_float_div(unsettled_amount as f64, res.net_amount_required as f64)?
    };
    if swap_amount > 0 {
        require_gte!(
            token_pair.max_unsettled_amount,
            unsettled_percent,
            TwammError::SettlementAmountTooSmall
        );
    }

    // update pool states
    msg!("Update pool states");
    for pool in pools.iter_mut() {
        pool.update_state(token_pair.min_time_till_expiration, current_time)?;
        // if pool is complete, switch to the future pool
        if pool.is_complete(current_time)? {
            token_pair.finalize_pool(
                pool,
                &pool.to_account_info(),
                &ctx.accounts.transfer_authority,
            )?;
        }
    }
    token_pair.save_pools(&pools)?;

    // update token pair stats
    msg!("Update token pair stats");
    token_pair.update_trade_stats(
        &res,
        SettlementType::Crank,
        &ctx.accounts.oracle_token_a,
        &ctx.accounts.oracle_token_b,
    )?;

    // transfer rewards to the transaction payer
    msg!("Transfer rewards to the transaction payer");
    assert!((0.0..=1.0).contains(&unsettled_percent));
    let reward_share = 1.0 - unsettled_percent;
    let reward_a = std::cmp::min(
        token_pair.stats_a.fees_collected,
        math::checked_as_u64(math::checked_float_mul(
            reward_share,
            token_pair.config_a.crank_reward as f64,
        )?)?,
    );
    if reward_a > 0 {
        token_pair.stats_a.fees_collected =
            math::checked_sub(token_pair.stats_a.fees_collected, reward_a)?;

        token_pair.transfer_tokens(
            ctx.accounts.custody_token_a.to_account_info(),
            ctx.accounts.user_account_token_a.to_account_info(),
            ctx.accounts.transfer_authority.clone(),
            ctx.accounts.token_program.to_account_info(),
            reward_a,
        )?;
    }

    let reward_b = std::cmp::min(
        token_pair.stats_b.fees_collected,
        math::checked_as_u64(math::checked_float_mul(
            reward_share,
            token_pair.config_b.crank_reward as f64,
        )?)?,
    );
    if reward_b > 0 {
        token_pair.stats_b.fees_collected =
            math::checked_sub(token_pair.stats_b.fees_collected, reward_b)?;

        token_pair.transfer_tokens(
            ctx.accounts.custody_token_b.to_account_info(),
            ctx.accounts.user_account_token_b.to_account_info(),
            ctx.accounts.transfer_authority.clone(),
            ctx.accounts.token_program.to_account_info(),
            reward_b,
        )?;
    }

    // return net unsettled amount
    let net_amount_required = if res.net_amount_required >= i64::MAX as u64 {
        i64::MAX
    } else {
        res.net_amount_required as i64
    };
    match res.settlement_side {
        MatchingSide::Internal => Ok(0),
        MatchingSide::Buy => Ok(net_amount_required),
        MatchingSide::Sell => Ok(-net_amount_required),
    }
}
