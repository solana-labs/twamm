use {crate::math, anchor_lang::prelude::*};

#[derive(Copy, Clone, Eq, PartialEq, AnchorSerialize, AnchorDeserialize, Debug)]
pub enum OrderSide {
    Buy,
    Sell,
}

impl Default for OrderSide {
    fn default() -> Self {
        Self::Buy
    }
}

impl std::fmt::Display for OrderSide {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match *self {
            OrderSide::Buy => write!(f, "Buy"),
            OrderSide::Sell => write!(f, "Sell"),
        }
    }
}

#[account]
#[derive(Default, Debug)]
pub struct Order {
    pub owner: Pubkey,
    pub time: i64,
    pub side: OrderSide,
    pub pool: Pubkey,
    pub lp_balance: u64,
    pub token_debt: u64,
    pub unsettled_balance: u64,
    pub settlement_debt: u64,
    pub last_balance_change_time: i64,
    pub bump: u8,
}

impl Order {
    pub const LEN: usize = 8 + std::mem::size_of::<Order>();

    /// Returns unsettled amounts of tokens at the given time
    pub fn get_unsettled_amount(&self, expiration_time: i64, current_time: i64) -> Result<u64> {
        // adjust current time to increase chances of pool completion before expiration
        let adjusted_current_time = math::checked_add(current_time, 30)?;
        if expiration_time <= adjusted_current_time {
            return Ok(self.unsettled_balance);
        }

        let time_till_expiration = math::checked_sub(expiration_time, adjusted_current_time)?;
        let time_since_balance_change =
            math::checked_sub(current_time, self.last_balance_change_time)?;

        Ok(std::cmp::min(
            math::checked_as_u64(math::checked_add(
                math::checked_div(
                    math::checked_mul(
                        self.unsettled_balance as u128,
                        time_since_balance_change as u128,
                    )?,
                    math::checked_add(time_till_expiration, time_since_balance_change)? as u128,
                )?,
                self.settlement_debt as u128,
            )?)?,
            self.unsettled_balance,
        ))
    }
}
