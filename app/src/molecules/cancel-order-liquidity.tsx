import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import M, { Extra } from "easy-maybe/lib";
import { useMemo } from "react";

import * as Styled from "./cancel-order-liquidity.styled";
import useBreakpoints from "../hooks/use-breakpoints";
import { isFloat } from "../utils/index";

const formatRate = (a: number) => (!isFloat(a) ? a : Number(a).toFixed(2));

export default ({
  ab,
  amount,
  errorData,
  priceData,
}: {
  ab: JupToken[];
  amount: Array<number | string>;
  errorData: Voidable<Error>;
  priceData: Voidable<number>;
}) => {
  const data = M.of(priceData);
  const error = M.of(errorData);
  const { isMobile } = useBreakpoints();

  const pair = useMemo(
    () =>
      ab.map((token, i) => ({
        symbol: token.symbol,
        amount: amount[i],
        image: token.logoURI,
      })),
    [ab, amount]
  );

  const [a, b] = pair;

  const price = M.andThen(
    (d) => M.of(Extra.isJust(error) ? undefined : d),
    data
  );

  const p = M.withDefault(undefined, price);

  return (
    <>
      <Card>
        <CardContent>
          {pair.map(({ amount: amnt, image, symbol }) => (
            <Styled.LiquidityItem key={symbol}>
              <Styled.ItemAmount
                sx={{ fontSize: isMobile ? "1rem" : "1.5rem" }}
              >
                {amnt}
              </Styled.ItemAmount>
              <Styled.ItemToken>
                <Styled.TokenImage src={image}>{symbol[0]}</Styled.TokenImage>
                <Styled.TokenName
                  sx={{ fontSize: isMobile ? "1rem" : "1.3rem" }}
                >
                  {symbol.toUpperCase()}
                </Styled.TokenName>
              </Styled.ItemToken>
            </Styled.LiquidityItem>
          ))}
        </CardContent>
      </Card>
      {Extra.isJust(error) && (
        <Box py={2}>
          <Alert severity="error">{M.unwrap(error)?.message}</Alert>
        </Box>
      )}
      {Extra.isJust(price) && (
        <Box py={isMobile ? 1 : 2} px={isMobile ? 1 : 2}>
          <Styled.RateItem variant="body2">
            1 {a.symbol} = {!p ? "-" : formatRate(p)} {b.symbol}
          </Styled.RateItem>
          <Styled.RateItem variant="body2">
            1 {b.symbol} = {!p ? "-" : formatRate(1 / p)} {a.symbol}
          </Styled.RateItem>
        </Box>
      )}
    </>
  );
};
