import type { TokenPair } from "@twamm/types";
import { lensPath, view } from "ramda";

import type { PairConfig, PairStats } from "../types/decl.d";

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
  const orderVolumeValue =
    view<PairStats, number>(orderVolume, pair.statsA) +
    view<PairStats, number>(orderVolume, pair.statsB);
  const settledVolumeValue =
    view<PairStats, number>(settledVolume, pair.statsA) +
    view<PairStats, number>(settledVolume, pair.statsB);
  const routedVolumeValue =
    view<PairStats, number>(routedVolume, pair.statsA) +
    view<PairStats, number>(routedVolume, pair.statsB);

  return {
    a: aMint,
    b: bMint,
    fee,
    orderVolume: orderVolumeValue,
    settledVolume: settledVolumeValue,
    routedVolume: routedVolumeValue,
  };
};
