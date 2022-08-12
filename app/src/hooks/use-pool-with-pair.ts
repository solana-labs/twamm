import type { Pool as TPool, TokenPair as TTokenPair } from "@twamm/types";
import type { Program, Provider } from "@project-serum/anchor";
import type { PublicKey } from "@solana/web3.js";
import { Pool, TokenPair } from "@twamm/client.js";
import useSWR from "swr";

import useProgram from "./use-program";

const swrKey = (params: { address: PublicKey }) => ({
  key: "poolWithPair",
  params,
});

const fetcher = (program: Program, provider: Provider) => {
  const poolClient = new Pool(program);
  const pairClient = new TokenPair(program, provider);

  return async ({ params }: SWRParams<typeof swrKey>) => {
    const pool = (await poolClient.getPool(params.address)) as TPool;
    const pair = (await pairClient.getPair(pool.tokenPair)) as TTokenPair;

    return { pool, pair };
  };
};

export default (address: SWRArgs<typeof swrKey>["address"], options = {}) => {
  const { program, provider } = useProgram();

  return useSWR(
    address && swrKey({ address }),
    fetcher(program, provider),
    options
  );
};
