import M, { Extra } from "easy-maybe/lib";
import type { Program, Provider } from "@project-serum/anchor";
import type { PublicKey } from "@solana/web3.js";
import type { TokenPair as TTokenPair } from "@twamm/types";
import useSWR from "swr";
import { TokenPair } from "@twamm/client.js";

import usePool from "./use-pool";
import useProgram from "./use-program";

const swrKey = (params: { address: PublicKey; tokenPair: PublicKey }) => ({
  key: "tokenPairByPool",
  params,
});

const fetcher = (program: Program, provider: Provider) => {
  const pair = new TokenPair(program, provider);

  return async ({ params }: SWRParams<typeof swrKey>) => {
    const tp: unknown = await pair.getPair(params.tokenPair);

    return tp as TTokenPair;
  };
};

export default (address?: SWRArgs<typeof swrKey>["address"], options = {}) => {
  const { program, provider } = useProgram();

  const pool = usePool(M.withDefault(undefined, M.of(address)));

  return useSWR(
    M.withDefault(
      undefined,
      M.andMap(
        ([a, p]) => swrKey({ address: a, tokenPair: p.tokenPair }),
        Extra.combine2([M.of(address), M.of(pool.data)])
      )
    ),
    fetcher(program, provider),
    options
  );
};
