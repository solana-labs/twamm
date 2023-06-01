//! Error types

use anchor_lang::prelude::*;

#[error_code]
pub enum TwammError {
    #[msg("Account is not authorized to sign this instruction")]
    MultisigAccountNotAuthorized,
    #[msg("Account has already signed this instruction")]
    MultisigAlreadySigned,
    #[msg("This instruction has already been executed")]
    MultisigAlreadyExecuted,
    #[msg("Invalid token pair config")]
    InvalidTokenPairConfig,
    #[msg("Invalid token amount")]
    InvalidTokenAmount,
    #[msg("Invalid token pair price")]
    InvalidTokenPairPrice,
    #[msg("Deposits are not allowed at this time")]
    DepositsNotAllowed,
    #[msg("Withdrawals are not allowed at this time")]
    WithdrawalsNotAllowed,
    #[msg("Cranks are not allowed at this time")]
    CranksNotAllowed,
    #[msg("Settlements are not allowed at this time")]
    SettlementsNotAllowed,
    #[msg("Instruction is not allowed in production")]
    InvalidEnvironment,
    #[msg("Order side mismatch")]
    OrderSideMismatch,
    #[msg("Time in force mismatch")]
    TimeInForceMismatch,
    #[msg("Invalid time in force")]
    InvalidTimeInForce,
    #[msg("Invalid pool address")]
    InvalidPoolAddress,
    #[msg("Pool doesn't accept new orders")]
    LockedPool,
    #[msg("Pool has been expired")]
    ExpiredPool,
    #[msg("Invalid pool state")]
    InvalidPoolState,
    #[msg("Overflow in arithmetic operation")]
    MathOverflow,
    #[msg("Unsupported price oracle")]
    UnsupportedOracle,
    #[msg("Invalid oracle account")]
    InvalidOracleAccount,
    #[msg("Invalid oracle state")]
    InvalidOracleState,
    #[msg("Stale oracle price")]
    StaleOraclePrice,
    #[msg("Invalid oracle price")]
    InvalidOraclePrice,
    #[msg("Max slippage exceeded")]
    MaxSlippage,
    #[msg("Nothing to settle at this time")]
    NothingToSettle,
    #[msg("Invalid settlement side")]
    InvalidSettlementSide,
    #[msg("Amount to settle is too small")]
    SettlementAmountTooSmall,
    #[msg("Amount to settle is too large")]
    SettlementAmountTooLarge,
    #[msg("Unexpected settlement error")]
    SettlementError,
    #[msg("Settle price is out of bounds")]
    SettlementPriceOutOfBounds,
}
