//! Set fees instruction handler

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
pub struct SetFees<'info> {
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
pub struct SetFeesParams {
    pub fee_numerator: u64,
    pub fee_denominator: u64,
    pub settle_fee_numerator: u64,
    pub settle_fee_denominator: u64,
    pub crank_reward_token_a: u64,
    pub crank_reward_token_b: u64,
}

pub fn set_fees<'info>(
    ctx: Context<'_, '_, '_, 'info, SetFees<'info>>,
    params: &SetFeesParams,
) -> Result<u8> {
    // validate signatures
    let mut multisig = ctx.accounts.multisig.load_mut()?;

    let signatures_left = multisig.sign_multisig(
        &ctx.accounts.admin,
        &Multisig::get_account_infos(&ctx)[1..],
        &Multisig::get_instruction_data(AdminInstruction::SetFees, params)?,
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
    token_pair.fee_numerator = params.fee_numerator;
    token_pair.fee_denominator = params.fee_denominator;
    token_pair.settle_fee_numerator = params.settle_fee_numerator;
    token_pair.settle_fee_denominator = params.settle_fee_denominator;
    token_pair.config_a.crank_reward = params.crank_reward_token_a;
    token_pair.config_b.crank_reward = params.crank_reward_token_b;

    if !token_pair.validate() {
        err!(TwammError::InvalidTokenPairConfig)
    } else {
        Ok(0)
    }
}
