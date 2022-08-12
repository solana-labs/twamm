/// <reference types="@twamm/types" />
import { BN } from "@project-serum/anchor";

export const TimeInForce = {
  poolTifCounters(
    tif: TIF,
    tifs: TIF[],
    poolCounters: BN[],
    nextPool: boolean
  ) {
    if (tifs.length !== poolCounters.length)
      throw new Error("Counter' shape mismatch");

    const tifIndex = tifs.indexOf(tif);
    if (tifIndex < 0) throw new Error("Invalid TIF");

    const poolCounter = poolCounters[tifIndex];

    const counter = nextPool ? new BN(poolCounter.toNumber() + 1) : poolCounter;

    return { current: poolCounter, target: counter };
  },
};
