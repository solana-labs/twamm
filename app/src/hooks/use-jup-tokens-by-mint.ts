import M, { Extra } from "easy-maybe/lib";
import useSWR from "swr";
import { PublicKey } from "@solana/web3.js";
import coinResolver from "../utils/coin-resolver";
import useJupTokens from "./use-jup-tokens";

const castKeys = (keys: PublicKey[] | string[]) => keys.map((k) => String(k));

const swrKey = (params: { mints: PublicKey[] | string[] }) => ({
  key: "jupTokensByMint",
  params,
});

const resolveAddress = (token: JupToken) => coinResolver(token.address);

const fetcher =
  (tokens?: JupToken[]) =>
  async ({ params }: SWRParams<typeof swrKey>) => {
    if (!tokens) return [];

    const mints = castKeys(params.mints);

    // FEAT: consider using the resolving helper once

    const selectedTokens = tokens.filter((token) => {
      const addressToMatch = resolveAddress(token);
      // resolve address against the environment

      return mints.includes(addressToMatch);
    });

    const tokenMap = new Map();
    selectedTokens.forEach((token) => {
      const namespacesToken = {
        ...token,
        address: resolveAddress(token),
        // resolve address against the environment
      };

      tokenMap.set(namespacesToken.address, namespacesToken);
    });

    return mints.map((mint) => tokenMap.get(mint));
  };

export default (mints?: SWRArgs<typeof swrKey>["mints"], options = {}) => {
  const jupTokens = useJupTokens();

  return useSWR(
    M.withDefault(
      undefined,
      M.andMap(
        ([m]) => swrKey({ mints: m }),
        Extra.combine2([M.of(mints), M.of(jupTokens.data)])
      )
    ),
    fetcher(jupTokens.data),
    options
  );
};
