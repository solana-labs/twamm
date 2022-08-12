//! Set limits instruction handler

use {
    crate::{
        error::TwammError,
        state::{
            multisig::{AdminInstruction, Multisig},
            token_pair::TokenPair,
        },
    },
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct SetLimits<'info> {
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
pub struct SetLimitsParams {
    pub min_swap_amount_token_a: u64,
    pub min_swap_amount_token_b: u64,
    pub max_swap_price_diff: f64,
    pub max_unsettled_amount: f64,
    pub min_time_till_expiration: f64,
}

pub fn set_limits<'info>(
    ctx: Context<'_, '_, '_, 'info, SetLimits<'info>>,
    params: &SetLimitsParams,
) -> Result<u8> {
    // validate signatures
    let mut multisig = ctx.accounts.multisig.load_mut()?;

    let signatures_left = multisig.sign_multisig(
        &ctx.accounts.admin,
        &Multisig::get_account_infos(&ctx)[1..],
        &Multisig::get_instruction_data(AdminInstruction::SetLimits, params)?,
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
    token_pair.config_a.min_swap_amount = params.min_swap_amount_token_a;
    token_pair.config_b.min_swap_amount = params.min_swap_amount_token_b;
    token_pair.max_swap_price_diff = params.max_swap_price_diff;
    token_pair.max_unsettled_amount = params.max_unsettled_amount;
    token_pair.min_time_till_expiration = params.min_time_till_expiration;

    if !token_pair.validate() {
        err!(TwammError::InvalidTokenPairConfig)
    } else {
        Ok(0)
    }
}
