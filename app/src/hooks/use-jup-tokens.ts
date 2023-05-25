import * as twammClient from "@twamm/client.js";
import M from "easy-maybe/lib";
import type { Cluster } from "@solana/web3.js";
import useSWR from "swr";
import { flatten } from "ramda";
import { SplToken } from "@twamm/client.js/lib/spl-token";
import { TOKEN_LIST_URL } from "@jup-ag/core";
import coinResolver from "../utils/coin-resolver";
import useTokenPairs from "./use-token-pairs";

type Unpacked<T> = T extends (infer U)[] ? U : T;

const swrKey = (params: { moniker: Cluster; addresses: string[] }) => ({
  key: "JupTokens",
  params,
});

const isSol = (t: JupToken) => SplToken.isNativeAddress(t.address);

const resolveAddress = (t: JupToken) => coinResolver(t.address);
// checking token address against the address present at the program

const fetcher = async ({ params }: SWRParams<typeof swrKey>) => {
  const { moniker } = params;

  const allTokens: Array<JupToken> = await (
    await fetch(TOKEN_LIST_URL[moniker])
  ).json();

  const hasProperAddress = (t: JupToken) =>
    params.addresses.includes(resolveAddress(t));

  const neededTokens = allTokens
    .filter((t) => hasProperAddress(t) || isSol(t))
    .map(({ address, decimals, logoURI, name, symbol }) => ({
      address,
      decimals,
      logoURI,
      name,
      symbol,
    }));

  return neededTokens;
};

export default (_: void, options = {}) => {
  const programPairs = useTokenPairs();

  const addresses = M.withDefault(
    undefined,
    M.andMap((tp) => {
      type TokenPairOrNil = Unpacked<typeof tp>;

      const isTokenPair = (
        a: TokenPairOrNil
      ): a is NonNullable<TokenPairOrNil> => a !== null;
      const pairs = tp.filter(isTokenPair);

      const pairAddresses = flatten(
        pairs
          .filter((a) => a.allowDeposits)
          .map<string[]>((p) => [
            p.configA.mint.toBase58(),
            p.configB.mint.toBase58(),
          ])
      );
      return [
        ...new Set(
          pairAddresses.concat(twammClient.address.NATIVE_TOKEN_ADDRESS)
        ),
      ];
    }, M.of(programPairs.data))
    // include wrapped SOL address as there might be no token pair with it
  );

  return useSWR(
    addresses && swrKey({ moniker: "mainnet-beta", addresses }),
    fetcher,
    options
  );
};
