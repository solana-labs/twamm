//! Set oracle config instruction handler

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
};

#[derive(Accounts)]
pub struct SetOracleConfig<'info> {
    #[account()]
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
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct SetOracleConfigParams {
    pub max_oracle_price_error_token_a: f64,
    pub max_oracle_price_error_token_b: f64,
    pub max_oracle_price_age_sec_token_a: u32,
    pub max_oracle_price_age_sec_token_b: u32,
    pub oracle_type_token_a: OracleType,
    pub oracle_type_token_b: OracleType,
    pub oracle_account_token_a: Pubkey,
    pub oracle_account_token_b: Pubkey,
}

pub fn set_oracle_config<'info>(
    ctx: Context<'_, '_, '_, 'info, SetOracleConfig<'info>>,
    params: &SetOracleConfigParams,
) -> Result<u8> {
    // validate signatures
    let mut multisig = ctx.accounts.multisig.load_mut()?;

    let signatures_left = multisig.sign_multisig(
        &ctx.accounts.admin,
        &Multisig::get_account_infos(&ctx)[1..],
        &Multisig::get_instruction_data(AdminInstruction::SetOracleConfig, params)?,
    )?;
    if signatures_left > 0 {
        msg!(
            "Instruction has been signed but more signatures are required: {}",
            signatures_left
        );
        return Ok(signatures_left);
    }

    // update permissions
    let token_pair = ctx.accounts.token_pair.as_mut();
    token_pair.config_a.max_oracle_price_error = params.max_oracle_price_error_token_a;
    token_pair.config_a.max_oracle_price_age_sec = params.max_oracle_price_age_sec_token_a;
    token_pair.config_a.oracle_type = params.oracle_type_token_a;
    token_pair.config_a.oracle_account = params.oracle_account_token_a;

    token_pair.config_b.max_oracle_price_error = params.max_oracle_price_error_token_b;
    token_pair.config_b.max_oracle_price_age_sec = params.max_oracle_price_age_sec_token_b;
    token_pair.config_b.oracle_type = params.oracle_type_token_b;
    token_pair.config_b.oracle_account = params.oracle_account_token_b;

    if !token_pair.validate() {
        err!(TwammError::InvalidTokenPairConfig)
    } else {
        Ok(0)
    }
}
