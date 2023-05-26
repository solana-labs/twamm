//! TokenPair struct holds parameters for particular trading pair

use {
    crate::{
        error::TwammError,
        math, oracle,
        oracle::{OraclePrice, OracleType},
        state,
        state::pool::{Pool, PoolSide},
    },
    anchor_lang::prelude::*,
    anchor_spl::token::Transfer,
};

#[derive(Copy, Clone, AnchorSerialize, AnchorDeserialize, Default)]
pub struct TokenConfig {
    pub crank_reward: u64,
    pub min_swap_amount: u64,

    pub max_oracle_price_error: f64,
    pub max_oracle_price_age_sec: u32,
    pub oracle_type: OracleType,
    pub oracle_account: Pubkey,

    pub mint: Pubkey,
    pub custody: Pubkey,
    pub decimals: u8,
}

#[derive(Copy, Clone, PartialEq, AnchorSerialize, AnchorDeserialize, Default)]
pub struct TokenStats {
    pub pending_withdrawals: u64,
    pub fees_collected: u64,
    pub order_volume_usd: u64,
    pub routed_volume_usd: u64,
    pub settled_volume_usd: u64,
}

#[derive(Copy, Clone, Default, Debug, Eq, PartialEq)]
pub struct Settlement {
    pub net_amount_settled: u64,
    pub net_amount_required: u64,
    pub source_amount_received: u64,
    pub total_amount_settled_a: u64,
    pub total_amount_settled_b: u64,
    pub settlement_side: MatchingSide,
}

#[derive(Copy, Clone, Eq, PartialEq)]
pub enum SettlementType {
    Crank,
    Settlement,
}

#[derive(Copy, Clone, Eq, PartialEq, AnchorSerialize, AnchorDeserialize, Debug)]
pub enum MatchingSide {
    Buy,
    Sell,
    Internal,
}

impl Default for MatchingSide {
    fn default() -> Self {
        Self::Internal
    }
}

impl std::fmt::Display for MatchingSide {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match *self {
            MatchingSide::Buy => write!(f, "Buy"),
            MatchingSide::Sell => write!(f, "Sell"),
            MatchingSide::Internal => write!(f, "Internal"),
        }
    }
}

#[account]
#[derive(Default)]
pub struct TokenPair {
    pub allow_deposits: bool,
    pub allow_withdrawals: bool,
    pub allow_cranks: bool,
    pub allow_settlements: bool,

    // withdrawal fee, taken from the target side only
    pub fee_numerator: u64,
    pub fee_denominator: u64,

    // settlement fee, taken from the target side only
    pub settle_fee_numerator: u64,
    pub settle_fee_denominator: u64,

    // maximum trade price difference versus oracle price
    pub max_swap_price_diff: f64,

    // maximum settle amount difference with value calculated off-chain
    pub max_unsettled_amount: f64,

    // minimum time till expiration when new orders are still accepted
    pub min_time_till_expiration: f64,

    pub crank_authority: Pubkey,

    pub config_a: TokenConfig,
    pub config_b: TokenConfig,

    pub stats_a: TokenStats,
    pub stats_b: TokenStats,

    // supported time in force intervals
    pub tifs: [u32; 10], // TokenPair::MAX_POOLS

    // counters to keep track of pool seeds
    pub pool_counters: [u64; 10], // TokenPair::MAX_POOLS

    pub current_pool_present: [bool; 10], // TokenPair::MAX_POOLS
    pub future_pool_present: [bool; 10],  // TokenPair::MAX_POOLS

    pub token_pair_bump: u8,
    pub transfer_authority_bump: u8,

    // time of inception, also used as current wall clock time for testing
    pub inception_time: i64,
}

impl TokenPair {
    pub const LEN: usize = 8 + std::mem::size_of::<TokenPair>();
    pub const MAX_POOLS: usize = 10;

    /// Returns the index of the given time in force value in the tifs array
    pub fn get_tif_index(&self, time_in_force: u32) -> Result<usize> {
        if time_in_force == 0 {
            return err!(TwammError::InvalidTimeInForce);
        }
        Ok(self
            .tifs
            .iter()
            .position(|tif| *tif == time_in_force)
            .ok_or(TwammError::InvalidTimeInForce)?)
    }

    pub fn validate(&self) -> bool {
        self.fee_numerator < self.fee_denominator
            && self.settle_fee_numerator < self.settle_fee_denominator
            && self.max_swap_price_diff >= 0.0
            && self.max_swap_price_diff <= 1.0
            && self.max_unsettled_amount >= 0.0
            && self.max_unsettled_amount <= 1.0
            && self.min_time_till_expiration >= 0.0
            && self.min_time_till_expiration <= 1.0
            && (!self.allow_settlements
                || (!matches!(self.config_a.oracle_type, OracleType::None)
                    && !matches!(self.config_b.oracle_type, OracleType::None)))
            && (matches!(self.config_a.oracle_type, OracleType::None)
                || (self.config_a.oracle_account != Pubkey::default()
                    && self.config_a.max_oracle_price_error >= 0.0))
            && (matches!(self.config_b.oracle_type, OracleType::None)
                || (self.config_b.oracle_account != Pubkey::default()
                    && self.config_b.max_oracle_price_error >= 0.0))
            && !((1..self.tifs.len())
                .any(|i| self.tifs[i - 1] != 0 && self.tifs[i..].contains(&self.tifs[i - 1])))
    }

    pub fn transfer_tokens<'info>(
        &self,
        from: AccountInfo<'info>,
        to: AccountInfo<'info>,
        authority: AccountInfo<'info>,
        token_program: AccountInfo<'info>,
        amount: u64,
    ) -> Result<()> {
        let authority_seeds: &[&[&[u8]]] =
            &[&[b"transfer_authority", &[self.transfer_authority_bump]]];

        let context = CpiContext::new(
            token_program,
            Transfer {
                from,
                to,
                authority,
            },
        )
        .with_signer(authority_seeds);

        anchor_spl::token::transfer(context, amount)
    }

    #[cfg(feature = "test")]
    pub fn get_time(&self) -> Result<i64> {
        Ok(self.inception_time)
    }

    #[cfg(not(feature = "test"))]
    pub fn get_time(&self) -> Result<i64> {
        let time = solana_program::sysvar::clock::Clock::get()?.unix_timestamp;
        if time > 0 {
            Ok(time)
        } else {
            Err(ProgramError::InvalidAccountData.into())
        }
    }

    pub fn get_token_a_oracle_price(&self, oracle_token_a: &AccountInfo) -> Result<OraclePrice> {
        oracle::get_oracle_price(
            self.config_a.oracle_type,
            oracle_token_a,
            self.config_a.max_oracle_price_error,
            self.config_a.max_oracle_price_age_sec,
            self.get_time()?,
        )
    }

    pub fn get_token_b_oracle_price(&self, oracle_token_b: &AccountInfo) -> Result<OraclePrice> {
        oracle::get_oracle_price(
            self.config_b.oracle_type,
            oracle_token_b,
            self.config_b.max_oracle_price_error,
            self.config_b.max_oracle_price_age_sec,
            self.get_time()?,
        )
    }

    pub fn get_token_pair_oracle_price(
        &self,
        oracle_token_a: &AccountInfo,
        oracle_token_b: &AccountInfo,
    ) -> Result<OraclePrice> {
        let pair_price = self
            .get_token_a_oracle_price(oracle_token_a)?
            .checked_div(&self.get_token_b_oracle_price(oracle_token_b)?)?;
        require_gt!(pair_price.price, 0, TwammError::InvalidTokenPairPrice);
        Ok(pair_price)
    }

    pub fn get_token_a_amount(
        &self,
        token_b_amount: u64,
        exchange_rate: OraclePrice,
    ) -> Result<u64> {
        math::checked_decimal_div(
            token_b_amount,
            -(self.config_b.decimals as i32),
            exchange_rate.price,
            exchange_rate.exponent,
            -(self.config_a.decimals as i32),
        )
    }

    pub fn get_token_a_amount_ceil(
        &self,
        token_b_amount: u64,
        exchange_rate: OraclePrice,
    ) -> Result<u64> {
        math::checked_decimal_ceil_div(
            token_b_amount,
            -(self.config_b.decimals as i32),
            exchange_rate.price,
            exchange_rate.exponent,
            -(self.config_a.decimals as i32),
        )
    }

    pub fn get_token_b_amount(
        &self,
        token_a_amount: u64,
        exchange_rate: OraclePrice,
    ) -> Result<u64> {
        math::checked_decimal_mul(
            token_a_amount,
            -(self.config_a.decimals as i32),
            exchange_rate.price,
            exchange_rate.exponent,
            -(self.config_b.decimals as i32),
        )
    }

    pub fn get_token_b_amount_ceil(
        &self,
        token_a_amount: u64,
        exchange_rate: OraclePrice,
    ) -> Result<u64> {
        math::checked_decimal_ceil_mul(
            token_a_amount,
            -(self.config_a.decimals as i32),
            exchange_rate.price,
            exchange_rate.exponent,
            -(self.config_b.decimals as i32),
        )
    }

    pub fn load_pools<'a>(
        &self,
        accounts: &[AccountInfo<'a>],
    ) -> Result<(Vec<Account<'a, Pool>>, Pubkey)> {
        let mut pools: Vec<Account<Pool>> = Vec::with_capacity(accounts.len());
        let mut pools_found: [bool; TokenPair::MAX_POOLS] = [false; TokenPair::MAX_POOLS];
        let mut router_program = Pubkey::default();

        for (idx, account) in accounts.iter().enumerate() {
            if account.key == &crate::jupiter::ID || account.key == &Pubkey::default() {
                router_program = *account.key;
                break;
            }
            if state::is_empty_account(account)? {
                continue;
            }

            // validate account
            if idx >= TokenPair::MAX_POOLS {
                msg!("Error: Unexpected number of pool accounts");
                return err!(TwammError::InvalidPoolAddress);
            }
            if account.owner != &crate::ID {
                return Err(ProgramError::IllegalOwner.into());
            }
            if account.try_data_len()? != Pool::LEN {
                return Err(ProgramError::InvalidAccountData.into());
            }
            // deserialize pool
            let pool = Account::<Pool>::try_from(account)?;
            // validate pool address
            let pool_address = Pubkey::create_program_address(
                &[
                    b"pool",
                    self.config_a.custody.as_ref(),
                    self.config_b.custody.as_ref(),
                    pool.time_in_force.to_le_bytes().as_slice(),
                    pool.counter.to_le_bytes().as_slice(),
                    &[pool.bump],
                ],
                &crate::ID,
            )
            .map_err(|_| TwammError::InvalidPoolAddress)?;

            if &pool_address != account.key {
                msg!("Error: Invalid pool address: Doesn't belong to the given token pair");
                return err!(TwammError::InvalidPoolAddress);
            }

            // validate pool
            let tif_idx = self.get_tif_index(pool.time_in_force)?;
            if pools_found[tif_idx] {
                msg!("Error: Invalid pool address: Pool with the same TIF already processed");
                return err!(TwammError::InvalidPoolAddress);
            }
            if pool.counter != self.pool_counters[tif_idx] {
                msg!("Error: Invalid pool address: Pool is not current");
                return err!(TwammError::InvalidPoolAddress);
            }
            pools_found[tif_idx] = true;

            pools.push(pool);
        }

        // check all current pools have been provided
        if pools_found != self.current_pool_present {
            msg!("Error: Not all current pools provided in accounts");
            return err!(TwammError::InvalidPoolAddress);
        }

        Ok((pools, router_program))
    }

    pub fn save_pools(&self, pools: &[Account<Pool>]) -> Result<()> {
        for pool in pools {
            pool.exit(&crate::ID)?;
        }
        Ok(())
    }

    pub fn finalize_pool(
        &mut self,
        pool: &Pool,
        pool_account: &AccountInfo,
        sol_destination: &AccountInfo,
    ) -> Result<()> {
        let tif_idx = self.get_tif_index(pool.time_in_force)?;
        if pool.counter == math::checked_add(self.pool_counters[tif_idx], 1)? {
            self.future_pool_present[tif_idx] = false;
        } else if pool.counter == self.pool_counters[tif_idx] {
            // update counters
            if self.future_pool_present[tif_idx] {
                self.future_pool_present[tif_idx] = false;
                self.current_pool_present[tif_idx] = true;
            } else {
                self.current_pool_present[tif_idx] = false;
            }
            self.pool_counters[tif_idx] = math::checked_add(self.pool_counters[tif_idx], 1)?;

            // update stats
            self.stats_a.pending_withdrawals = self
                .stats_a
                .pending_withdrawals
                .saturating_add(pool.sell_side.source_balance);
            self.stats_a.pending_withdrawals = self
                .stats_a
                .pending_withdrawals
                .saturating_add(pool.buy_side.target_balance);
            self.stats_b.pending_withdrawals = self
                .stats_b
                .pending_withdrawals
                .saturating_add(pool.sell_side.target_balance);
            self.stats_b.pending_withdrawals = self
                .stats_b
                .pending_withdrawals
                .saturating_add(pool.buy_side.source_balance);
        }

        if pool.is_empty() {
            // delete pool if no longer needed
            **sol_destination.try_borrow_mut_lamports()? = math::checked_add(
                sol_destination.try_lamports()?,
                pool_account.try_lamports()?,
            )?;
            **pool_account.try_borrow_mut_lamports()? = 0;
        }

        Ok(())
    }

    pub fn update_trade_stats(
        &mut self,
        settlement: &Settlement,
        settlement_type: SettlementType,
        oracle_token_a: &AccountInfo,
        oracle_token_b: &AccountInfo,
    ) -> Result<()> {
        let oracle_price_a = self.get_token_a_oracle_price(oracle_token_a)?;
        let oracle_price_b = self.get_token_b_oracle_price(oracle_token_b)?;
        if settlement.settlement_side == MatchingSide::Sell {
            if settlement_type == SettlementType::Crank {
                self.stats_a.routed_volume_usd =
                    self.stats_a
                        .routed_volume_usd
                        .wrapping_add(oracle::get_asset_amount_usd(
                            settlement.net_amount_settled,
                            self.config_a.decimals,
                            &oracle_price_a,
                        )?);
            } else {
                self.stats_a.settled_volume_usd =
                    self.stats_a
                        .settled_volume_usd
                        .wrapping_add(oracle::get_asset_amount_usd(
                            settlement.net_amount_settled,
                            self.config_a.decimals,
                            &oracle_price_a,
                        )?);
            }
        } else if settlement.settlement_side == MatchingSide::Buy {
            if settlement_type == SettlementType::Crank {
                self.stats_b.routed_volume_usd =
                    self.stats_b
                        .routed_volume_usd
                        .wrapping_add(oracle::get_asset_amount_usd(
                            settlement.net_amount_settled,
                            self.config_b.decimals,
                            &oracle_price_b,
                        )?);
            } else {
                self.stats_b.settled_volume_usd =
                    self.stats_b
                        .settled_volume_usd
                        .wrapping_add(oracle::get_asset_amount_usd(
                            settlement.net_amount_settled,
                            self.config_b.decimals,
                            &oracle_price_b,
                        )?);
            }
        }
        self.stats_a.order_volume_usd =
            self.stats_a
                .order_volume_usd
                .wrapping_add(oracle::get_asset_amount_usd(
                    settlement.total_amount_settled_a,
                    self.config_a.decimals,
                    &oracle_price_a,
                )?);
        self.stats_b.order_volume_usd =
            self.stats_b
                .order_volume_usd
                .wrapping_add(oracle::get_asset_amount_usd(
                    settlement.total_amount_settled_b,
                    self.config_b.decimals,
                    &oracle_price_b,
                )?);
        Ok(())
    }

    /// Settles pools and returns required net amount and settled amount
    #[allow(clippy::too_many_arguments)]
    pub fn settle_pools(
        &self,
        pools: &mut [&mut Pool],
        supply_side: MatchingSide,
        token_a_change: u64,
        token_b_change: u64,
        exchange_rate: OraclePrice,
        oracle_price: OraclePrice,
        current_time: i64,
    ) -> Result<Settlement> {
        let mut outstanding_a: [u64; TokenPair::MAX_POOLS] = [0; TokenPair::MAX_POOLS];
        let mut outstanding_b: [u64; TokenPair::MAX_POOLS] = [0; TokenPair::MAX_POOLS];
        let mut total_outstanding_a = 0;
        let mut total_outstanding_b = 0;
        let mut res = Settlement {
            net_amount_settled: 0,
            net_amount_required: 0,
            source_amount_received: 0,
            total_amount_settled_a: 0,
            total_amount_settled_b: 0,
            settlement_side: MatchingSide::Internal,
        };

        // calculate outstanding amount per pool and in total
        // try settle each pool with itself along the way
        assert!(!pools.is_empty() && pools.len() < TokenPair::MAX_POOLS);
        for (idx, pool) in pools.iter_mut().enumerate() {
            let outstanding_sell = pool
                .sell_side
                .get_unsettled_amount(pool.expiration_time, current_time)?;
            let outstanding_buy = pool
                .buy_side
                .get_unsettled_amount(pool.expiration_time, current_time)?;
            if outstanding_sell > 0 || outstanding_buy > 0 {
                total_outstanding_a = math::checked_add(total_outstanding_a, outstanding_sell)?;
                total_outstanding_b = math::checked_add(total_outstanding_b, outstanding_buy)?;
                outstanding_a[idx] = math::checked_add(outstanding_a[idx], outstanding_sell)?;
                outstanding_b[idx] = math::checked_add(outstanding_b[idx], outstanding_buy)?;

                let (settled_a, settled_b) = self.settle_sides(
                    &mut pool.sell_side,
                    &mut pool.buy_side,
                    outstanding_sell,
                    outstanding_buy,
                    oracle_price,
                )?;
                outstanding_a[idx] = math::checked_sub(outstanding_a[idx], settled_a)?;
                outstanding_b[idx] = math::checked_sub(outstanding_b[idx], settled_b)?;
            }
        }

        // settle pools internally
        for idx in 0..(pools.len() - 1) {
            if outstanding_a[idx] != 0 || outstanding_b[idx] != 0 {
                for other_idx in (idx + 1)..pools.len() {
                    if outstanding_a[idx] != 0 && outstanding_b[other_idx] != 0 {
                        let (settled_a, settled_b) = self.settle_sides(
                            &mut pools[idx].sell_side,
                            &mut pools[other_idx].buy_side,
                            outstanding_a[idx],
                            outstanding_b[other_idx],
                            oracle_price,
                        )?;
                        outstanding_a[idx] = math::checked_sub(outstanding_a[idx], settled_a)?;
                        outstanding_b[other_idx] =
                            math::checked_sub(outstanding_b[other_idx], settled_b)?;
                    }
                    if outstanding_b[idx] != 0 && outstanding_a[other_idx] != 0 {
                        let (settled_a, settled_b) = self.settle_sides(
                            &mut pools[other_idx].sell_side,
                            &mut pools[idx].buy_side,
                            outstanding_a[other_idx],
                            outstanding_b[idx],
                            oracle_price,
                        )?;
                        outstanding_a[other_idx] =
                            math::checked_sub(outstanding_a[other_idx], settled_a)?;
                        outstanding_b[idx] = math::checked_sub(outstanding_b[idx], settled_b)?;
                    }
                }
            }
        }

        // compute net amounts
        let mut net_outstanding_a = 0;
        let mut net_outstanding_b = 0;
        for val in outstanding_a {
            net_outstanding_a = math::checked_add(net_outstanding_a, val)?;
        }
        for val in outstanding_b {
            net_outstanding_b = math::checked_add(net_outstanding_b, val)?;
        }
        if net_outstanding_a != 0 && net_outstanding_b != 0 {
            msg!("Error: Pools matching error");
            return err!(TwammError::SettlementError);
        }

        res.settlement_side = if net_outstanding_a != 0 {
            res.net_amount_required = net_outstanding_a;
            MatchingSide::Sell
        } else if net_outstanding_b != 0 {
            res.net_amount_required = net_outstanding_b;
            MatchingSide::Buy
        } else {
            MatchingSide::Internal
        };

        // settle with supplied amounts
        if res.settlement_side != MatchingSide::Internal
            && supply_side != res.settlement_side
            && token_a_change != 0
            && token_b_change != 0
        {
            // compute total amount of tokens to receive and return
            let mut pool_amount_out;
            let mut supply_amount_in;
            if res.settlement_side == MatchingSide::Sell {
                pool_amount_out = std::cmp::min(token_a_change, res.net_amount_required);
                supply_amount_in = if token_a_change <= res.net_amount_required {
                    token_b_change
                } else {
                    self.get_token_b_amount_ceil(pool_amount_out, exchange_rate)?
                };
            } else {
                pool_amount_out = std::cmp::min(token_b_change, res.net_amount_required);
                supply_amount_in = if token_b_change <= res.net_amount_required {
                    token_a_change
                } else {
                    self.get_token_a_amount_ceil(pool_amount_out, exchange_rate)?
                };
            }
            res.net_amount_settled = pool_amount_out;
            res.source_amount_received = supply_amount_in;

            // settle pools one by one with supplied amounts
            let mut settled_num = 0;
            let mut settled_pools = [(false, false); TokenPair::MAX_POOLS];
            for (idx, pool) in pools.iter_mut().enumerate() {
                let mut settled = 0;
                let mut received = 0;
                if outstanding_a[idx] != 0 {
                    (settled, received) = self.settle_side_with_supply(
                        &mut pool.sell_side,
                        MatchingSide::Sell,
                        std::cmp::min(pool_amount_out, outstanding_a[idx]),
                        supply_amount_in,
                        exchange_rate,
                    )?;
                    outstanding_a[idx] = math::checked_sub(outstanding_a[idx], settled)?;
                    settled_pools[idx].0 = true;
                    settled_num = math::checked_add(settled_num, 1)?;
                } else if outstanding_b[idx] != 0 {
                    (settled, received) = self.settle_side_with_supply(
                        &mut pool.buy_side,
                        MatchingSide::Buy,
                        std::cmp::min(pool_amount_out, outstanding_b[idx]),
                        supply_amount_in,
                        exchange_rate,
                    )?;
                    outstanding_b[idx] = math::checked_sub(outstanding_b[idx], settled)?;
                    settled_pools[idx].1 = true;
                    settled_num = math::checked_add(settled_num, 1)?;
                }
                pool_amount_out = math::checked_sub(pool_amount_out, settled)?;
                supply_amount_in = math::checked_sub(supply_amount_in, received)?;
                if pool_amount_out == 0 || supply_amount_in == 0 {
                    // account for possible rounding error
                    if supply_amount_in > 0 {
                        let leftover = math::checked_ceil_div(supply_amount_in, settled_num)?;
                        for (idx, pool) in pools.iter_mut().enumerate() {
                            let balance_change = std::cmp::min(supply_amount_in, leftover);
                            if balance_change != 0 {
                                if settled_pools[idx].0 {
                                    pool.sell_side.target_balance = math::checked_add(
                                        pool.sell_side.target_balance,
                                        balance_change,
                                    )?;
                                    supply_amount_in =
                                        math::checked_sub(supply_amount_in, balance_change)?;
                                } else if settled_pools[idx].1 {
                                    pool.buy_side.target_balance = math::checked_add(
                                        pool.buy_side.target_balance,
                                        balance_change,
                                    )?;
                                    supply_amount_in =
                                        math::checked_sub(supply_amount_in, balance_change)?;
                                }
                            } else {
                                break;
                            }
                        }
                        require!(
                            pool_amount_out == 0 && supply_amount_in == 0,
                            TwammError::SettlementError
                        );
                    }
                    break;
                }
            }
        }

        // write stats
        for (idx, pool) in pools.iter_mut().enumerate() {
            pool.sell_side.settlement_debt_total = outstanding_a[idx];
            pool.sell_side.last_balance_change_time = current_time;
            pool.buy_side.settlement_debt_total = outstanding_b[idx];
            pool.buy_side.last_balance_change_time = current_time;
        }

        if res.settlement_side == MatchingSide::Sell {
            res.total_amount_settled_a = math::checked_add(
                math::checked_sub(total_outstanding_a, net_outstanding_a)?,
                res.net_amount_settled,
            )?;
            res.total_amount_settled_b = math::checked_sub(total_outstanding_b, net_outstanding_b)?;
        } else {
            res.total_amount_settled_a = math::checked_sub(total_outstanding_a, net_outstanding_a)?;
            res.total_amount_settled_b = math::checked_add(
                math::checked_sub(total_outstanding_b, net_outstanding_b)?,
                res.net_amount_settled,
            )?;
        }

        Ok(res)
    }

    fn settle_sides(
        &self,
        sell_side: &mut PoolSide,
        buy_side: &mut PoolSide,
        outstanding_sell: u64,
        outstanding_buy: u64,
        exchange_rate: OraclePrice,
    ) -> Result<(u64, u64)> {
        if outstanding_sell == 0 || outstanding_buy == 0 {
            return Ok((0, 0));
        }

        // find matching amounts
        assert!(outstanding_sell <= sell_side.source_balance);
        assert!(outstanding_buy <= buy_side.source_balance);
        let expected_buy = self.get_token_b_amount(outstanding_sell, exchange_rate)?;

        let (matching_sell, matching_buy) = if expected_buy <= outstanding_buy {
            (outstanding_sell, expected_buy)
        } else {
            (
                std::cmp::min(
                    outstanding_sell,
                    self.get_token_a_amount(outstanding_buy, exchange_rate)?,
                ),
                outstanding_buy,
            )
        };
        if matching_sell == 0 || matching_buy == 0 {
            return Ok((0, 0));
        }

        // update balances
        sell_side.source_balance = math::checked_sub(sell_side.source_balance, matching_sell)?;
        sell_side.target_balance = math::checked_add(sell_side.target_balance, matching_buy)?;
        buy_side.source_balance = math::checked_sub(buy_side.source_balance, matching_buy)?;
        buy_side.target_balance = math::checked_add(buy_side.target_balance, matching_sell)?;

        // update stats
        let exchange_rate_f64 = exchange_rate.checked_as_f64()?;
        sell_side.weighted_fills_sum +=
            math::checked_float_mul(matching_sell as f64, exchange_rate_f64)?;
        sell_side.fills_volume = math::checked_add(sell_side.fills_volume, matching_sell)?;
        if sell_side.min_fill_price == 0.0 || exchange_rate_f64 < sell_side.min_fill_price {
            sell_side.min_fill_price = exchange_rate_f64;
        }
        if sell_side.max_fill_price == 0.0 || exchange_rate_f64 > sell_side.max_fill_price {
            sell_side.max_fill_price = exchange_rate_f64;
        }

        buy_side.weighted_fills_sum +=
            math::checked_float_mul(matching_buy as f64, exchange_rate_f64)?;
        buy_side.fills_volume = math::checked_add(buy_side.fills_volume, matching_buy)?;
        if buy_side.min_fill_price == 0.0 || exchange_rate_f64 < buy_side.min_fill_price {
            buy_side.min_fill_price = exchange_rate_f64;
        }
        if buy_side.max_fill_price == 0.0 || exchange_rate_f64 > buy_side.max_fill_price {
            buy_side.max_fill_price = exchange_rate_f64;
        }

        Ok((matching_sell, matching_buy))
    }

    fn settle_side_with_supply(
        &self,
        side: &mut PoolSide,
        settlement_side: MatchingSide,
        outstanding_sell: u64,
        supply_amount: u64,
        exchange_rate: OraclePrice,
    ) -> Result<(u64, u64)> {
        if outstanding_sell == 0 || supply_amount == 0 {
            return Ok((0, 0));
        }

        // find matching amounts
        assert!(outstanding_sell <= side.source_balance);
        let expected_buy = if settlement_side == MatchingSide::Sell {
            self.get_token_b_amount(outstanding_sell, exchange_rate)?
        } else {
            self.get_token_a_amount(outstanding_sell, exchange_rate)?
        };

        let (matching_sell, matching_buy) = if expected_buy <= supply_amount {
            (outstanding_sell, expected_buy)
        } else {
            (
                if settlement_side == MatchingSide::Sell {
                    self.get_token_a_amount(supply_amount, exchange_rate)?
                } else {
                    self.get_token_b_amount(supply_amount, exchange_rate)?
                },
                supply_amount,
            )
        };
        if matching_sell == 0 || matching_buy == 0 {
            return Ok((0, 0));
        }

        // update balances
        side.source_balance = math::checked_sub(side.source_balance, matching_sell)?;
        side.target_balance = math::checked_add(side.target_balance, matching_buy)?;

        // update stats
        let exchange_rate_f64 = exchange_rate.checked_as_f64()?;
        side.weighted_fills_sum +=
            math::checked_float_mul(matching_sell as f64, exchange_rate_f64)?;
        side.fills_volume = math::checked_add(side.fills_volume, matching_sell)?;
        if side.min_fill_price == 0.0 || exchange_rate_f64 < side.min_fill_price {
            side.min_fill_price = exchange_rate_f64;
        }
        if side.max_fill_price == 0.0 || exchange_rate_f64 > side.max_fill_price {
            side.max_fill_price = exchange_rate_f64;
        }

        Ok((matching_sell, matching_buy))
    }
}

#[cfg(test)]
mod test {
    use super::*;

    fn get_fixture() -> (TokenPair, Pool) {
        let mut token_pair = TokenPair::default();
        token_pair.config_a.decimals = 9;
        token_pair.config_b.decimals = 6;
        token_pair.inception_time = 135;

        let pool = Pool {
            time_in_force: 300,
            expiration_time: 300,
            ..Default::default()
        };

        (token_pair, pool)
    }

    #[test]
    fn settle_test_1() {
        let (token_pair, mut pool) = get_fixture();
        pool.buy_side.source_balance = 40000;

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Sell,
                20010,
                600,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                135,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 600,
                net_amount_required: 20000,
                source_amount_received: 20010,
                total_amount_settled_a: 0,
                total_amount_settled_b: 600,
                settlement_side: MatchingSide::Buy,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Sell,
                20010,
                600,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                135,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 600,
                net_amount_required: 19400,
                source_amount_received: 20010,
                total_amount_settled_a: 0,
                total_amount_settled_b: 600,
                settlement_side: MatchingSide::Buy,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Sell,
                20010,
                600,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                300,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 600,
                net_amount_required: 38800,
                source_amount_received: 20010,
                total_amount_settled_a: 0,
                total_amount_settled_b: 600,
                settlement_side: MatchingSide::Buy,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Sell,
                20010,
                600,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                300,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 600,
                net_amount_required: 38200,
                source_amount_received: 20010,
                total_amount_settled_a: 0,
                total_amount_settled_b: 600,
                settlement_side: MatchingSide::Buy,
            },
            res
        );
    }

    #[test]
    fn settle_test_2() {
        let (token_pair, mut pool) = get_fixture();
        pool.buy_side.source_balance = 40000;

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Sell,
                1000000,
                30000,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                135,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 20000,
                net_amount_required: 20000,
                source_amount_received: 666666,
                total_amount_settled_a: 0,
                total_amount_settled_b: 20000,
                settlement_side: MatchingSide::Buy,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Sell,
                1000000,
                30000,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                135,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 0,
                net_amount_required: 0,
                source_amount_received: 0,
                total_amount_settled_a: 0,
                total_amount_settled_b: 0,
                settlement_side: MatchingSide::Internal,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Sell,
                1000000,
                30000,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                300,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 20000,
                net_amount_required: 20000,
                source_amount_received: 666666,
                total_amount_settled_a: 0,
                total_amount_settled_b: 20000,
                settlement_side: MatchingSide::Buy,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Sell,
                1000000,
                30000,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                300,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 0,
                net_amount_required: 0,
                source_amount_received: 0,
                total_amount_settled_a: 0,
                total_amount_settled_b: 0,
                settlement_side: MatchingSide::Internal,
            },
            res
        );
    }

    #[test]
    fn settle_test_3() {
        let (token_pair, mut pool) = get_fixture();
        pool.buy_side.source_balance = 40000;

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Buy,
                20010,
                600,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                135,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 0,
                net_amount_required: 20000,
                source_amount_received: 0,
                total_amount_settled_a: 0,
                total_amount_settled_b: 0,
                settlement_side: MatchingSide::Buy,
            },
            res
        );
    }

    #[test]
    fn settle_test_4() {
        let (token_pair, mut pool) = get_fixture();
        pool.sell_side.source_balance = 40000;

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Buy,
                15000,
                451,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                135,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 15000,
                net_amount_required: 20000,
                source_amount_received: 451,
                total_amount_settled_a: 15000,
                total_amount_settled_b: 0,
                settlement_side: MatchingSide::Sell,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Buy,
                20000,
                601,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                135,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 5000,
                net_amount_required: 5000,
                source_amount_received: 150,
                total_amount_settled_a: 5000,
                total_amount_settled_b: 0,
                settlement_side: MatchingSide::Sell,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Buy,
                20000,
                601,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                300,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 20000,
                net_amount_required: 20000,
                source_amount_received: 601,
                total_amount_settled_a: 20000,
                total_amount_settled_b: 0,
                settlement_side: MatchingSide::Sell,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Buy,
                20000,
                601,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                300,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 0,
                net_amount_required: 0,
                source_amount_received: 0,
                total_amount_settled_a: 0,
                total_amount_settled_b: 0,
                settlement_side: MatchingSide::Internal,
            },
            res
        );
    }

    #[test]
    fn settle_test_5() {
        let (token_pair, mut pool) = get_fixture();
        pool.sell_side.source_balance = 40000;

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Buy,
                1000000,
                30000,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                108,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 16000,
                net_amount_required: 16000,
                source_amount_received: 480,
                total_amount_settled_a: 16000,
                total_amount_settled_b: 0,
                settlement_side: MatchingSide::Sell,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Buy,
                1000000,
                30000,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                135,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 4000,
                net_amount_required: 4000,
                source_amount_received: 120,
                total_amount_settled_a: 4000,
                total_amount_settled_b: 0,
                settlement_side: MatchingSide::Sell,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Buy,
                1000000,
                30000,
                OraclePrice::new(3000, -2),
                OraclePrice::new(300, -1),
                135,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 0,
                net_amount_required: 0,
                source_amount_received: 0,
                total_amount_settled_a: 0,
                total_amount_settled_b: 0,
                settlement_side: MatchingSide::Internal,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Buy,
                1000000,
                30000,
                OraclePrice::new(3000, -2),
                OraclePrice::new(300, -1),
                300,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 20000,
                net_amount_required: 20000,
                source_amount_received: 600,
                total_amount_settled_a: 20000,
                total_amount_settled_b: 0,
                settlement_side: MatchingSide::Sell,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Buy,
                1000000,
                30000,
                OraclePrice::new(3000, -2),
                OraclePrice::new(300, -1),
                300,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 0,
                net_amount_required: 0,
                source_amount_received: 0,
                total_amount_settled_a: 0,
                total_amount_settled_b: 0,
                settlement_side: MatchingSide::Internal,
            },
            res
        );
    }

    #[test]
    fn settle_test_6() {
        let (token_pair, mut pool) = get_fixture();
        pool.sell_side.source_balance = 40000;

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Sell,
                20000,
                601,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                135,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 0,
                net_amount_required: 20000,
                source_amount_received: 0,
                total_amount_settled_a: 0,
                total_amount_settled_b: 0,
                settlement_side: MatchingSide::Sell,
            },
            res
        );
    }

    #[test]
    fn settle_test_7() {
        let (token_pair, mut pool) = get_fixture();
        pool.buy_side.source_balance = 40000;

        let mut pool2 = Pool {
            time_in_force: 600,
            expiration_time: 600,
            ..Default::default()
        };
        pool2.buy_side.source_balance = 40000;

        let res = token_pair
            .settle_pools(
                &mut [&mut pool, &mut pool2],
                MatchingSide::Sell,
                20010,
                600,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                135,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 600,
                net_amount_required: 29473,
                source_amount_received: 20010,
                total_amount_settled_a: 0,
                total_amount_settled_b: 600,
                settlement_side: MatchingSide::Buy,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool, &mut pool2],
                MatchingSide::Sell,
                2000000,
                60000,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                135,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 28873,
                net_amount_required: 28873,
                source_amount_received: 962433,
                total_amount_settled_a: 0,
                total_amount_settled_b: 28873,
                settlement_side: MatchingSide::Buy,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool, &mut pool2],
                MatchingSide::Sell,
                2000000,
                60000,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                135,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 0,
                net_amount_required: 0,
                source_amount_received: 0,
                total_amount_settled_a: 0,
                total_amount_settled_b: 0,
                settlement_side: MatchingSide::Internal,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool, &mut pool2],
                MatchingSide::Sell,
                20010,
                600,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                300,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 600,
                net_amount_required: 31579,
                source_amount_received: 20010,
                total_amount_settled_a: 0,
                total_amount_settled_b: 600,
                settlement_side: MatchingSide::Buy,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool, &mut pool2],
                MatchingSide::Sell,
                2000000,
                60000,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                300,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 30979,
                net_amount_required: 30979,
                source_amount_received: 1032633,
                total_amount_settled_a: 0,
                total_amount_settled_b: 30979,
                settlement_side: MatchingSide::Buy,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool, &mut pool2],
                MatchingSide::Sell,
                2000000,
                60000,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                300,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 0,
                net_amount_required: 0,
                source_amount_received: 0,
                total_amount_settled_a: 0,
                total_amount_settled_b: 0,
                settlement_side: MatchingSide::Internal,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool, &mut pool2],
                MatchingSide::Sell,
                20010,
                600,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                450,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 600,
                net_amount_required: 10526,
                source_amount_received: 20010,
                total_amount_settled_a: 0,
                total_amount_settled_b: 600,
                settlement_side: MatchingSide::Buy,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool, &mut pool2],
                MatchingSide::Sell,
                20010,
                600,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                1200,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 600,
                net_amount_required: 18348,
                source_amount_received: 20010,
                total_amount_settled_a: 0,
                total_amount_settled_b: 600,
                settlement_side: MatchingSide::Buy,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool, &mut pool2],
                MatchingSide::Sell,
                2000000,
                60000,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                1200,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 17748,
                net_amount_required: 17748,
                source_amount_received: 591600,
                total_amount_settled_a: 0,
                total_amount_settled_b: 17748,
                settlement_side: MatchingSide::Buy,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool, &mut pool2],
                MatchingSide::Sell,
                2000000,
                60000,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                1200,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 0,
                net_amount_required: 0,
                source_amount_received: 0,
                total_amount_settled_a: 0,
                total_amount_settled_b: 0,
                settlement_side: MatchingSide::Internal,
            },
            res
        );
    }

    #[test]
    fn settle_test_8() {
        let (token_pair, mut pool) = get_fixture();
        pool.buy_side.source_balance = 600;
        pool.sell_side.source_balance = 20000;

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Buy,
                0,
                0,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                135,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 0,
                net_amount_required: 0,
                source_amount_received: 0,
                total_amount_settled_a: 10000,
                total_amount_settled_b: 300,
                settlement_side: MatchingSide::Internal,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Buy,
                0,
                0,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                135,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 0,
                net_amount_required: 0,
                source_amount_received: 0,
                total_amount_settled_a: 0,
                total_amount_settled_b: 0,
                settlement_side: MatchingSide::Internal,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool],
                MatchingSide::Buy,
                0,
                0,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                300,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 0,
                net_amount_required: 0,
                source_amount_received: 0,
                total_amount_settled_a: 10000,
                total_amount_settled_b: 300,
                settlement_side: MatchingSide::Internal,
            },
            res
        );
    }

    #[test]
    fn settle_test_9() {
        let (token_pair, mut pool) = get_fixture();
        pool.buy_side.source_balance = 600;

        let mut pool2 = Pool {
            time_in_force: 600,
            expiration_time: 600,
            ..Default::default()
        };
        pool2.sell_side.source_balance = 42225;

        let res = token_pair
            .settle_pools(
                &mut [&mut pool, &mut pool2],
                MatchingSide::Buy,
                0,
                0,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                135,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 0,
                net_amount_required: 0,
                source_amount_received: 0,
                total_amount_settled_a: 10000,
                total_amount_settled_b: 300,
                settlement_side: MatchingSide::Internal,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool, &mut pool2],
                MatchingSide::Buy,
                0,
                0,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                135,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 0,
                net_amount_required: 0,
                source_amount_received: 0,
                total_amount_settled_a: 0,
                total_amount_settled_b: 0,
                settlement_side: MatchingSide::Internal,
            },
            res
        );

        let res = token_pair
            .settle_pools(
                &mut [&mut pool, &mut pool2],
                MatchingSide::Buy,
                2223,
                67,
                OraclePrice::new(300, -1),
                OraclePrice::new(3000, -2),
                300,
            )
            .unwrap();

        assert_eq!(
            Settlement {
                net_amount_settled: 2223,
                net_amount_required: 2223,
                source_amount_received: 67,
                total_amount_settled_a: 12223,
                total_amount_settled_b: 300,
                settlement_side: MatchingSide::Sell,
            },
            res
        );
    }

    #[test]
    fn test_get_token_pair_oracle_price() {
        let oracle_price1 = OraclePrice {
            price: 4004,
            exponent: -10,
        };

        let oracle_price2 = OraclePrice {
            price: 100001000,
            exponent: -8,
        };

        let pair_price = oracle_price1.checked_div(&oracle_price2).unwrap();
        assert_eq!(
            pair_price,
            OraclePrice {
                price: 40039,
                exponent: -11
            }
        );
    }
}
