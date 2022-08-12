import type { Cluster } from "@solana/web3.js";
import useSWR from "swr";
import { TOKEN_LIST_URL } from "@jup-ag/core";
import { SplToken } from "@twamm/client.js/lib/spl-token";
import useBlockchain from "../contexts/solana-connection-context";
import { NEXT_PUBLIC_SUPPORTED_TOKEN } from "../env";

let ADDRESSES: string[];
try {
  ADDRESSES = NEXT_PUBLIC_SUPPORTED_TOKEN.split(",");
} catch (e) {
  ADDRESSES = ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"];
}

const swrKey = (params: { moniker: Cluster }) => ({
  key: "JupTokens",
  params,
});

const isSol = (t: JupToken) => SplToken.isNativeAddress(t.address);
const hasProperAddress = (t: JupToken) => ADDRESSES.includes(t.address);

const fetcher = async ({ params }: SWRParams<typeof swrKey>) => {
  const { moniker } = params;

  const allTokens: Array<JupToken> = await (
    await fetch(TOKEN_LIST_URL[moniker])
  ).json();

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
  const { clusters } = useBlockchain();
  const moniker = clusters[0].moniker as "mainnet-beta";

  return useSWR(swrKey({ moniker }), fetcher, options);
};
