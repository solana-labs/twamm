import { BN } from "@project-serum/anchor";
import type { TokenPair } from "@twamm/types";
import { lensPath, view } from "ramda";

import type { PairConfig, PairStats } from "../types/decl.d";

const calculateVolume = (volumes: BN[] | number[]) => {
  const mark = volumes[0];

  const adjust = (a: number) => a * 1e-6;

  if (mark instanceof BN) {
    const a = volumes[0] as BN;
    const b = volumes[1] as BN;
    const volume = a.toNumber() + b.toNumber();
    return adjust(volume);
  }
  const a = volumes[0] as number;
  const b = volumes[1] as number;

  return adjust(a + b);
};

export const populateStats = (
  pair: Pick<TokenPair, "statsA" | "statsB" | "configA" | "configB">
) => {
  const decimals = lensPath(["decimals"]);
  const feesCollected = lensPath(["feesCollected"]);
  const mint = lensPath(["mint"]);
  const orderVolume = lensPath(["orderVolumeUsd"]);
  const settledVolume = lensPath(["settledVolumeUsd"]);
  const routedVolume = lensPath(["routedVolumeUsd"]);
  const pendingWithdrawals = lensPath(["pendingWithdrawals"]);

  const fee =
    Number(view(feesCollected, pair.statsA)) /
      10 ** view(decimals, pair.configA) +
    Number(view(pendingWithdrawals, pair.statsB)) /
      10 ** view(decimals, pair.configB) +
    Number(view(feesCollected, pair.statsA)) /
      10 ** view(decimals, pair.configA) +
    Number(view(pendingWithdrawals, pair.statsB)) /
      10 ** view(decimals, pair.configB);

  const aMint = view<PairConfig, PairConfig["mint"]>(mint, pair.configA);
  const bMint = view<PairConfig, PairConfig["mint"]>(mint, pair.configB);
  const orderVolumeValues = [
    view<PairStats, BN | number>(orderVolume, pair.statsA),
    view<PairStats, BN | number>(orderVolume, pair.statsB),
  ];
  const settledVolumeValues = [
    view<PairStats, BN | number>(settledVolume, pair.statsA),
    view<PairStats, BN | number>(settledVolume, pair.statsB),
  ];
  const routedVolumeValues = [
    view<PairStats, BN | number>(routedVolume, pair.statsA),
    view<PairStats, BN | number>(routedVolume, pair.statsB),
  ];

  // TODO: number should be deprecated in favor of BN
  return {
    a: aMint,
    b: bMint,
    fee,
    orderVolume: calculateVolume(orderVolumeValues as BN[] | number[]),
    settledVolume: calculateVolume(settledVolumeValues as BN[] | number[]),
    routedVolume: calculateVolume(routedVolumeValues as BN[] | number[]),
  };
};
