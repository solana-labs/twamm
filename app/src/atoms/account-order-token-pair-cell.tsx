import type { GridCellParams } from "@mui/x-data-grid-pro";
import type { PublicKey } from "@solana/web3.js";
import type { TokenPair } from "@twamm/types";
import M from "easy-maybe/lib";

import PairCardSymbols from "./pair-card-symbols";
import useTokenPairByPool from "../hooks/use-token-pair-by-pool";
import useTokensByMint from "../hooks/use-tokens-by-mint";
import { keepPrevious } from "../swr-options";

export interface Props
  extends GridCellParams<
    void,
    {
      side: OrderTypeStruct;
      pool: PublicKey;
    }
  > {}

export default ({ row }: Pick<Props, "row">) => {
  const tokenPair = useTokenPairByPool(row.pool, keepPrevious());

  const mints = M.withDefault(
    undefined,
    M.andMap<TokenPair, [PublicKey, PublicKey]>(
      (tp) => [tp.configA.mint, tp.configB.mint],
      M.of(tokenPair.data)
    )
  );

  const tokens = useTokensByMint(mints);

  return (
    <PairCardSymbols displayDirection data={tokens.data} side={row.side} />
  );
};
