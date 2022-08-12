import type { TokenPair } from "@twamm/types";
import Box from "@mui/material/Box";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Grid from "@mui/material/Grid";
import List from "@mui/material/List";
import M, { Extra } from "easy-maybe/lib";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { OrderSide } from "@twamm/types/lib";
import { useState } from "react";

import * as Styled from "./price-info.styled";
import i18n from "../i18n";
import IntervalProgress from "../atoms/interval-progress";
import PairCardSymbols from "../atoms/pair-card-symbols";
import useBreakpoints from "../hooks/use-breakpoints";
import usePrice from "../hooks/use-price";
import { formatPrice, populatePairByType } from "../domain/index";
import { populateStats } from "../domain/token-pair-details";
import { refreshEach } from "../swr-options";

const REFRESH_INTERVAL = 0.5 * 60000;

export default (props: {
  a?: JupToken;
  b?: JupToken;
  tokenPair?: Pick<TokenPair, "configA" | "configB" | "statsA" | "statsB">;
  type?: OrderSide;
}) => {
  const [open, setOpen] = useState<boolean>(false);

  const { isMobile } = useBreakpoints();

  const populatePair = (a: JupToken, b: JupToken, t: OrderSide) =>
    populatePairByType<JupToken>(a, b, t);

  const pair = M.andMap(
    ([c, d, e]) => populatePair(c, d, e),
    Extra.combine3([M.of(props.a), M.of(props.b), M.of(props.type)])
  );

  const tokenPairPrice = usePrice(
    M.withDefault(
      undefined,
      M.andMap(
        ([p]) => ({ id: p[0].address, vsToken: p[1].address }),
        Extra.combine2([pair, M.of(open ? true : undefined)]) // Nothing unless open
      )
    ),
    refreshEach(REFRESH_INTERVAL)
  );

  const mints = M.withDefault(
    undefined,
    M.andMap(
      ([c, d]) => [
        {
          contract_address: c.address,
          symbol: c.symbol,
          name: c.name,
          imageSmall: c.logoURI,
        },
        {
          contract_address: d.address,
          symbol: d.symbol,
          name: d.name,
          imageSmall: d.logoURI,
        },
      ],
      pair
    )
  );

  const stats = M.withDefault(
    undefined,
    M.andMap((d) => {
      const { orderVolume: o, settledVolume: s, routedVolume: t, fee } = d;

      return {
        orderVolume: formatPrice(o),
        protocolFee: formatPrice(fee),
        routedVolume: formatPrice(t),
        settledVolume: formatPrice(s),
      };
    }, M.andMap(populateStats, M.of(props.tokenPair)))
  );

  const price = M.withDefault(undefined, M.of(tokenPairPrice.data));

  const priceInfo = M.withDefault(
    undefined,
    M.andMap((p) => `${p[1].symbol} per ${p[0].symbol}`, pair)
  );

  return (
    <>
      <Styled.Info pt={2} mb={!open && isMobile ? "56px" : undefined}>
        <Stack direction="row" spacing="1">
          <Box mr={1} mt={0.25}>
            <IntervalProgress
              interval={open ? REFRESH_INTERVAL : 0}
              refresh={tokenPairPrice.isValidating}
            />
          </Box>
          <Box>{i18n.TradeTokenInfo}</Box>
          <Styled.Toggle onClick={() => setOpen(!open)}>
            {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Styled.Toggle>
        </Stack>
      </Styled.Info>
      {!open ? null : (
        <Box pt={2}>
          <Grid container spacing={1}>
            <Styled.DetailsGridItem item>
              <Styled.DetailsPair direction="row" spacing={2}>
                <PairCardSymbols data={mints} />
                <Typography variant="h6">
                  {!price ? "-" : `${formatPrice(price, false)} ${priceInfo}`}
                </Typography>
              </Styled.DetailsPair>
            </Styled.DetailsGridItem>
          </Grid>
          <List>
            <Styled.DetailsItem>
              <Typography variant="body2">
                {i18n.TradeTokenOrderVolume}
              </Typography>
              <Typography variant="body2">
                {stats?.orderVolume ?? "-"}
              </Typography>
            </Styled.DetailsItem>
            <Styled.DetailsItem>
              <Typography variant="body2">
                {i18n.TradeTokenRoutedVolume}
              </Typography>
              <Typography variant="body2">
                {stats?.routedVolume ?? "-"}
              </Typography>
            </Styled.DetailsItem>
            <Styled.DetailsItem>
              <Typography variant="body2">
                {i18n.TradeTokenSettledVolume}
              </Typography>
              <Typography variant="body2">
                {stats?.settledVolume ?? "-"}
              </Typography>
            </Styled.DetailsItem>
            <Styled.DetailsItem>
              <Typography variant="body2">
                {i18n.TradeTokenProtocolFee}
              </Typography>
              <Typography variant="body2">
                {stats?.protocolFee ?? "-"}
              </Typography>
            </Styled.DetailsItem>
          </List>
        </Box>
      )}
    </>
  );
};
