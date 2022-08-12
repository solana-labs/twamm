import M, { Extra } from "easy-maybe/lib";
import type { BN } from "@project-serum/anchor";
import type { GridCellParams } from "@mui/x-data-grid-pro";
import type { Maybe as TMaybe } from "easy-maybe";
import type { Pool as TPool } from "@twamm/types";
import type { PublicKey } from "@solana/web3.js";
import { lensPath, view } from "ramda";

import i18n from "../i18n";
import usePoolWithPair from "../hooks/use-pool-with-pair";
import { expirationTimeToInterval, formatInterval } from "../utils/index";

export interface Params extends GridCellParams<void, { pool: PublicKey }> {}

const withFormattedExpTime = (data: TMaybe<{ pool: TPool }>) => {
  const lensPoolTif = lensPath(["pool", "timeInForce"]);
  const lensPoolExpiration = lensPath(["pool", "expirationTime"]);
  const selectTif = view(lensPoolTif);
  const selectExpTime = view(lensPoolExpiration);

  const tif = M.andMap<any, number>(selectTif, data);
  const expirationBN = M.andMap<any, BN>(selectExpTime, data);
  const expirationTime = M.andMap((bn) => bn.toNumber(), expirationBN);
  const expTif = Extra.combine([expirationTime, tif]);

  const timeLeft = M.andMap(([a, b]) => {
    const left = expirationTimeToInterval(a, b);

    if (!left) return i18n.OrdersCellExpirationDone;

    return formatInterval(left);
  }, expTif);

  return timeLeft;
};

export default ({ row }: Pick<Params, "row">) => {
  const tokenPair = usePoolWithPair(row.pool);

  const data = M.of(tokenPair.data);
  const formattedData = Extra.as(withFormattedExpTime, data);
  const timeLeft = M.withDefault("-", formattedData);

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{timeLeft}</>;
};
