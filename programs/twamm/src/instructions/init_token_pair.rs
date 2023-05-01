//! Init token pair instruction handler

use {
    crate::{
        error::TwammError,
        oracle::OracleType,
        state::{
            multisig::{AdminInstruction, Multisig},
            token_pair::TokenPair,
        },
    },
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{Mint, Token, TokenAccount},
    },
};

#[derive(Accounts)]
pub struct InitTokenPair<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"multisig"],
        bump = multisig.load()?.bump
    )]
    pub multisig: AccountLoader<'info, Multisig>,

    // instruction can be called multiple times due to multisig use, hence init_if_needed
    // instead of init. On the first call account is zero initialized and filled out when
    // all signatures are collected. When account is in zeroed state it can't be used in other
    // instructions because seeds are computed with recorded mints. Uniqueness is enforced
    // manually in the instruction handler.
    #[account(
        init_if_needed,
        payer = admin,
        space = TokenPair::LEN,
        constraint = mint_token_a.key() != mint_token_b.key(),
        seeds = [b"token_pair",
                 mint_token_a.key().as_ref(),
                 mint_token_b.key().as_ref()],
        bump
    )]
    pub token_pair: Box<Account<'info, TokenPair>>,

    /// CHECK: empty PDA, will be set as authority for token accounts
    #[account(
        seeds = [b"transfer_authority"],
        bump
    )]
    pub transfer_authority: AccountInfo<'info>,

    pub mint_token_a: Box<Account<'info, Mint>>,
    pub mint_token_b: Box<Account<'info, Mint>>,

    // token custodies can be shared between multiply pairs
    #[account(
        init_if_needed,
        payer = admin,
        constraint = mint_token_a.key() == custody_token_a.mint,
        associated_token::mint = mint_token_a,
        associated_token::authority = transfer_authority
    )]
    pub custody_token_a: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = admin,
        constraint = mint_token_b.key() == custody_token_b.mint,
        associated_token::mint = mint_token_b,
        associated_token::authority = transfer_authority
    )]
    pub custody_token_b: Box<Account<'info, TokenAccount>>,

    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
    token_program: Program<'info, Token>,
    associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitTokenPairParams {
    pub allow_deposits: bool,
    pub allow_withdrawals: bool,
    pub allow_cranks: bool,
    pub allow_settlements: bool,
    pub fee_numerator: u64,
    pub fee_denominator: u64,
    pub settle_fee_numerator: u64,
    pub settle_fee_denominator: u64,
    pub crank_reward_token_a: u64,
    pub crank_reward_token_b: u64,
    pub min_swap_amount_token_a: u64,
    pub min_swap_amount_token_b: u64,
    pub max_swap_price_diff: f64,
    pub max_unsettled_amount: f64,
    pub min_time_till_expiration: f64,
    pub max_oracle_price_error_token_a: f64,
    pub max_oracle_price_error_token_b: f64,
    pub max_oracle_price_age_sec_token_a: u32,
    pub max_oracle_price_age_sec_token_b: u32,
    pub oracle_type_token_a: OracleType,
    pub oracle_type_token_b: OracleType,
    pub oracle_account_token_a: Pubkey,
    pub oracle_account_token_b: Pubkey,
    pub crank_authority: Pubkey,
    pub time_in_force_intervals: [u32; 10], // TokenPair::MAX_POOLS
}

pub fn init_token_pair<'info>(
    ctx: Context<'_, '_, '_, 'info, InitTokenPair<'info>>,
    params: &InitTokenPairParams,
) -> Result<u8> {
    // validate signatures
    let mut multisig = ctx.accounts.multisig.load_mut()?;

    let signatures_left = multisig.sign_multisig(
        &ctx.accounts.admin,
        &Multisig::get_account_infos(&ctx)[1..],
        &Multisig::get_instruction_data(AdminInstruction::InitTokenPair, params)?,
    )?;
    if signatures_left > 0 {
        msg!(
            "Instruction has been signed but more signatures are required: {}",
            signatures_left
        );
        return Ok(signatures_left);
    }

    // record token pair data
    let token_pair = ctx.accounts.token_pair.as_mut();
    if token_pair.config_a.mint != Pubkey::default() {
        // return error if token pair is already initialized
        return Err(ProgramError::AccountAlreadyInitialized.into());
    }

    token_pair.allow_deposits = params.allow_deposits;
    token_pair.allow_withdrawals = params.allow_withdrawals;
    token_pair.allow_cranks = params.allow_cranks;
    token_pair.allow_settlements = params.allow_settlements;

    token_pair.fee_numerator = params.fee_numerator;
    token_pair.fee_denominator = params.fee_denominator;
    token_pair.settle_fee_numerator = params.settle_fee_numerator;
    token_pair.settle_fee_denominator = params.settle_fee_denominator;
    token_pair.config_a.crank_reward = params.crank_reward_token_a;
    token_pair.config_b.crank_reward = params.crank_reward_token_b;

    token_pair.config_a.min_swap_amount = params.min_swap_amount_token_a;
    token_pair.config_b.min_swap_amount = params.min_swap_amount_token_b;
    token_pair.max_swap_price_diff = params.max_swap_price_diff;
    token_pair.max_unsettled_amount = params.max_unsettled_amount;
    token_pair.min_time_till_expiration = params.min_time_till_expiration;

    token_pair.config_a.max_oracle_price_error = params.max_oracle_price_error_token_a;
    token_pair.config_a.max_oracle_price_age_sec = params.max_oracle_price_age_sec_token_a;
    token_pair.config_a.oracle_type = params.oracle_type_token_a;
    token_pair.config_a.oracle_account = params.oracle_account_token_a;

    token_pair.config_b.max_oracle_price_error = params.max_oracle_price_error_token_b;
    token_pair.config_b.max_oracle_price_age_sec = params.max_oracle_price_age_sec_token_b;
    token_pair.config_b.oracle_type = params.oracle_type_token_b;
    token_pair.config_b.oracle_account = params.oracle_account_token_b;

    token_pair.crank_authority = params.crank_authority;
    token_pair.config_a.mint = ctx.accounts.mint_token_a.key();
    token_pair.config_b.mint = ctx.accounts.mint_token_b.key();
    token_pair.config_a.custody = ctx.accounts.custody_token_a.key();
    token_pair.config_b.custody = ctx.accounts.custody_token_b.key();
    token_pair.config_a.decimals = ctx.accounts.mint_token_a.decimals;
    token_pair.config_b.decimals = ctx.accounts.mint_token_b.decimals;

    token_pair.stats_a.pending_withdrawals = 0;
    token_pair.stats_a.fees_collected = 0;
    token_pair.stats_a.order_volume_usd = 0;
    token_pair.stats_a.routed_volume_usd = 0;
    token_pair.stats_a.settled_volume_usd = 0;

    token_pair.stats_b.pending_withdrawals = 0;
    token_pair.stats_b.fees_collected = 0;
    token_pair.stats_b.order_volume_usd = 0;
    token_pair.stats_b.routed_volume_usd = 0;
    token_pair.stats_b.settled_volume_usd = 0;

    token_pair
        .tifs
        .copy_from_slice(params.time_in_force_intervals.as_slice());
    token_pair.pool_counters.fill(0);
    token_pair.current_pool_present.fill(false);
    token_pair.future_pool_present.fill(false);

    token_pair.token_pair_bump = *ctx
        .bumps
        .get("token_pair")
        .ok_or(ProgramError::InvalidSeeds)?;
    token_pair.transfer_authority_bump = *ctx
        .bumps
        .get("transfer_authority")
        .ok_or(ProgramError::InvalidSeeds)?;

    token_pair.inception_time = if cfg!(feature = "test") {
        0
    } else {
        token_pair.get_time()?
    };

    if !token_pair.validate() {
        err!(TwammError::InvalidTokenPairConfig)
    } else {
        Ok(0)
    }
}
