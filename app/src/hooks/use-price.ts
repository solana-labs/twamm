import type { Address } from "@project-serum/anchor";
import useSWR from "swr";
import { JUPITER_PRICE_ENDPOINT_V1 } from "../env";

type TokenPrice = {
  timeTaken: number;
  contextSlot: string;
  data: {
    id: Extract<Address, string>;
    mintSymbol: string;
    vsToken: Extract<Address, string>;
    vsTokenSymbol: string;
    price: number;
  };
};

const swrKey = (
  params: { id: string } & Partial<{
    vsToken: string;
    vsAmount: string;
  }>
) => ({
  key: "price",
  params,
});

const fetcher =
  ({ endpoint }: { endpoint: string }) =>
  async ({ params }: SWRParams<typeof swrKey>) => {
    const resp = await fetch(`${endpoint}?${new URLSearchParams(params)}`);

    if (resp.status === 404) {
      return 0;
    }

    if (resp.status !== 200) {
      throw new Error("Can not fetch the price");
    }

    const data: TokenPrice = await resp.json();

    return data.data.price;
  };

export default (params: Voidable<SWRArgs<typeof swrKey>>, options = {}) => {
  const opts = { endpoint: JUPITER_PRICE_ENDPOINT_V1 };

  return useSWR(params && swrKey(params), fetcher(opts), options);
};
