declare type OrderTypeStruct = { sell: {} } & { buy: {} };

declare type PoolStatusStruct = { expired: {} } & { inactive: {} } & {
  active: {};
};

declare type TIF = number;

declare type TIFIndex = number;

declare module "@twamm/types" {
  import type { BN } from "bn.js";

  export type Counter = BN;

  export type Order = {
    bump: number;
    lastBalanceChangeTime: BN;
    lpBalance: BN;
    owner: PublicKey;
    pool: PublicKey;
    settlementDebt: BN;
    side: OrderTypeStruct;
    time: BN;
    tokenDebt: BN;
    unsettledBalance: BN;
  };

  export type OrderExt = Order & { pubkey: PublicKey };

  export type PoolTradeSide = {
    fillsVolume: BN;
    lastBalanceChangeTime: BN;
    lpSupply: BN;
    maxFillPrice: number;
    minFillPrice: number;
    numTraders: BN;
    settlementDebtTotal: BN;
    sourceBalance: BN;
    targetBalance: BN;
    tokenDebtTotal: BN;
    weightedFillsSum: number;
  };

  export type Pool = {
    bump: number;
    buySide: PoolTradeSide;
    counter: BN;
    expirationTime: BN;
    sellSide: PoolTradeSide;
    status: PoolStatusStruct;
    timeInForce: TIF;
    tokenPair: PublicKey;
  };

  export type TokenPairConfig = {
    crankReward: BN;
    custody: PublicKey;
    decimals: number;
    maxOraclePriceAgeSec: number;
    maxOraclePriceError: number;
    minSwapAmount: BN;
    mint: PublicKey;
    oracleAccount: PublicKey;
    oracleType: { pyth: {} };
  };

  export type TokenPairStats = {
    feesCollected: BN;
    orderVolumeUsd: number;
    pendingWithdrawals: BN;
    routedVolumeUsd: number;
    settledVolumeUsd: number;
  };

  export type TokenPair = {
    allowCranks: true;
    allowDeposits: boolean;
    allowSettlements: boolean;
    allowWithdrawals: boolean;
    configA: TokenPairConfig;
    configB: TokenPairConfig;
    crankAuthority: PublicKey;
    currentPoolPresent: boolean[];
    feeDenominator: BN;
    feeNumerator: BN;
    futurePoolPresent: boolean[];
    inceptionTime: BN;
    maxSwapPriceDiff: number;
    maxUnsettledAmount: number;
    minTimeTillExpiration: number;
    poolCounters: BN[];
    settleFeeDenominator: BN;
    settleFeeNumerator: BN;
    statsA: TokenPairStats;
    statsB: TokenPairStats;
    tifs: TIF[];
    tokenPairBump: number;
    transferAuthorityBump: number;
  };
}
