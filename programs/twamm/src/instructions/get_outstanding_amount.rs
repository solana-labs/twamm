//! Get outstanding amount instruction handler

use {
    crate::state::{
        pool::Pool,
        token_pair::{MatchingSide, TokenPair},
    },
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct GetOutstandingAmount<'info> {
    #[account(
        seeds = [b"token_pair",
                 token_pair.config_a.mint.as_ref(),
                 token_pair.config_b.mint.as_ref()],
        bump = token_pair.token_pair_bump
    )]
    pub token_pair: Box<Account<'info, TokenPair>>,

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
    // remaining accounts:
    //   1 to TokenPair::MAX_POOLS addresses of current pool accounts (write, unsigned)
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct GetOutstandingAmountParams {}

pub fn get_outstanding_amount(
    ctx: Context<GetOutstandingAmount>,
    _params: &GetOutstandingAmountParams,
) -> Result<i64> {
    let token_pair = &ctx.accounts.token_pair;
    let (mut pools, _router_program) = token_pair.load_pools(ctx.remaining_accounts)?;
    if pools.is_empty() {
        return Ok(0);
    }

    let oracle_price = token_pair
        .get_token_pair_oracle_price(&ctx.accounts.oracle_token_a, &ctx.accounts.oracle_token_b)?;

    let mut pool_refs: Vec<&mut Pool> = Vec::with_capacity(pools.len());
    for pool in pools.iter_mut() {
        pool_refs.push(pool);
    }

    let res = token_pair.settle_pools(
        &mut pool_refs,
        MatchingSide::Internal,
        0,
        0,
        oracle_price,
        oracle_price,
        token_pair.get_time()?,
    )?;

    // return net unsettled amount
    let net_amount_required = if res.net_amount_required >= i64::MAX as u64 {
        i64::MAX
    } else {
        res.net_amount_required as i64
    };
    match res.settlement_side {
        MatchingSide::Internal => Ok(0),
        MatchingSide::Buy => {
            if res.net_amount_required < token_pair.config_b.min_swap_amount {
                Ok(0)
            } else {
                Ok(net_amount_required)
            }
        }
        MatchingSide::Sell => {
            if res.net_amount_required < token_pair.config_a.min_swap_amount {
                Ok(0)
            } else {
                Ok(-net_amount_required)
            }
        }
    }
}
