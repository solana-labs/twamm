import type { Order, Pool, TokenPair } from "@twamm/types";
import { BN } from "@project-serum/anchor";
import { lensPath, pipe, set } from "ramda";
import { quantity, filledQuantity } from "../lib/protocol";

describe("client.js | protocol", () => {
  const pair = {
    feeNumerator: new BN(0),
    feeDenominator: new BN(10),
    configA: {
      decimals: 6,
    },
    configB: {
      decimals: 6,
    },
  } as TokenPair;

  const pool = {
    sellSide: {
      lpSupply: new BN(1),
      sourceBalance: new BN(0),
      targetBalance: new BN(0),
      tokenDebtTotal: new BN(0),
    },
    buySide: {
      lpSupply: new BN(1),
      sourceBalance: new BN(0),
      targetBalance: new BN(0),
      tokenDebtTotal: new BN(0),
    },
  } as Pool;

  const order = {
    lpBalance: new BN(0),
    side: { sell: {} },
    tokenDebt: new BN(0),
    unsettledBalance: new BN(0),
  } as Order;

  it("should calc quantity", () => {
    const makeOrder = (q: number) =>
      set(lensPath(["unsettledBalance"]), new BN(q), order);

    expect(quantity(pair, makeOrder(0))).toEqual(0);
    expect(quantity(pair, makeOrder(100000))).toEqual(0.1);
  });

  it("should calc filledQuantity", () => {
    const makePool = (sb: number, lp: number, tb: number, d: number) =>
      pipe(
        set(lensPath(["buySide", "sourceBalance"]), new BN(sb)),
        set(lensPath(["buySide", "lpSupply"]), new BN(lp)),
        set(lensPath(["buySide", "targetBalance"]), new BN(tb)),
        set(lensPath(["buySide", "tokenDebtTotal"]), new BN(d))
      )(pool);

    const makeOrder = (
      lp: number,
      q: number,
      td: number,
      side: OrderTypeStruct
    ) =>
      pipe(
        set(lensPath(["lpBalance"]), new BN(lp)),
        set(lensPath(["unsettledBalance"]), new BN(q)),
        set(lensPath(["tokenDebt"]), td),
        set(lensPath(["side"]), side)
      )(order);

    expect(filledQuantity(pair, pool, order)).toEqual(0);

    expect(
      filledQuantity(
        pair,
        makePool(0, 10000, 456127, 0),
        // @ts-expect-error
        makeOrder(10000, 10000, 0, { buy: {} })
      )
    ).toEqual(0.01);
  });
});
