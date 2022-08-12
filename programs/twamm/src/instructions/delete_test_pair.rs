//! Delete test pair instruction handler

use {
    crate::{
        error::TwammError,
        state::{
            multisig::{AdminInstruction, Multisig},
            token_pair::TokenPair,
        },
    },
    anchor_lang::prelude::*,
    anchor_spl::token::{Token, TokenAccount},
};

#[derive(Accounts)]
pub struct DeleteTestPair<'info> {
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
        constraint = user_account_token_a.mint == custody_token_a.mint,
    )]
    pub user_account_token_a: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_account_token_b.mint == custody_token_b.mint,
    )]
    pub user_account_token_b: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"token_pair",
                 token_pair.config_a.mint.as_ref(),
                 token_pair.config_b.mint.as_ref()],
        bump = token_pair.token_pair_bump,
        close = transfer_authority
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

    token_program: Program<'info, Token>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct DeleteTestPairParams {}

pub fn delete_test_pair<'info>(
    ctx: Context<'_, '_, '_, 'info, DeleteTestPair<'info>>,
    params: &DeleteTestPairParams,
) -> Result<u8> {
    if !cfg!(feature = "test") {
        return err!(TwammError::InvalidEnvironment);
    }

    // validate signatures
    let mut multisig = ctx.accounts.multisig.load_mut()?;

    let signatures_left = multisig.sign_multisig(
        &ctx.accounts.admin,
        &Multisig::get_account_infos(&ctx)[1..],
        &Multisig::get_instruction_data(AdminInstruction::DeleteTestPair, params)?,
    )?;
    if signatures_left > 0 {
        msg!(
            "Instruction has been signed but more signatures are required: {}",
            signatures_left
        );
        return Ok(signatures_left);
    }

    let token_pair = ctx.accounts.token_pair.as_mut();

    token_pair.transfer_tokens(
        ctx.accounts.custody_token_a.to_account_info(),
        ctx.accounts.user_account_token_a.to_account_info(),
        ctx.accounts.transfer_authority.clone(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.custody_token_a.amount,
    )?;

    token_pair.transfer_tokens(
        ctx.accounts.custody_token_b.to_account_info(),
        ctx.accounts.user_account_token_b.to_account_info(),
        ctx.accounts.transfer_authority.clone(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.custody_token_b.amount,
    )?;

    Ok(0)
}
