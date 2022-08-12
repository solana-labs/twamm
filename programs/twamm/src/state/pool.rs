use {crate::math, anchor_lang::prelude::*};

#[derive(Copy, Clone, Eq, PartialEq, AnchorSerialize, AnchorDeserialize, Debug)]
pub enum PoolStatus {
    Active,
    Locked,
    Expired,
}

impl Default for PoolStatus {
    fn default() -> Self {
        Self::Active
    }
}

impl std::fmt::Display for PoolStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match *self {
            PoolStatus::Active => write!(f, "Active"),
            PoolStatus::Locked => write!(f, "Locked"),
            PoolStatus::Expired => write!(f, "Expired"),
        }
    }
}

#[derive(Copy, Clone, AnchorSerialize, AnchorDeserialize, Default, Debug)]
pub struct PoolSide {
    pub source_balance: u64,
    pub target_balance: u64,
    pub lp_supply: u64,
    pub token_debt_total: u64,
    pub fills_volume: u64,
    pub weighted_fills_sum: f64,
    pub min_fill_price: f64,
    pub max_fill_price: f64,
    pub num_traders: u64,
    pub settlement_debt_total: u64,
    pub last_balance_change_time: i64,
}

#[account]
#[derive(Default, Debug)]
pub struct Pool {
    pub status: PoolStatus,
    pub time_in_force: u32,
    pub expiration_time: i64,
    pub token_pair: Pubkey,
    pub buy_side: PoolSide,
    pub sell_side: PoolSide,
    pub counter: u64,
    pub bump: u8,
}

impl PoolSide {
    /// Returns unsettled amounts of tokens at the given time
    pub fn get_unsettled_amount(&self, expiration_time: i64, current_time: i64) -> Result<u64> {
        if current_time < self.last_balance_change_time {
            return Ok(std::cmp::min(
                self.settlement_debt_total,
                self.source_balance,
            ));
        }
        // adjust expiration time to increase chances of pool completion before the expiration
        let adjusted_expiration_time = math::checked_sub(expiration_time, 30)?;
        if current_time >= adjusted_expiration_time {
            return Ok(self.source_balance);
        }

        let time_till_expiration = math::checked_sub(adjusted_expiration_time, current_time)?;
        let time_since_balance_change =
            math::checked_sub(current_time, self.last_balance_change_time)?;

        Ok(std::cmp::min(
            math::checked_as_u64(math::checked_add(
                math::checked_div(
                    math::checked_mul(
                        self.source_balance as u128,
                        time_since_balance_change as u128,
                    )?,
                    math::checked_add(time_till_expiration, time_since_balance_change)? as u128,
                )?,
                self.settlement_debt_total as u128,
            )?)?,
            self.source_balance,
        ))
    }
}

impl Pool {
    pub const LEN: usize = 8 + std::mem::size_of::<Pool>();

    /// Checks if the pool is empty
    pub fn is_empty(&self) -> bool {
        self.buy_side.source_balance == 0
            && self.buy_side.target_balance == 0
            && self.sell_side.source_balance == 0
            && self.sell_side.target_balance == 0
    }

    /// Checks if the pool is expired
    pub fn is_expired(&self, current_time: i64) -> Result<bool> {
        Ok(self.status == PoolStatus::Expired || current_time >= self.expiration_time)
    }

    /// Checks if the pool is locked and doesn't accept new orders
    pub fn is_locked(&self, min_time_till_expiration: f64, current_time: i64) -> Result<bool> {
        if self.status == PoolStatus::Locked || self.is_expired(current_time)? {
            return Ok(true);
        }
        let tte = math::checked_sub(self.expiration_time, current_time)?;
        let tte_perc = math::checked_float_div(tte as f64, self.time_in_force as f64)?;
        Ok(tte_perc <= min_time_till_expiration)
    }

    /// Checks if the pools is finalized, i.e., expired and complete
    pub fn is_complete(&self, current_time: i64) -> Result<bool> {
        Ok(self.is_expired(current_time)?
            && ((self.buy_side.source_balance == 0 && self.sell_side.source_balance == 0)
                || current_time
                    > math::checked_add(
                        self.expiration_time,
                        num::clamp(self.time_in_force / 100, 60, 600) as i64,
                    )?))
    }

    /// Updates pool state and returns the updated value
    pub fn update_state(
        &mut self,
        min_time_till_expiration: f64,
        current_time: i64,
    ) -> Result<PoolStatus> {
        if self.is_locked(min_time_till_expiration, current_time)? {
            if self.is_expired(current_time)? {
                self.status = PoolStatus::Expired;
            } else {
                self.status = PoolStatus::Locked;
            }
        }
        Ok(self.status)
    }
}
