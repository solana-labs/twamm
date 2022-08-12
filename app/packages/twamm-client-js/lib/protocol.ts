import type { BN } from "@project-serum/anchor";
import type { Order, Pool, PoolTradeSide, TokenPair } from "@twamm/types";
import { lensPath, view } from "ramda";

export const withdrawAmount = (
  lpBalance: number | BN,
  poolSide: PoolTradeSide,
  order: { side: OrderTypeStruct; lpBalance: BN; tokenDebt: BN },
  tokenPair: TokenPair
) => {
  const amount = Number(lpBalance);
  const orderAmount = Number(order.lpBalance);
  const orderTokenDebt = Number(order.tokenDebt);
  const poolSource = Number(poolSide.sourceBalance);
  const poolSupply = Number(poolSide.lpSupply);
  const poolTarget = Number(poolSide.targetBalance);
  const poolTokenDebt = Number(poolSide.tokenDebtTotal);
  const numerator = Number(tokenPair.feeNumerator);
  const denominator = Number(tokenPair.feeDenominator);

  const amountSource = (amount * poolSource) / poolSupply;

  let amountTarget = (amount * (poolTarget + poolTokenDebt)) / poolSupply;

  const tokenDebtRemoved = (orderTokenDebt * amount) / orderAmount;

  if (amountTarget > tokenDebtRemoved) {
    amountTarget -= tokenDebtRemoved;
  } else {
    amountTarget = 0;
  }

  const amountFees = (amountTarget * numerator) / denominator;

  const isSelling = order.side.sell !== undefined;

  const [withdrawAmountA, withdrawAmountB] = isSelling
    ? [amountSource, amountTarget - amountFees]
    : [amountTarget - amountFees, amountSource];

  return [withdrawAmountA, withdrawAmountB];
};

export const filledQuantity = (pair: TokenPair, pool: Pool, order: Order) => {
  const decimals = lensPath(["decimals"]);
  const selling = Boolean(order.side.sell);

  const poolTradeData = selling ? pool.sellSide : pool.buySide;

  const withdraw = withdrawAmount(
    order.lpBalance,
    poolTradeData,
    {
      side: order.side,
      lpBalance: order.lpBalance,
      tokenDebt: order.tokenDebt,
    },
    pair
  );

  const filledBalance =
    Number(order.unsettledBalance) - withdraw[selling ? 0 : 1];

  const d = selling
    ? view(decimals, pair.configA)
    : view(decimals, pair.configB);

  return filledBalance / 10 ** d;
};

export const quantity = (pair: TokenPair, order: Order) => {
  const decimals = lensPath(["decimals"]);
  const selling = Boolean(order.side.sell);

  const d = selling
    ? view(decimals, pair.configA)
    : view(decimals, pair.configB);

  return Number(order.unsettledBalance) / 10 ** d;
};
