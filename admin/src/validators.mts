import * as t from "io-ts";
import { either } from "fp-ts";
import { PublicKey } from "@solana/web3.js";
import BN from "./utils/bn.mts";
import * as types from "./types.mts";
import { getTime, populateSigners, resolveNegative } from "./utils/index.mts";

type TokenPairParams = { tokenPair: string };

const token_pair_opts = (
  params: TokenPairParams,
  scheme = types.TokenPairOpts
) => {
  const dOptions = scheme.decode({
    tokenPair: new PublicKey(params.tokenPair),
  });

  if (either.isLeft(dOptions)) {
    throw new Error("Invalid options");
  }

  return dOptions.right;
};

export const delete_test_pair_opts = (params: {
  tokenPair: string;
  receiver: string;
}) => {
  const dOptions = types.DeleteTestPairOpts.decode({
    tokenPair: new PublicKey(params.tokenPair),
    receiver: new PublicKey(params.receiver),
  });

  if (either.isLeft(dOptions)) {
    throw new Error("Invalid options");
  }

  return dOptions.right;
};

export const delete_test_pool_opts = (params: {
  nextPool: string;
  timeInForce: string;
  tokenPair: string;
}) => {
  if (!["true", "false"].includes(params.nextPool)) {
    throw new Error("Invalid nextPool");
  }

  const dOptions = types.DeleteTestPoolOpts.decode({
    nextPool: params.nextPool === "true",
    timeInForce: Number(params.timeInForce),
    tokenPair: new PublicKey(params.tokenPair),
  });

  if (either.isLeft(dOptions) || isNaN(dOptions.right.timeInForce)) {
    throw new Error("Invalid options");
  }

  return dOptions.right;
};

export const get_outstanding_amount_opts = (p: { tokenPair: string }) =>
  token_pair_opts(p, types.GetOutstandingAmountOpts);

export const init = (params: { minSignatures: string }) => {
  const dOptions = types.InitOpts.decode({
    minSignatures: Number(params.minSignatures),
  });

  if (either.isLeft(dOptions) || isNaN(dOptions.right.minSignatures)) {
    throw new Error("Invalid minSignatures");
  }

  return dOptions.right;
};

/// list_orders

export const list_orders_opts = (params: {
  tokenPair?: string;
  wallet?: string;
}): t.TypeOf<typeof types.ListOrdersOpts> => {
  const dOptions = types.ListOrdersOpts.decode({
    tokenPair: params.tokenPair ? new PublicKey(params.tokenPair) : undefined,
    wallet: params.wallet ? new PublicKey(params.wallet) : undefined,
  });

  if (either.isLeft(dOptions)) {
    throw new Error("Invalid options");
  }

  return dOptions.right;
};

/// list_pools

export const list_pools_opts = (params: {
  tokenPair?: string;
}): t.TypeOf<typeof types.ListPoolsOpts> => {
  const dOptions = types.ListPoolsOpts.decode({
    tokenPair: params.tokenPair ? new PublicKey(params.tokenPair) : undefined,
  });

  if (either.isLeft(dOptions)) {
    throw new Error("Invalid options");
  }

  return dOptions.right;
};

/// list_token_pairs

export const list_token_pairs_opts = (params: {
  mint?: string;
}): t.TypeOf<typeof types.ListTokenPairsOpts> => {
  if (!params.mint) {
    return { mint: undefined };
  }

  const dOptions = types.ListTokenPairsOpts.decode({
    mint: new PublicKey(params.mint),
  });

  if (either.isLeft(dOptions)) {
    throw new Error("Invalid options");
  }

  return dOptions.right;
};

export const set_admin_signers = (params: { minSignatures: string }) => {
  const dOptions = types.SetAdminSignersOpts.decode({
    minSignatures: Number(params.minSignatures),
  });

  if (either.isLeft(dOptions) || isNaN(dOptions.right.minSignatures)) {
    throw new Error("Invalid minSignatures");
  }

  return dOptions.right;
};

export const set_crank_authority_opts = (p: { tokenPair: string }) =>
  token_pair_opts(p, types.SetCrankAuthorityOpts);

export const set_crank_authority = (params: { pubkey: string }) => {
  const dParams = types.SetCrankAuthorityParams.decode({
    crankAuthority: new PublicKey(params.pubkey),
  });

  if (either.isLeft(dParams)) {
    throw new Error("Invalid SetCrankAuthority params");
  }

  return dParams.right;
};

export const set_fees_opts = (p: { tokenPair: string }) =>
  token_pair_opts(p, types.SetFeesOpts);

export const set_fees = (params: t.TypeOf<typeof types.FeeParamsRaw>) => {
  const dParamsRaw = types.FeeParamsRaw.decode(params);

  if (either.isLeft(dParamsRaw)) {
    throw new Error("Invalid params");
  }

  const dParams = types.SetFeesParams.decode({
    feeNumerator: new BN(params.feeNumerator),
    feeDenominator: new BN(params.feeDenominator),
    settleFeeNumerator: new BN(params.settleFeeNumerator),
    settleFeeDenominator: new BN(params.settleFeeDenominator),
    crankRewardTokenA: new BN(params.crankRewardTokenA),
    crankRewardTokenB: new BN(params.crankRewardTokenB),
  });

  if (either.isLeft(dParams)) {
    throw new Error("Invalid SetFees params");
  }

  return dParams.right;
};

export const set_limits_opts = (p: { tokenPair: string }) =>
  token_pair_opts(p, types.SetLimitsOpts);

export const set_limits = (params: t.TypeOf<typeof types.LimitsParams>) => {
  const dParams = types.SetLimitsParams.decode({
    minSwapAmountTokenA: new BN(params.minSwapAmountTokenA),
    minSwapAmountTokenB: new BN(params.minSwapAmountTokenB),
    maxSwapPriceDiff: Number(params.maxSwapPriceDiff),
    maxUnsettledAmount: Number(params.maxUnsettledAmount),
    minTimeTillExpiration: Number(params.minTimeTillExpiration),
  });

  if (
    either.isLeft(dParams) ||
    isNaN(dParams.right.maxSwapPriceDiff) ||
    isNaN(dParams.right.maxUnsettledAmount) ||
    isNaN(dParams.right.minTimeTillExpiration)
  ) {
    throw new Error("Invalid SetLimits params");
  }

  return dParams.right;
};

export const set_oracle_config_opts = (p: { tokenPair: string }) =>
  token_pair_opts(p, types.SetOracleConfigOpts);

export const set_oracle_config = (
  params: t.TypeOf<typeof types.OracleConfigParams>
) => {
  const dParamsRaw = types.OracleConfigParams.decode(params);

  if (either.isLeft(dParamsRaw)) {
    throw new Error("Invalid params");
  }

  const oracleTypes = ["none", "test", "pyth"];
  if (
    !oracleTypes.includes(params.oracleTypeTokenA) ||
    !oracleTypes.includes(params.oracleTypeTokenB)
  ) {
    throw new Error("Invalid oracle type");
  }

  const setOracleType = (type: string) => ({ [type]: {} });

  const dParams = types.SetOracleConfigParams.decode({
    maxOraclePriceErrorTokenA: Number(params.maxOraclePriceErrorTokenA),
    maxOraclePriceErrorTokenB: Number(params.maxOraclePriceErrorTokenB),
    maxOraclePriceAgeSecTokenA: Number(params.maxOraclePriceAgeSecTokenA),
    maxOraclePriceAgeSecTokenB: Number(params.maxOraclePriceAgeSecTokenB),
    oracleTypeTokenA: setOracleType(params.oracleTypeTokenA),
    oracleTypeTokenB: setOracleType(params.oracleTypeTokenB),
    oracleAccountTokenA: new PublicKey(params.oracleAccountTokenA),
    oracleAccountTokenB: new PublicKey(params.oracleAccountTokenB),
  });

  if (
    either.isLeft(dParams) ||
    isNaN(dParams.right.maxOraclePriceErrorTokenA) ||
    isNaN(dParams.right.maxOraclePriceErrorTokenB) ||
    isNaN(dParams.right.maxOraclePriceAgeSecTokenA) ||
    isNaN(dParams.right.maxOraclePriceAgeSecTokenB)
  ) {
    throw new Error("Invalid SetOracleConfig params");
  }

  return dParams.right;
};

export const set_permissions = (
  params: t.TypeOf<typeof types.PermissionsParams>
) => {
  const dParams = types.SetPermissionsParams.decode({
    allowDeposits: params.allowDeposits === "true",
    allowWithdrawals: params.allowWithdrawals === "true",
    allowCranks: params.allowCranks === "true",
    allowSettlements: params.allowSettlements === "true",
  });

  if (either.isLeft(dParams)) {
    throw new Error("Invalid SetPermissions params");
  }

  return dParams.right;
};

export const set_permissions_opts = (p: { tokenPair: string }) =>
  token_pair_opts(p, types.SetPermissionsOpts);

/// Set test oracle price

export const set_test_oracle_price = (
  params: t.TypeOf<typeof types.TestOraclePriceParams>
) => {
  const dParams = types.SetTestOraclePriceParams.decode({
    priceTokenA: new BN(params.priceTokenA),
    priceTokenB: new BN(params.priceTokenB),
    expoTokenA: Number(resolveNegative(params.expoTokenA)),
    expoTokenB: Number(resolveNegative(params.expoTokenB)),
    confTokenA: new BN(params.confTokenA),
    confTokenB: new BN(params.confTokenB),
    publishTimeTokenA: new BN(getTime()),
    publishTimeTokenB: new BN(getTime()),
  });

  if (
    either.isLeft(dParams) ||
    isNaN(dParams.right.expoTokenA) ||
    isNaN(dParams.right.expoTokenB)
  ) {
    throw new Error("Invalid SetTestOraclePrice params");
  }

  return dParams.right;
};

export const set_test_oracle_price_opts = (p: { tokenPair: string }) =>
  token_pair_opts(p, types.SetTestOraclePriceOpts);

/// Set test time

export const set_test_time_opts = (params: { tokenPair: string }) => {
  const dOptions = types.SetTestTimeOpts.decode({
    tokenPair: new PublicKey(params.tokenPair),
  });

  if (either.isLeft(dOptions)) {
    throw new Error("Invalid options");
  }

  return dOptions.right;
};

export const set_test_time = (
  params: t.TypeOf<typeof types.TestTimeParams>
) => {
  const dParams = types.SetTestTimeParams.decode({
    time: new BN(Number(resolveNegative(params.time))),
  });

  if (either.isLeft(dParams)) {
    throw new Error("Invalid SetTestTime params");
  }

  return dParams.right;
};

/// Set time in force

export const set_time_in_force = (params: {
  tifIndex: string;
  tif: string;
}) => {
  const dParams = types.SetTimeInForceParams.decode({
    timeInForceIndex: Number(params.tifIndex),
    newTimeInForce: Number(params.tif),
  });

  if (
    either.isLeft(dParams) ||
    isNaN(dParams.right.timeInForceIndex) ||
    isNaN(dParams.right.newTimeInForce)
  ) {
    throw new Error("Invalid SetTimeInForce params");
  }

  return dParams.right;
};

export const set_time_in_force_opts = (p: { tokenPair: string }) =>
  token_pair_opts(p, types.SetTimeInForceOpts);

/// Settle

export const settle_opts = (params: { tokenPair: string }) => {
  const dOptions = types.SettleOpts.decode({
    tokenPair: new PublicKey(params.tokenPair),
  });

  if (either.isLeft(dOptions)) {
    throw new Error("Invalid options");
  }

  return dOptions.right;
};

export const settle = (params: t.TypeOf<typeof types.Settle>) => {
  if (!["sell", "buy"].includes(params.supplySide)) {
    throw new Error("Invalid supply side");
  }

  let supplySide;
  if (params.supplySide === "sell") {
    supplySide = { sell: {} };
  } else if (params.supplySide === "buy") {
    supplySide = { buy: {} };
  }

  const dParams = types.SettleParams.decode({
    supplySide,
    maxTokenAmountIn: new BN(params.maxTokenAmountIn),
    minTokenAmountIn: new BN(params.minTokenAmountIn),
    worstExchangeRate: new BN(params.worstExchangeRate),
  });

  if (either.isLeft(dParams)) {
    throw new Error("Invalid Settle params");
  }

  return dParams.right;
};

/// Withdraw fees

export const withdraw_fees_opts = (params: {
  tokenPair: string;
  receiverKeys: string;
}) => {
  const addrs = params.receiverKeys.split(",");
  let receiverKeys;
  if (addrs.length === 1) {
    receiverKeys = new Array(3).fill(addrs[0]);
  } else if (addrs.length !== 3) {
    throw new Error(
      "Wrong number of receiver keys; it should be equal to 1 or 3"
    );
  } else {
    receiverKeys = addrs;
  }

  const dOptions = types.WithdrawFeesOpts.decode({
    tokenPair: new PublicKey(params.tokenPair),
    receiverKeys: populateSigners(receiverKeys),
  });

  if (either.isLeft(dOptions)) {
    throw new Error("Invalid options");
  }

  return dOptions.right;
};

export const withdraw_fees = (params: t.TypeOf<typeof types.FeesParams>) => {
  const dParams = types.WithdrawFeesParams.decode({
    amountTokenA: new BN(params.amountTokenA),
    amountTokenB: new BN(params.amountTokenB),
    amountSol: new BN(params.amountSol),
  });

  if (either.isLeft(dParams)) {
    throw new Error("Invalid WithdrawFees params");
  }

  return dParams.right;
};

// end of method validators

export const struct = {
  tokenPair: (config: {}) => {
    const dConfig = types.TokenPairRaw.decode(config);

    if (either.isLeft(dConfig)) {
      throw new Error("Invalid config");
    }

    let tokenPairConfig = dConfig.right;

    /**
     * We format the data at once to keep the logic one-piece
     */
    const dConfigOut = types.TokenPair.decode({
      ...tokenPairConfig,
      feeNumerator: new BN(tokenPairConfig.feeNumerator),
      feeDenominator: new BN(tokenPairConfig.feeDenominator),
      settleFeeNumerator: new BN(tokenPairConfig.settleFeeNumerator),
      settleFeeDenominator: new BN(tokenPairConfig.settleFeeDenominator),
      crankRewardTokenA: new BN(tokenPairConfig.crankRewardTokenA),
      crankRewardTokenB: new BN(tokenPairConfig.crankRewardTokenB),
      minSwapAmountTokenA: new BN(tokenPairConfig.minSwapAmountTokenA),
      minSwapAmountTokenB: new BN(tokenPairConfig.minSwapAmountTokenB),
      oracleAccountTokenA: new PublicKey(tokenPairConfig.oracleAccountTokenA),
      oracleAccountTokenB: new PublicKey(tokenPairConfig.oracleAccountTokenB),
      crankAuthority: new PublicKey(tokenPairConfig.crankAuthority),
    });

    if (either.isLeft(dConfigOut)) {
      throw new Error("Invalid TokenPair config");
    }

    return dConfigOut.right;
  },
};
