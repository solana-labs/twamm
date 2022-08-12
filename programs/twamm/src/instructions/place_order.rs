//! Place order instruction handler

use {
    crate::{
        error::TwammError,
        math, state,
        state::{
            order::{Order, OrderSide},
            pool::{Pool, PoolStatus},
            token_pair::TokenPair,
        },
    },
    anchor_lang::{prelude::*, Discriminator},
    anchor_spl::token::{Token, TokenAccount, Transfer},
};

#[derive(Accounts)]
#[instruction(params: PlaceOrderParams)]
pub struct PlaceOrder<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

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

    #[account(
        mut,
        constraint = custody_token_a.key() == token_pair.config_a.custody
    )]
    pub custody_token_a: Box<Account<'info, TokenAccount>>,

    #[account(mut,
        constraint = custody_token_b.key() == token_pair.config_b.custody
    )]
    pub custody_token_b: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = owner,
        space = Order::LEN,
        seeds = [b"order",
                 owner.key().as_ref(),
                 target_pool.key().as_ref()],
        bump
    )]
    pub order: Box<Account<'info, Order>>,

    // Currently active pool
    #[account(
        init_if_needed,
        payer = owner,
        space = Pool::LEN,
        seeds = [b"pool",
                 token_pair.config_a.custody.as_ref(),
                 token_pair.config_b.custody.as_ref(),
                 token_pair.tifs[token_pair.get_tif_index(params.time_in_force)?].to_le_bytes().as_slice(),
                 token_pair.pool_counters[token_pair.get_tif_index(params.time_in_force)?].to_le_bytes().as_slice()],
        bump
    )]
    pub current_pool: Box<Account<'info, Pool>>,

    /// CHECK: Pool to deposit tokens to, seeds should match either current_pool or with counter + 1
    #[account(mut)]
    pub target_pool: AccountInfo<'info>,

    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct PlaceOrderParams {
    side: OrderSide,
    time_in_force: u32,
    amount: u64,
}

pub fn place_order(ctx: Context<PlaceOrder>, params: &PlaceOrderParams) -> Result<()> {
    // validate inputs
    require_gt!(params.amount, 0u64, TwammError::InvalidTokenAmount);

    let token_pair = ctx.accounts.token_pair.as_mut();
    require!(token_pair.allow_deposits, TwammError::DepositsNotAllowed);

    let tif_index = token_pair.get_tif_index(params.time_in_force)?;

    // create a new user order PDA or check that it matches given side and pool if order already exists
    let target_pool = &ctx.accounts.target_pool;
    let order = ctx.accounts.order.as_mut();
    let current_time = token_pair.get_time()?;
    if order.lp_balance == 0 {
        msg!("Initialize order");
        order.owner = ctx.accounts.owner.key();
        order.time = current_time;
        order.side = params.side;
        order.pool = target_pool.key();
        order.lp_balance = 0;
        order.token_debt = 0;
        order.unsettled_balance = 0;
        order.settlement_debt = 0;
        order.last_balance_change_time = current_time;
        order.bump = *ctx.bumps.get("order").ok_or(ProgramError::InvalidSeeds)?;
    } else {
        require_eq!(order.side, params.side, TwammError::OrderSideMismatch);
        require_keys_eq!(
            order.pool,
            target_pool.key(),
            TwammError::InvalidPoolAddress
        );
    };

    // validate pool addresses and initialize a new pool if needed
    if !token_pair.current_pool_present[tif_index] {
        msg!("Initialize current pool");
        let current_pool = ctx.accounts.current_pool.as_mut();
        current_pool.status = PoolStatus::Active;
        current_pool.time_in_force = params.time_in_force;
        current_pool.expiration_time =
            math::checked_add(current_time, params.time_in_force as i64)?;
        current_pool.token_pair = token_pair.key();
        current_pool.counter = token_pair.pool_counters[tif_index];
        current_pool.bump = *ctx
            .bumps
            .get("current_pool")
            .ok_or(ProgramError::InvalidSeeds)?;
        token_pair.current_pool_present[tif_index] = true;
    }
    assert!(ctx.accounts.current_pool.expiration_time != 0);

    let mut pool_acc;
    let pool;
    let current_pool_key = ctx.accounts.current_pool.key();
    if target_pool.key() == current_pool_key {
        pool = ctx.accounts.current_pool.as_mut();
    } else {
        msg!("Validate future pool");
        assert!(token_pair.current_pool_present[tif_index]);
        let future_counter = math::checked_add(token_pair.pool_counters[tif_index], 1)?;
        let (future_pool_address, future_pool_bump) = Pubkey::find_program_address(
            &[
                b"pool",
                ctx.accounts.custody_token_a.key().as_ref(),
                ctx.accounts.custody_token_b.key().as_ref(),
                token_pair.tifs[tif_index].to_le_bytes().as_slice(),
                future_counter.to_le_bytes().as_slice(),
            ],
            &crate::ID,
        );
        require_keys_eq!(
            target_pool.key(),
            future_pool_address,
            TwammError::InvalidPoolAddress
        );

        // initialize target_pool account or validate existing
        if !state::is_empty_account(&target_pool.to_account_info())? {
            // validate existing pool
            if target_pool.owner != &crate::ID {
                return Err(ProgramError::IllegalOwner.into());
            }
            if target_pool.try_data_len()? != Pool::LEN {
                return Err(ProgramError::InvalidAccountData.into());
            }
        } else {
            msg!("Initialize future pool");
            state::initialize_account(
                ctx.accounts.owner.to_account_info(),
                target_pool.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                &crate::ID,
                &[&[
                    b"pool",
                    ctx.accounts.custody_token_a.key().as_ref(),
                    ctx.accounts.custody_token_b.key().as_ref(),
                    token_pair.tifs[tif_index].to_le_bytes().as_slice(),
                    future_counter.to_le_bytes().as_slice(),
                    &[future_pool_bump],
                ]],
                Pool::LEN,
            )?;
            let target_pool_account_info = target_pool.to_account_info();
            let mut pool_data = target_pool_account_info.try_borrow_mut_data()?;
            pool_data[..8].copy_from_slice(Pool::discriminator().as_slice());
        }

        pool_acc = Account::<Pool>::try_from(target_pool)?;
        pool = &mut pool_acc;
        if pool.expiration_time == 0 {
            msg!("Configure future pool");
            pool.status = PoolStatus::Active;
            pool.time_in_force = params.time_in_force;
            pool.expiration_time = math::checked_add(
                ctx.accounts.current_pool.expiration_time,
                params.time_in_force as i64,
            )?;
            pool.token_pair = token_pair.key();
            pool.counter = future_counter;
            pool.bump = future_pool_bump;
        }
        token_pair.future_pool_present[tif_index] = true;
    };

    // update and check the state
    msg!("Update pool state");
    match pool.update_state(token_pair.min_time_till_expiration, current_time)? {
        PoolStatus::Locked => return err!(TwammError::LockedPool),
        PoolStatus::Expired => return err!(TwammError::ExpiredPool),
        _ => {}
    }

    // compute lp and debt amounts
    msg!("Compute amounts");
    let expiration_time = pool.expiration_time;
    let pool_side = if params.side == OrderSide::Buy {
        &mut pool.buy_side
    } else {
        &mut pool.sell_side
    };
    let lp_amount;
    let debt_amount;
    if pool_side.source_balance == 0 {
        if pool_side.target_balance != 0 && pool_side.num_traders != 0 {
            msg!("Error: Attempt to deposit into finalized pool");
            return err!(TwammError::InvalidPoolState);
        }
        lp_amount = params.amount;
        debt_amount = 0;
    } else {
        lp_amount = math::checked_as_u64(math::checked_div(
            math::checked_mul(params.amount as u128, pool_side.lp_supply as u128)?,
            pool_side.source_balance as u128,
        )?)?;
        debt_amount = math::checked_as_u64(math::checked_ceil_div(
            math::checked_mul(
                params.amount as u128,
                math::checked_add(
                    pool_side.target_balance as u128,
                    pool_side.token_debt_total as u128,
                )?,
            )?,
            pool_side.source_balance as u128,
        )?)?;
    }

    // update pool balances
    msg!("Update pool balances");
    let current_time = token_pair.get_time()?;
    pool_side.settlement_debt_total =
        pool_side.get_unsettled_amount(expiration_time, current_time)?;
    pool_side.last_balance_change_time = current_time;
    pool_side.source_balance = math::checked_add(pool_side.source_balance, params.amount)?;
    pool_side.lp_supply = math::checked_add(pool_side.lp_supply, lp_amount)?;
    pool_side.token_debt_total = math::checked_add(pool_side.token_debt_total, debt_amount)?;
    if order.lp_balance == 0 {
        pool_side.num_traders = math::checked_add(pool_side.num_traders, 1)?;
    }
    if target_pool.key() != current_pool_key {
        pool.exit(&crate::ID)?;
    }

    // update user order
    msg!("Update user order");
    order.lp_balance = math::checked_add(order.lp_balance, lp_amount)?;
    order.token_debt = math::checked_add(order.token_debt, debt_amount)?;
    order.settlement_debt = order.get_unsettled_amount(expiration_time, current_time)?;
    order.unsettled_balance = math::checked_add(order.unsettled_balance, params.amount)?;
    order.last_balance_change_time = current_time;

    // transfer tokens to the custodies
    msg!("Transfer tokens to custodies");
    let context = if params.side == OrderSide::Sell {
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_account_token_a.to_account_info(),
                to: ctx.accounts.custody_token_a.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        )
    } else {
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_account_token_b.to_account_info(),
                to: ctx.accounts.custody_token_b.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        )
    };
    anchor_spl::token::transfer(context, params.amount)?;

    Ok(())
}
