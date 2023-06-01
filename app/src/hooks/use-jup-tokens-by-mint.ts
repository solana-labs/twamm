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
    if (!tokens) {
      console.error("Can not fetch the Jupiter tokens"); // eslint-disable-line no-console
      return [];
    }

    const mints = castKeys(params.mints);
    const neededTokens = new Map<string, JupToken>();

    tokens.forEach((token) => {
      const addressToMatch = resolveAddress(token);
      // resolve address against the environment

      if (mints.includes(addressToMatch)) {
        neededTokens.set(addressToMatch, token);
      }
    });

    const tokenMap = new Map();

    mints.forEach((mint) => {
      const tokenData = neededTokens.get(mint);

      let namespacesToken;
      if (tokenData) {
        namespacesToken = { ...tokenData, address: resolveAddress(tokenData) };
      } else {
        // eslint-disable-next-line no-console
        console.error(
          "Unknown token found. Please make sure you are using the correct mint"
        );
        namespacesToken = {
          address: mint,
          symbol: "N/A",
          decimals: undefined,
          name: "Unknown Token",
          logoURI: undefined,
        };
      }
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
