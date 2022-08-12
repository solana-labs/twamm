//! TWAMM program entrypoint

#![allow(clippy::result_large_err)]

mod error;
mod instructions;
mod math;
mod oracle;
mod state;

use {anchor_lang::prelude::*, instructions::*};

solana_security_txt::security_txt! {
    name: "Permissionless TWAMM",
    project_url: "https://github.com/askibin/twamm",
    contacts: "email:solana.farms@protonmail.com",
    policy: "",
    preferred_languages: "en",
    auditors: ""
}

declare_id!("TWAMdUxafgDN2BJNFaC6pND63tjdLz4AmEKBzuxtbe9");

pub mod jupiter {
    solana_program::declare_id!("JUP3c2Uh3WA4Ng34tw6kPd2G4C5BB21Xo36Je1s32Ph");
}

#[derive(Clone)]
pub struct Twamm;

impl anchor_lang::Id for Twamm {
    fn id() -> Pubkey {
        ID
    }
}

#[program]
pub mod twamm {
    use super::*;

    pub fn init(ctx: Context<Init>, params: InitParams) -> Result<()> {
        instructions::init(ctx, &params)
    }

    pub fn test_init(ctx: Context<TestInit>, params: TestInitParams) -> Result<()> {
        instructions::test_init(ctx, &params)
    }

    pub fn init_token_pair<'info>(
        ctx: Context<'_, '_, '_, 'info, InitTokenPair<'info>>,
        params: InitTokenPairParams,
    ) -> Result<u8> {
        instructions::init_token_pair(ctx, &params)
    }

    pub fn set_permissions<'info>(
        ctx: Context<'_, '_, '_, 'info, SetPermissions<'info>>,
        params: SetPermissionsParams,
    ) -> Result<u8> {
        instructions::set_permissions(ctx, &params)
    }

    pub fn set_limits<'info>(
        ctx: Context<'_, '_, '_, 'info, SetLimits<'info>>,
        params: SetLimitsParams,
    ) -> Result<u8> {
        instructions::set_limits(ctx, &params)
    }

    pub fn set_fees<'info>(
        ctx: Context<'_, '_, '_, 'info, SetFees<'info>>,
        params: SetFeesParams,
    ) -> Result<u8> {
        instructions::set_fees(ctx, &params)
    }

    pub fn set_admin_signers<'info>(
        ctx: Context<'_, '_, '_, 'info, SetAdminSigners<'info>>,
        params: SetAdminSignersParams,
    ) -> Result<u8> {
        instructions::set_admin_signers(ctx, &params)
    }

    pub fn set_crank_authority<'info>(
        ctx: Context<'_, '_, '_, 'info, SetCrankAuthority<'info>>,
        params: SetCrankAuthorityParams,
    ) -> Result<u8> {
        instructions::set_crank_authority(ctx, &params)
    }

    pub fn set_oracle_config<'info>(
        ctx: Context<'_, '_, '_, 'info, SetOracleConfig<'info>>,
        params: SetOracleConfigParams,
    ) -> Result<u8> {
        instructions::set_oracle_config(ctx, &params)
    }

    pub fn set_time_in_force<'info>(
        ctx: Context<'_, '_, '_, 'info, SetTimeInForce<'info>>,
        params: SetTimeInForceParams,
    ) -> Result<u8> {
        instructions::set_time_in_force(ctx, &params)
    }

    pub fn set_test_oracle_price<'info>(
        ctx: Context<'_, '_, '_, 'info, SetTestOraclePrice<'info>>,
        params: SetTestOraclePriceParams,
    ) -> Result<u8> {
        instructions::set_test_oracle_price(ctx, &params)
    }

    pub fn set_test_time<'info>(
        ctx: Context<'_, '_, '_, 'info, SetTestTime<'info>>,
        params: SetTestTimeParams,
    ) -> Result<u8> {
        instructions::set_test_time(ctx, &params)
    }

    pub fn delete_test_pool<'info>(
        ctx: Context<'_, '_, '_, 'info, DeleteTestPool<'info>>,
        params: DeleteTestPoolParams,
    ) -> Result<u8> {
        instructions::delete_test_pool(ctx, &params)
    }

    pub fn delete_test_pair<'info>(
        ctx: Context<'_, '_, '_, 'info, DeleteTestPair<'info>>,
        params: DeleteTestPairParams,
    ) -> Result<u8> {
        instructions::delete_test_pair(ctx, &params)
    }

    pub fn withdraw_fees<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawFees<'info>>,
        params: WithdrawFeesParams,
    ) -> Result<u8> {
        instructions::withdraw_fees(ctx, &params)
    }

    pub fn get_outstanding_amount(
        ctx: Context<GetOutstandingAmount>,
        params: GetOutstandingAmountParams,
    ) -> Result<i64> {
        instructions::get_outstanding_amount(ctx, &params)
    }

    pub fn crank(ctx: Context<Crank>, params: CrankParams) -> Result<i64> {
        instructions::crank(ctx, &params)
    }

    pub fn settle(ctx: Context<Settle>, params: SettleParams) -> Result<i64> {
        instructions::settle(ctx, &params)
    }

    pub fn place_order(ctx: Context<PlaceOrder>, params: PlaceOrderParams) -> Result<()> {
        instructions::place_order(ctx, &params)
    }

    pub fn cancel_order(ctx: Context<CancelOrder>, params: CancelOrderParams) -> Result<()> {
        instructions::cancel_order(ctx, &params)
    }
}
