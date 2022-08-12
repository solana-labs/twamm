import type { Program, Provider } from "@project-serum/anchor";
import type { TokenPair as TTokenPair } from "@twamm/types";
import useSWR from "swr";
import { OrderSide } from "@twamm/types/lib";
import { TokenPair } from "@twamm/client.js";

import useProgram from "./use-program";

const swrKey = (params: { aToken: TokenInfo; bToken: TokenInfo }) => ({
  key: "tokenPairByTokens",
  params,
});

const fetcher = (program: Program, provider: Provider) => {
  const tokenPair = new TokenPair(program, provider);

  return async ({ params }: SWRParams<typeof swrKey>) => {
    const primary = params.aToken.address;
    const secondary = params.bToken.address;

    const {
      data,
      primary: a,
      assumedType,
    } = await tokenPair.getExchangePair<TTokenPair>(primary, secondary);

    let actualPair: [TokenInfo, TokenInfo];
    if (String(a) === primary) {
      actualPair = [params.aToken, params.bToken];
    } else {
      actualPair = [params.bToken, params.aToken];
    }

    const {
      allowDeposits,
      allowWithdrawals,
      configA,
      configB,
      currentPoolPresent,
      futurePoolPresent,
      maxSwapPriceDiff,
      maxUnsettledAmount,
      minTimeTillExpiration,
      poolCounters,
      statsA,
      statsB,
      tifs,
    } = data;

    const exchangePairData: [[TokenInfo, TokenInfo], OrderSide] = [
      actualPair,
      assumedType,
    ];

    return {
      allowDeposits,
      allowWithdrawals,
      configA,
      configB,
      currentPoolPresent,
      exchangePair: exchangePairData,
      futurePoolPresent,
      maxSwapPriceDiff,
      maxUnsettledAmount,
      minTimeTillExpiration,
      poolCounters,
      statsA,
      statsB,
      tifs,
    } as Pick<
      TTokenPair,
      | "allowDeposits"
      | "allowWithdrawals"
      | "configA"
      | "configB"
      | "currentPoolPresent"
      | "futurePoolPresent"
      | "maxSwapPriceDiff"
      | "maxUnsettledAmount"
      | "minTimeTillExpiration"
      | "poolCounters"
      | "statsA"
      | "statsB"
      | "tifs"
    > & { exchangePair: typeof exchangePairData };
  };
};

export default (params?: SWRArgs<typeof swrKey>, options = {}) => {
  const { program, provider } = useProgram();

  return useSWR(params && swrKey(params), fetcher(program, provider), options);
};
