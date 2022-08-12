import type { PublicKey } from "@solana/web3.js";
import M from "easy-maybe/lib";
import useSWR from "swr";
import { view, lensPath } from "ramda";

import type { OrderRecord, PairConfig, PoolDetails } from "../types/decl.d";
import useJupTokensByMint from "./use-jup-tokens-by-mint";
import usePoolWithPair from "./use-pool-with-pair";

export default (poolAddress: PublicKey, order: OrderRecord["order"]) => {
  const details = usePoolWithPair(poolAddress);

  const mints = M.withDefault(
    undefined,
    M.andMap((pair) => {
      const mint = lensPath(["mint"]);
      return [
        view<PairConfig, PairConfig["mint"]>(mint, pair.configA),
        view<PairConfig, PairConfig["mint"]>(mint, pair.configB),
      ];
    }, M.of(details.data?.pair))
  );

  const tokens = useJupTokensByMint(mints);

  const isValid = poolAddress && details.data && tokens.data && order;
  return useSWR(
    isValid && ["poolDetails", poolAddress],
    async (): Promise<PoolDetails | undefined> => {
      if (!details.data) return undefined;
      if (!tokens.data) return undefined;

      const { side } = order;

      const { pool, pair } = details.data;

      const [a, b] = tokens.data;

      const { configA, configB, statsA, statsB } = pair;
      const { buySide, expirationTime, sellSide, status, timeInForce } = pool;

      const inceptionTime = expirationTime.toNumber() - timeInForce;

      const tradeSide = side.sell ? sellSide : buySide;
      const {
        fillsVolume,
        lastBalanceChangeTime,
        maxFillPrice,
        minFillPrice,
        weightedFillsSum,
      } = tradeSide;

      const coins = side.sell ? [a, b] : [b, a];

      const configs = side.sell ? [configA, configB] : [configB, configA];

      const supply = side.sell
        ? [
            sellSide.sourceBalance / 10 ** configs[0].decimals,
            sellSide.targetBalance / 10 ** configs[1].decimals,
          ]
        : [
            buySide.sourceBalance / 10 ** configs[0].decimals,
            buySide.targetBalance / 10 ** configs[1].decimals,
          ];

      const lastChanged = lastBalanceChangeTime.toNumber();
      const lastChangeTime = !lastChanged
        ? undefined
        : new Date(lastChanged * 1e3);

      const lpSupplyRaw = [
        sellSide.lpSupply.toNumber(),
        buySide.lpSupply.toNumber(),
      ];

      const prices = [
        Number(minFillPrice),
        Number(fillsVolume)
          ? Number(weightedFillsSum) / Number(fillsVolume)
          : -1,
        Number(maxFillPrice),
      ];

      return {
        aAddress: configA.mint,
        bAddress: configB.mint,
        expirationTime: new Date(expirationTime.toNumber() * 1e3),
        expired: Boolean(status.expired),
        inactive: Boolean(status.inactive),
        inceptionTime: new Date(inceptionTime * 1e3),
        lastBalanceChangeTime: lastChangeTime,
        lpAmount: Number(order.lpBalance),
        lpSupply: supply,
        lpSupplyRaw,
        lpSymbols: [coins[0].symbol, coins[1].symbol],
        order,
        poolAddress,
        prices,
        side,
        tokenPair: pair,
        tradeSide,
        volume: statsA.orderVolumeUsd + statsB.orderVolumeUsd,
      };
    }
  );
};
