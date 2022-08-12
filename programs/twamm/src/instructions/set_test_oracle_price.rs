//! Set test oracle price instruction handler

use {
    crate::{
        oracle::TestOracle,
        state::{
            multisig::{AdminInstruction, Multisig},
            token_pair::TokenPair,
        },
    },
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct SetTestOraclePrice<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"multisig"],
        bump = multisig.load()?.bump
    )]
    pub multisig: AccountLoader<'info, Multisig>,

    #[account(
        mut,
        seeds = [b"token_pair",
                 token_pair.config_a.mint.as_ref(),
                 token_pair.config_b.mint.as_ref()],
        bump = token_pair.token_pair_bump
    )]
    pub token_pair: Box<Account<'info, TokenPair>>,

    #[account(
        init_if_needed,
        payer = admin,
        space = TestOracle::LEN,
        constraint = oracle_token_a.key() == token_pair.config_a.oracle_account,
        seeds = [b"token_a_oracle",
                 token_pair.config_a.mint.as_ref(),
                 token_pair.config_b.mint.as_ref()],
        bump
    )]
    pub oracle_token_a: Box<Account<'info, TestOracle>>,

    #[account(
        init_if_needed,
        payer = admin,
        space = TestOracle::LEN,
        constraint = oracle_token_b.key() == token_pair.config_b.oracle_account,
        seeds = [b"token_b_oracle",
                 token_pair.config_a.mint.as_ref(),
                 token_pair.config_b.mint.as_ref()],
        bump
    )]
    pub oracle_token_b: Box<Account<'info, TestOracle>>,

    system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct SetTestOraclePriceParams {
    pub price_token_a: u64,
    pub price_token_b: u64,
    pub expo_token_a: i32,
    pub expo_token_b: i32,
    pub conf_token_a: u64,
    pub conf_token_b: u64,
    pub publish_time_token_a: i64,
    pub publish_time_token_b: i64,
}

pub fn set_test_oracle_price<'info>(
    ctx: Context<'_, '_, '_, 'info, SetTestOraclePrice<'info>>,
    params: &SetTestOraclePriceParams,
) -> Result<u8> {
    // validate signatures
    let mut multisig = ctx.accounts.multisig.load_mut()?;

    let signatures_left = multisig.sign_multisig(
        &ctx.accounts.admin,
        &Multisig::get_account_infos(&ctx)[1..],
        &Multisig::get_instruction_data(AdminInstruction::SetTestOraclePrice, params)?,
    )?;
    if signatures_left > 0 {
        msg!(
            "Instruction has been signed but more signatures are required: {}",
            signatures_left
        );
        return Ok(signatures_left);
    }

    // update oracle data
    let oracle_token_a = ctx.accounts.oracle_token_a.as_mut();
    oracle_token_a.price = params.price_token_a;
    oracle_token_a.expo = params.expo_token_a;
    oracle_token_a.conf = params.conf_token_a;
    oracle_token_a.publish_time = params.publish_time_token_a;

    let oracle_token_b = ctx.accounts.oracle_token_b.as_mut();
    oracle_token_b.price = params.price_token_b;
    oracle_token_b.expo = params.expo_token_b;
    oracle_token_b.conf = params.conf_token_b;
    oracle_token_b.publish_time = params.publish_time_token_b;

    Ok(0)
}
