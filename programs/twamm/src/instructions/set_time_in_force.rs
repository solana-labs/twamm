//! Set time in force instruction handler

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
pub struct SetTimeInForce<'info> {
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
pub struct SetTimeInForceParams {
    pub time_in_force_index: u8,
    pub new_time_in_force: u32,
}

pub fn set_time_in_force<'info>(
    ctx: Context<'_, '_, '_, 'info, SetTimeInForce<'info>>,
    params: &SetTimeInForceParams,
) -> Result<u8> {
    // validate inputs
    let index = params.time_in_force_index as usize;
    require!(index < TokenPair::MAX_POOLS, TwammError::InvalidTimeInForce);

    // validate signatures
    let mut multisig = ctx.accounts.multisig.load_mut()?;

    let signatures_left = multisig.sign_multisig(
        &ctx.accounts.admin,
        &Multisig::get_account_infos(&ctx)[1..],
        &Multisig::get_instruction_data(AdminInstruction::SetTimeInForce, params)?,
    )?;
    if signatures_left > 0 {
        msg!(
            "Instruction has been signed but more signatures are required: {}",
            signatures_left
        );
        return Ok(signatures_left);
    }

    // update time in force
    let token_pair = ctx.accounts.token_pair.as_mut();
    if params.new_time_in_force == token_pair.tifs[index] {
        return Ok(0);
    }

    if token_pair.current_pool_present[index] || token_pair.future_pool_present[index] {
        msg!("Error: Couldn't change time in force while non-expired pools present");
        return err!(TwammError::InvalidPoolState);
    }

    token_pair.tifs[index] = params.new_time_in_force;

    if !token_pair.validate() {
        err!(TwammError::InvalidTokenPairConfig)
    } else {
        Ok(0)
    }
}
