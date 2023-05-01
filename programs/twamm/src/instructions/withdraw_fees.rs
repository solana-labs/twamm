//! Withdraw fees instruction handler

use {
    crate::{
        math,
        state::{
            self,
            multisig::{AdminInstruction, Multisig},
            token_pair::TokenPair,
        },
    },
    anchor_lang::prelude::*,
    anchor_spl::token::{Token, TokenAccount},
    solana_program::sysvar,
};

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
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

    #[account(mut)]
    pub receiver_token_a: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub receiver_token_b: Box<Account<'info, TokenAccount>>,

    /// CHECK: SOL fees receiver
    #[account(
        mut,
        constraint = receiver_sol.data_is_empty()
    )]
    pub receiver_sol: AccountInfo<'info>,

    token_program: Program<'info, Token>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct WithdrawFeesParams {
    pub amount_token_a: u64,
    pub amount_token_b: u64,
    pub amount_sol: u64,
}

pub fn withdraw_fees<'info>(
    ctx: Context<'_, '_, '_, 'info, WithdrawFees<'info>>,
    params: &WithdrawFeesParams,
) -> Result<u8> {
    // validate signatures
    let mut multisig = ctx.accounts.multisig.load_mut()?;

    let signatures_left = multisig.sign_multisig(
        &ctx.accounts.admin,
        &Multisig::get_account_infos(&ctx)[1..],
        &Multisig::get_instruction_data(AdminInstruction::WithdrawFees, params)?,
    )?;
    if signatures_left > 0 {
        msg!(
            "Instruction has been signed but more signatures are required: {}",
            signatures_left
        );
        return Ok(signatures_left);
    }

    // transfer token fees from the custody to the receiver
    let token_pair = ctx.accounts.token_pair.as_mut();

    if params.amount_token_a > 0 {
        msg!(
            "Withdraw token A fees: {} / {}",
            params.amount_token_a,
            token_pair.stats_a.fees_collected
        );
        if token_pair.stats_a.fees_collected < params.amount_token_a {
            return Err(ProgramError::InsufficientFunds.into());
        }
        token_pair.stats_a.fees_collected =
            math::checked_sub(token_pair.stats_a.fees_collected, params.amount_token_a)?;

        token_pair.transfer_tokens(
            ctx.accounts.custody_token_a.to_account_info(),
            ctx.accounts.receiver_token_a.to_account_info(),
            ctx.accounts.transfer_authority.clone(),
            ctx.accounts.token_program.to_account_info(),
            params.amount_token_a,
        )?;
    }

    if params.amount_token_b > 0 {
        msg!(
            "Withdraw token B fees: {} / {}",
            params.amount_token_b,
            token_pair.stats_b.fees_collected
        );
        if token_pair.stats_b.fees_collected < params.amount_token_b {
            return Err(ProgramError::InsufficientFunds.into());
        }
        token_pair.stats_b.fees_collected =
            math::checked_sub(token_pair.stats_b.fees_collected, params.amount_token_b)?;

        token_pair.transfer_tokens(
            ctx.accounts.custody_token_b.to_account_info(),
            ctx.accounts.receiver_token_b.to_account_info(),
            ctx.accounts.transfer_authority.clone(),
            ctx.accounts.token_program.to_account_info(),
            params.amount_token_b,
        )?;
    }

    // transfer sol fees from the custody to the receiver
    if params.amount_sol > 0 {
        let balance = ctx.accounts.transfer_authority.try_lamports()?;
        let min_balance = sysvar::rent::Rent::get()?.minimum_balance(0);
        let available_balance = if balance > min_balance {
            math::checked_sub(balance, min_balance)?
        } else {
            0
        };
        msg!(
            "Withdraw SOL fees: {} / {}",
            params.amount_sol,
            available_balance
        );
        if available_balance < params.amount_sol {
            return Err(ProgramError::InsufficientFunds.into());
        }

        state::transfer_sol_from_owned(
            ctx.accounts.transfer_authority.to_account_info(),
            ctx.accounts.receiver_sol.to_account_info(),
            params.amount_sol,
        )?;
    }

    Ok(0)
}
