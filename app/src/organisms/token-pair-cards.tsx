import type { TokenPair } from "@twamm/types";
import Alert from "@mui/material/Alert";
import M from "easy-maybe/lib";
import { useMemo } from "react";

import * as Styled from "./token-pair-cards.styled";
import PairCard from "../atoms/pair-card";
import { populate } from "./token-pair-cards.helpers";

export default ({ data }: { data?: TokenPair[] }) => {
  const tokenPairs = useMemo(
    () =>
      M.withDefault(
        [],
        M.andMap<TokenPair[], ReturnType<typeof populate>[]>(
          (pairs) => pairs.map(populate),
          M.of(data)
        )
      ),
    [data]
  );

  if (!tokenPairs.length)
    return (
      <Styled.CardList>
        <Alert severity="info">No Pairs Present</Alert>
      </Styled.CardList>
    );

  return (
    <Styled.CardList>
      {tokenPairs
        .sort((a, b) => b.orderVolume - a.orderVolume)
        .map((tokenPair) => (
          <Styled.CardListItem key={tokenPair.id}>
            <PairCard
              aMint={tokenPair.aMint}
              bMint={tokenPair.bMint}
              fee={tokenPair.fee}
              orderVolume={tokenPair.orderVolume}
              routedVolume={tokenPair.routedVolume}
              settledVolume={tokenPair.settledVolume}
            />
          </Styled.CardListItem>
        ))}
    </Styled.CardList>
  );
};
