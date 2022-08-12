import type { Pool as TPool } from "@twamm/types";
import type { Program } from "@project-serum/anchor";
import type { PublicKey } from "@solana/web3.js";
import useSWR from "swr";
import { Pool } from "@twamm/client.js";

import useProgram from "./use-program";

const swrKey = (params: { address: PublicKey }) => ({
  key: "pool",
  params,
});

const fetcher = (program: Program) => {
  const poolClient = new Pool(program);

  return async ({ params }: SWRParams<typeof swrKey>) => {
    const pool = await poolClient.getPool(params.address);

    return pool as TPool;
  };
};

export default (address?: SWRArgs<typeof swrKey>["address"], options = {}) => {
  const { program } = useProgram();

  return useSWR(address && swrKey({ address }), fetcher(program), options);
};
