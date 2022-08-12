//! Delete test pool instruction handler

use {
    crate::{
        error::TwammError,
        state::{
            multisig::{AdminInstruction, Multisig},
            pool::Pool,
            token_pair::TokenPair,
        },
    },
    anchor_lang::prelude::*,
    anchor_spl::token::TokenAccount,
};

#[derive(Accounts)]
pub struct DeleteTestPool<'info> {
    #[account()]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"multisig"],
        bump = multisig.load()?.bump
    )]
    pub multisig: AccountLoader<'info, Multisig>,

    #[account(
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
        constraint = custody_token_a.key() == token_pair.config_a.custody
    )]
    pub custody_token_a: Box<Account<'info, TokenAccount>>,

    #[account(
        constraint = custody_token_b.key() == token_pair.config_b.custody
    )]
    pub custody_token_b: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"pool",
                 custody_token_a.key().as_ref(),
                 custody_token_b.key().as_ref(),
                 pool.time_in_force.to_le_bytes().as_slice(),
                 pool.counter.to_le_bytes().as_slice()],
        bump = pool.bump,
        close = transfer_authority
    )]
    pub pool: Box<Account<'info, Pool>>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct DeleteTestPoolParams {}

pub fn delete_test_pool<'info>(
    ctx: Context<'_, '_, '_, 'info, DeleteTestPool<'info>>,
    params: &DeleteTestPoolParams,
) -> Result<u8> {
    if !cfg!(feature = "test") {
        return err!(TwammError::InvalidEnvironment);
    }

    // validate signatures
    let mut multisig = ctx.accounts.multisig.load_mut()?;

    let signatures_left = multisig.sign_multisig(
        &ctx.accounts.admin,
        &Multisig::get_account_infos(&ctx)[1..],
        &Multisig::get_instruction_data(AdminInstruction::DeleteTestPool, params)?,
    )?;
    if signatures_left > 0 {
        msg!(
            "Instruction has been signed but more signatures are required: {}",
            signatures_left
        );
        return Ok(signatures_left);
    }

    Ok(0)
}
