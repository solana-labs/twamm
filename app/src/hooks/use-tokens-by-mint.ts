import type { PublicKey } from "@solana/web3.js";
import useSWR from "swr";
import M from "easy-maybe/lib";
import useCoingeckoContractApi from "./use-coingecko-api";
import { fetchJSONFromAPI2 } from "../utils/api";

const swrKey = (params: { mints: string[] }) => ({
  key: "tokensByMint",
  params,
});

type ContractData = {
  image: {
    large: string;
    small: string;
    thumb: string;
  };
  symbol: string;
  name: string;
  contract_address: string;
};

type Contract = {
  imageSmall: string;
  symbol: string;
  name: string;
  contract_address: string;
};

export type MaybeTokens = Array<Contract | Error>;

const fetcher = (api: ReturnType<typeof useCoingeckoContractApi>) => {
  const fetchFromAPI = fetchJSONFromAPI2(api);
  const fetchAddressByMint = (...args: any) =>
    fetchFromAPI<ContractData>("coinsIdContractContractAddressGet", ...args);

  return async ({ params }: SWRParams<typeof swrKey>) => {
    const contracts: PromiseSettledResult<ContractData>[] =
      await Promise.allSettled(
        params.mints.map((mint) => fetchAddressByMint("solana", mint))
      );

    const tokens: MaybeTokens = [];

    contracts.forEach((contract, i) => {
      if (contract.status === "fulfilled") {
        const {
          symbol,
          name,
          contract_address: address,
          image,
        } = contract.value;
        tokens[i] = {
          symbol,
          name,
          contract_address: address,
          imageSmall: image.small,
        };
      }
      if (contract.status === "rejected") {
        tokens[i] = new Error("Unknown token");
      }
    });

    return tokens;
  };
};

export default (
  params: Voidable<[string, string] | [PublicKey, PublicKey]>,
  options = {}
) => {
  const api = useCoingeckoContractApi();

  return useSWR(
    M.withDefault(
      undefined,
      M.andMap(
        ([a, b]) =>
          swrKey({
            mints: [
              typeof a === "string" ? a : a.toBase58(),
              typeof b === "string" ? b : b.toBase58(),
            ],
          }),
        M.of(params)
      )
    ),
    fetcher(api),
    options
  );
};
