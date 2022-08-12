//! Set crank authority instruction handler

use {
    crate::state::{
        multisig::{AdminInstruction, Multisig},
        token_pair::TokenPair,
    },
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct SetCrankAuthority<'info> {
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
pub struct SetCrankAuthorityParams {
    pub crank_authority: Pubkey,
}

pub fn set_crank_authority<'info>(
    ctx: Context<'_, '_, '_, 'info, SetCrankAuthority<'info>>,
    params: &SetCrankAuthorityParams,
) -> Result<u8> {
    // validate signatures
    let mut multisig = ctx.accounts.multisig.load_mut()?;

    let signatures_left = multisig.sign_multisig(
        &ctx.accounts.admin,
        &Multisig::get_account_infos(&ctx)[1..],
        &Multisig::get_instruction_data(AdminInstruction::SetCrankAuthority, params)?,
    )?;
    if signatures_left > 0 {
        msg!(
            "Instruction has been signed but more signatures are required: {}",
            signatures_left
        );
        return Ok(signatures_left);
    }

    // set new crank authority
    ctx.accounts.token_pair.crank_authority = params.crank_authority;

    Ok(0)
}
