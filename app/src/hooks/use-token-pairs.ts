import type { Provider, Program } from "@project-serum/anchor";
import type { TokenPair as TTokenPair } from "@twamm/types";
import useSWR from "swr";
import { TokenPair } from "@twamm/client.js";

import useProgram from "./use-program";

const swrKey = (params: {}) => ({
  key: "tokenPairs",
  params,
});

const fetcher = (provider: Provider, program: Program) => {
  const tokenPair = new TokenPair(program, provider);

  return async () => {
    const addresses = await tokenPair.getAddresses();

    const pairs = await tokenPair.getPairs<TTokenPair>(addresses);

    return pairs;
  };
};

export default (_: void, options = {}) => {
  const { program, provider } = useProgram();

  return useSWR(swrKey({}), fetcher(provider, program), options);
};
