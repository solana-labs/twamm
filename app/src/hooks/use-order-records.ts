import M, { Extra } from "easy-maybe/lib";
import type { OrderExt, Pool, TokenPair as TTokenPair } from "@twamm/types";
import type { Program, Provider } from "@project-serum/anchor";
import type { PublicKey } from "@solana/web3.js";
import useSWR from "swr";
import { TokenPair } from "@twamm/client.js";
import { useWallet } from "@solana/wallet-adapter-react";

import type { OrderData } from "../types/decl.d";
import useOrders from "./use-orders";
import usePools from "./use-pools-by-addresses";
import useProgram from "./use-program";

const swrKey = (params: {
  account: PublicKey | null;
  orders: OrderExt[];
  pools: Pool[];
}) => ({
  key: "orderRecords",
  params,
});

const generateId = (arr: Array<string>) => arr[0];

const fetcher = (program: Program, provider: Provider) => {
  const pair = new TokenPair(program, provider);

  return async ({ params }: SWRParams<typeof swrKey>) => {
    const poolAddresses = params.pools.map((p) => p.tokenPair);

    const tokenPairs = await pair.getPairs<TTokenPair>(poolAddresses);

    const records = params.orders.map((order, i) => {
      const record = { ...order } as OrderData;

      record.id = generateId([String(order.pool)]);
      record.poolData = params.pools[i];
      record.order = order.pubkey;
      record.tokenPairData = tokenPairs[i] as NonNullable<typeof tokenPairs[0]>;
      // assume all the pairs should be resolved

      return record;
    });

    return records;
  };
};

export default (_: void, options = {}) => {
  const { publicKey: account } = useWallet();
  const { program, provider } = useProgram();

  const orders = useOrders(undefined, options);

  const ordersAddresses = M.withDefault(
    undefined,
    M.andMap((o) => ({ addresses: o.map((a) => a.pool) }), M.of(orders.data))
  );

  const pools = usePools(ordersAddresses);

  return useSWR(
    M.withDefault(
      undefined,
      M.andMap(
        ([a, o, p]) => swrKey({ account: a, orders: o, pools: p }),
        Extra.combine3([
          M.of(account as PublicKey),
          M.of(orders.data),
          M.of(pools.data),
        ])
      )
    ),
    fetcher(program, provider),
    options
  );
};
