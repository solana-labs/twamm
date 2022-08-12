//! Settle instruction handler

use {
    crate::{
        error::TwammError,
        math,
        state::{
            pool::Pool,
            token_pair::{MatchingSide, SettlementType, TokenPair},
        },
    },
    anchor_lang::prelude::*,
    anchor_spl::token::{Token, TokenAccount, Transfer},
};

#[derive(Accounts)]
pub struct Settle<'info> {
    // transaction fee payer
    #[account()]
    pub owner: Signer<'info>,

    // source of funds for the settlement
    #[account(
        mut,
        constraint = user_account_token_a.mint == custody_token_a.mint,
        has_one = owner
    )]
    pub user_account_token_a: Box<Account<'info, TokenAccount>>,

    // source of funds for the settlement
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
        bump = token_pair.token_pair_bump
    )]
    pub token_pair: Box<Account<'info, TokenPair>>,

    /// CHECK: empty PDA, authority for token accounts
    #[account(
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
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct SettleParams {
    pub supply_side: MatchingSide,
    pub min_token_amount_in: u64,
    pub max_token_amount_in: u64,
    pub worst_exchange_rate: u64,
}

pub fn settle(ctx: Context<Settle>, params: &SettleParams) -> Result<i64> {
    // validate inputs
    require_gt!(
        params.max_token_amount_in,
        0u64,
        TwammError::InvalidTokenAmount
    );

    let token_pair = ctx.accounts.token_pair.as_mut();
    require!(
        token_pair.allow_settlements,
        TwammError::SettlementsNotAllowed
    );
    require_neq!(
        params.supply_side,
        MatchingSide::Internal,
        TwammError::InvalidSettlementSide
    );

    // collect and validate pools
    msg!("Load pools");
    let mut pools = token_pair.load_pools(ctx.remaining_accounts)?.0;
    require!(!pools.is_empty(), TwammError::NothingToSettle);

    // compute token balance changes
    msg!("Compute token balance changes");
    let oracle_price = token_pair
        .get_token_pair_oracle_price(&ctx.accounts.oracle_token_a, &ctx.accounts.oracle_token_b)?;
    let token_a_change;
    let token_b_change;
    let settlement_side;
    if params.supply_side == MatchingSide::Buy {
        token_a_change = token_pair.get_token_a_amount(params.max_token_amount_in, oracle_price)?;
        require_gte!(
            token_a_change,
            params.worst_exchange_rate,
            TwammError::MaxSlippage
        );
        token_b_change = params.max_token_amount_in;
        settlement_side = MatchingSide::Sell;
    } else {
        token_a_change = params.max_token_amount_in;
        token_b_change = token_pair.get_token_b_amount(params.max_token_amount_in, oracle_price)?;
        require_gte!(
            token_b_change,
            params.worst_exchange_rate,
            TwammError::MaxSlippage
        );
        settlement_side = MatchingSide::Buy;
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
        params.supply_side,
        token_a_change,
        token_b_change,
        oracle_price,
        oracle_price,
        current_time,
    )?;

    msg!("Validate settled amounts");
    require!(
        res.settlement_side == settlement_side,
        TwammError::InvalidSettlementSide
    );
    require!(
        res.net_amount_settled > 0,
        TwammError::SettlementAmountTooLarge
    );

    // check that spent amount against the limits
    require_gte!(
        params.max_token_amount_in,
        res.source_amount_received,
        TwammError::SettlementError
    );
    require_gte!(
        res.net_amount_required,
        res.net_amount_settled,
        TwammError::SettlementError
    );
    require_gte!(
        res.source_amount_received,
        params.min_token_amount_in,
        TwammError::SettlementAmountTooSmall
    );

    // check received amount against worst_exchange_rate
    let min_expected_amount = math::checked_as_u64(math::checked_div(
        math::checked_mul(
            res.source_amount_received as u128,
            params.worst_exchange_rate as u128,
        )?,
        params.max_token_amount_in as u128,
    )?)?;
    require_gte!(
        res.net_amount_settled,
        min_expected_amount,
        TwammError::MaxSlippage
    );

    // transfer tokens to/from the user
    msg!("Transfer tokens to/from the user");
    let settle_fee = math::checked_as_u64(math::checked_div(
        math::checked_mul(
            res.net_amount_settled as u128,
            token_pair.settle_fee_numerator as u128,
        )?,
        token_pair.settle_fee_denominator as u128,
    )?)?;
    let net_amount_settled_after_fees = math::checked_sub(res.net_amount_settled, settle_fee)?;
    if params.supply_side == MatchingSide::Buy {
        let context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_account_token_b.to_account_info(),
                to: ctx.accounts.custody_token_b.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        );
        anchor_spl::token::transfer(context, res.source_amount_received)?;
        token_pair.transfer_tokens(
            ctx.accounts.custody_token_a.to_account_info(),
            ctx.accounts.user_account_token_a.to_account_info(),
            ctx.accounts.transfer_authority.clone(),
            ctx.accounts.token_program.to_account_info(),
            net_amount_settled_after_fees,
        )?;
        token_pair.stats_a.fees_collected =
            token_pair.stats_a.fees_collected.wrapping_add(settle_fee);
    } else {
        let context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_account_token_a.to_account_info(),
                to: ctx.accounts.custody_token_a.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        );
        anchor_spl::token::transfer(context, res.source_amount_received)?;
        token_pair.transfer_tokens(
            ctx.accounts.custody_token_b.to_account_info(),
            ctx.accounts.user_account_token_b.to_account_info(),
            ctx.accounts.transfer_authority.clone(),
            ctx.accounts.token_program.to_account_info(),
            net_amount_settled_after_fees,
        )?;
        token_pair.stats_b.fees_collected =
            token_pair.stats_b.fees_collected.saturating_add(settle_fee);
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
        SettlementType::Settlement,
        &ctx.accounts.oracle_token_a,
        &ctx.accounts.oracle_token_b,
    )?;

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
