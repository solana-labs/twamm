import useSWR from "swr";
import { useWallet } from "@solana/wallet-adapter-react";
import { view, lensPath } from "ramda";

import type { PairConfig } from "../types/decl.d";
import useTokenPairs from "./use-token-pairs";

type Key = PairConfig["mint"];

export default (_: void, options = {}) => {
  const { data } = useTokenPairs();
  const { publicKey: address } = useWallet();

  return useSWR(
    data && ["addressPairs", address],
    async () => {
      if (!data) return undefined;
      type Record = typeof data[0];

      function presentPair(r: Record): r is NonNullable<Record> {
        return r !== null;
      }

      const mint = lensPath(["mint"]);

      const pairs = data.filter(presentPair).map<[Key, Key]>((pair) => {
        const a = view<PairConfig, Key>(mint, pair.configA);
        const b = view<PairConfig, Key>(mint, pair.configB);

        return [a, b];
      });

      const addressPairs = pairs.map<AddressPair>((pair) => [
        String(pair[0]),
        String(pair[1]),
      ]);

      return addressPairs;
    },
    options
  );
};
