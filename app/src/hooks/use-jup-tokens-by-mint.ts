import M, { Extra } from "easy-maybe/lib";
import useSWR from "swr";
import { PublicKey } from "@solana/web3.js";
import useJupTokens from "./use-jup-tokens";

const castKeys = (keys: PublicKey[] | string[]) => keys.map((k) => String(k));

const swrKey = (params: { mints: PublicKey[] | string[] }) => ({
  key: "jupTokensByMint",
  params,
});

const fetcher =
  (tokens?: JupToken[]) =>
  async ({ params }: SWRParams<typeof swrKey>) => {
    if (!tokens) return [];

    const mints = castKeys(params.mints);

    const selectedTokens = tokens.filter((token) =>
      mints.includes(token.address)
    );

    const tokenMap = new Map();
    selectedTokens.forEach((token) => {
      tokenMap.set(token.address, token);
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
