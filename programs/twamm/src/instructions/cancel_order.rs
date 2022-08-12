//! Cancel order instruction handler

use {
    crate::{
        error::TwammError,
        math,
        state::{
            order::{Order, OrderSide},
            pool::Pool,
            token_pair::TokenPair,
        },
    },
    anchor_lang::{prelude::*, AccountsClose},
    anchor_spl::token::{Token, TokenAccount},
};

#[derive(Accounts)]
pub struct CancelOrder<'info> {
    #[account()]
    pub payer: Signer<'info>,

    /// CHECK: user's wallet
    #[account()]
    pub owner: AccountInfo<'info>,

    #[account(
        mut,
        constraint = user_account_token_a.mint == custody_token_a.mint,
        has_one = owner
    )]
    pub user_account_token_a: Box<Account<'info, TokenAccount>>,

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

    #[account(
        mut,
        seeds = [b"order",
                 owner.key().as_ref(),
                 pool.key().as_ref()],
        bump = order.bump
    )]
    pub order: Box<Account<'info, Order>>,

    #[account(
        mut,
        seeds = [b"pool",
                 custody_token_a.key().as_ref(),
                 custody_token_b.key().as_ref(),
                 pool.time_in_force.to_le_bytes().as_slice(),
                 pool.counter.to_le_bytes().as_slice()],
        bump = pool.bump
    )]
    pub pool: Box<Account<'info, Pool>>,

    token_program: Program<'info, Token>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CancelOrderParams {
    lp_amount: u64,
}

pub fn cancel_order(ctx: Context<CancelOrder>, params: &CancelOrderParams) -> Result<()> {
    // validate inputs
    require_gt!(params.lp_amount, 0u64, TwammError::InvalidTokenAmount);

    let token_pair = ctx.accounts.token_pair.as_mut();
    require!(
        token_pair.allow_withdrawals,
        TwammError::WithdrawalsNotAllowed
    );

    // check if order is being canceled by the owner or pool is complete
    // and then cancel can be permissionless
    let current_time = token_pair.get_time()?;
    let pool_complete = ctx.accounts.pool.is_complete(current_time)?;
    if ctx.accounts.owner.key() != ctx.accounts.payer.key() && !pool_complete {
        return Err(ProgramError::IllegalOwner.into());
    }

    let order = ctx.accounts.order.as_mut();
    let lp_amount = if params.lp_amount > order.lp_balance || pool_complete {
        order.lp_balance
    } else {
        params.lp_amount
    };

    let pool = ctx.accounts.pool.as_mut();
    let expiration_time = pool.expiration_time;
    let pool_side = if order.side == OrderSide::Buy {
        &mut pool.buy_side
    } else {
        &mut pool.sell_side
    };
    // Note: order.pool address is enforced with seeds

    assert!(
        lp_amount <= pool_side.lp_supply,
        "Unexpected LP balance error"
    );

    // compute balance changes
    msg!("Compute balance changes");
    let withdraw_amount_source = math::checked_as_u64(math::checked_div(
        math::checked_mul(lp_amount as u128, pool_side.source_balance as u128)?,
        pool_side.lp_supply as u128,
    )?)?;

    let mut token_debt_removed = math::checked_as_u64(math::checked_ceil_div(
        math::checked_mul(order.token_debt as u128, lp_amount as u128)?,
        order.lp_balance as u128,
    )?)?;

    let mut withdraw_amount_target = math::checked_as_u64(math::checked_div(
        math::checked_mul(
            lp_amount as u128,
            math::checked_add(
                pool_side.target_balance as u128,
                pool_side.token_debt_total as u128,
            )?,
        )?,
        pool_side.lp_supply as u128,
    )?)?;

    if withdraw_amount_target > token_debt_removed {
        withdraw_amount_target = math::checked_sub(withdraw_amount_target, token_debt_removed)?;
    } else {
        withdraw_amount_target = 0;
    }

    let withdraw_amount_fees = math::checked_as_u64(math::checked_ceil_div(
        math::checked_mul(
            withdraw_amount_target as u128,
            token_pair.fee_numerator as u128,
        )?,
        token_pair.fee_denominator as u128,
    )?)?;

    // update order and pool data
    msg!("Update order data");
    let order_lp_balance = order.lp_balance;
    if order_lp_balance == lp_amount {
        pool_side.num_traders = math::checked_sub(pool_side.num_traders, 1)?;
        order.lp_balance = 0;
    } else {
        order.lp_balance = math::checked_sub(order_lp_balance, lp_amount)?;
        if order.token_debt < token_debt_removed {
            token_debt_removed = order.token_debt;
        }
        order.token_debt = math::checked_sub(order.token_debt, token_debt_removed)?;
    }

    order.settlement_debt = order.get_unsettled_amount(expiration_time, current_time)?;
    order.unsettled_balance = math::checked_sub(order.unsettled_balance, withdraw_amount_source)?;
    order.last_balance_change_time = current_time;
    let order_debt_removed = if order_lp_balance == lp_amount {
        order.settlement_debt
    } else {
        math::checked_as_u64(math::checked_div(
            math::checked_mul(order.settlement_debt as u128, lp_amount as u128)?,
            order_lp_balance as u128,
        )?)?
    };
    order.settlement_debt = math::checked_sub(order.settlement_debt, order_debt_removed)?;

    msg!("Update pool data");
    pool_side.source_balance = math::checked_sub(pool_side.source_balance, withdraw_amount_source)?;
    pool_side.target_balance = math::checked_sub(pool_side.target_balance, withdraw_amount_target)?;
    pool_side.lp_supply = math::checked_sub(pool_side.lp_supply, lp_amount)?;
    pool_side.token_debt_total = math::checked_sub(pool_side.token_debt_total, token_debt_removed)?;
    pool_side.settlement_debt_total = pool_side
        .get_unsettled_amount(expiration_time, current_time)?
        .saturating_sub(order_debt_removed);
    pool_side.last_balance_change_time = current_time;

    // transfer tokens to the user
    msg!("Transfer tokens to the user");
    let (withdraw_amount_a, withdraw_amount_b) = if order.side == OrderSide::Sell {
        (
            withdraw_amount_source,
            math::checked_sub(withdraw_amount_target, withdraw_amount_fees)?,
        )
    } else {
        (
            math::checked_sub(withdraw_amount_target, withdraw_amount_fees)?,
            withdraw_amount_source,
        )
    };

    token_pair.transfer_tokens(
        ctx.accounts.custody_token_a.to_account_info(),
        ctx.accounts.user_account_token_a.to_account_info(),
        ctx.accounts.transfer_authority.clone(),
        ctx.accounts.token_program.to_account_info(),
        withdraw_amount_a,
    )?;

    token_pair.transfer_tokens(
        ctx.accounts.custody_token_b.to_account_info(),
        ctx.accounts.user_account_token_b.to_account_info(),
        ctx.accounts.transfer_authority.clone(),
        ctx.accounts.token_program.to_account_info(),
        withdraw_amount_b,
    )?;

    // update token pair stats
    msg!("Update token pair stats");
    if order.side == OrderSide::Sell {
        token_pair.stats_b.fees_collected = token_pair
            .stats_b
            .fees_collected
            .saturating_add(withdraw_amount_fees);
    } else {
        token_pair.stats_a.fees_collected = token_pair
            .stats_a
            .fees_collected
            .wrapping_add(withdraw_amount_fees);
    };

    // close order account if no longer needed
    if order_lp_balance == lp_amount {
        msg!("Close order account");
        // rent exempt payment is not refundable to prevent spoofing
        order.set_inner(Order::default());
        ctx.accounts
            .order
            .close(ctx.accounts.transfer_authority.to_account_info())?;
    }

    // update pool state and close pool account if pool is empty and not current
    msg!("Update pool state");
    pool.update_state(token_pair.min_time_till_expiration, current_time)?;
    if let Ok(tif_index) = token_pair.get_tif_index(pool.time_in_force) {
        if token_pair.pool_counters[tif_index] != pool.counter {
            token_pair.stats_a.pending_withdrawals = token_pair
                .stats_a
                .pending_withdrawals
                .saturating_sub(withdraw_amount_a);
            token_pair.stats_b.pending_withdrawals = token_pair
                .stats_b
                .pending_withdrawals
                .saturating_sub(withdraw_amount_b);

            if pool.is_empty() {
                msg!("Close pool account");
                if pool.counter == math::checked_add(token_pair.pool_counters[tif_index], 1)? {
                    token_pair.future_pool_present[tif_index] = false;
                }
                pool.set_inner(Pool::default());
                ctx.accounts
                    .pool
                    .close(ctx.accounts.transfer_authority.to_account_info())?;
            }
        }
    }

    Ok(())
}
