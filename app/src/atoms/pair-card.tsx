import type { PublicKey } from "@solana/web3.js";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import * as Styled from "./pair-card.styled";
import i18n from "../i18n";
import Metric, { formatDeposited } from "./pair-card-metrics";
import PairCardSymbols from "./pair-card-symbols";
import useTokensByMint from "../hooks/use-tokens-by-mint";
import { formatPrice } from "../domain/index";

export interface Props {
  aMint: PublicKey;
  bMint: PublicKey;
  fee: number;
  orderVolume: number;
  settledVolume: number;
  routedVolume: number;
}

export default ({
  aMint,
  bMint,
  fee,
  orderVolume,
  settledVolume,
  routedVolume,
}: Props) => {
  const tokens = useTokensByMint([aMint, bMint]);

  return (
    <Styled.Root>
      <Styled.Card>
        <Styled.Fund>
          <Styled.FundName>
            <PairCardSymbols data={tokens.data} />
          </Styled.FundName>
        </Styled.Fund>
        <Box pt={2}>
          <Typography variant="h6">{i18n.StatsPairsPairVolume}</Typography>
        </Box>
        <Box pt={1}>
          <Styled.FundMetrics>
            <Metric
              formatted
              title={i18n.StatsPairsPairOrderVolume}
              value={orderVolume}
            />
            <Metric
              formatted
              title={i18n.StatsPairsPairRoutedVolume}
              value={routedVolume}
            />
            <Metric
              formatted
              title={i18n.StatsPairsPairSettledVolume}
              value={settledVolume}
            />
          </Styled.FundMetrics>
        </Box>
        <Box pt={2}>
          {i18n.StatsPairsPairProtocolFee}:{" "}
          {fee ? `$${formatDeposited(fee)}` : formatPrice(0)}
        </Box>
      </Styled.Card>
    </Styled.Root>
  );
};

export const Blank = () => <Styled.FundSkeleton variant="rectangular" />;
