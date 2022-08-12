import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";

import BlankTokenPairs from "../atoms/token-pair-cards-blank";
import i18n from "../i18n";
import TokenPairCards from "./token-pair-cards";
import useTokenPairs from "../hooks/use-token-pairs";
import { refreshEach } from "../swr-options";

export default () => {
  const tokenPairs = useTokenPairs(undefined, refreshEach(5 * 60000));

  const content = useMemo(() => {
    if (!tokenPairs.data) {
      return <BlankTokenPairs />;
    }

    type TokenPair = typeof tokenPairs.data[0];

    function presentPair(t: TokenPair): t is NonNullable<TokenPair> {
      return t !== null;
    }

    const pairs = tokenPairs.data.filter(presentPair);

    return <TokenPairCards data={pairs} />;
  }, [tokenPairs]);

  return (
    <Box pb={2}>
      <Typography pb={2} variant="h4">
        {i18n.StatsPairs}
      </Typography>
      {content}
    </Box>
  );
};
