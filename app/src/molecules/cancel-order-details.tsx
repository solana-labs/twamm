import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import Box from "@mui/material/Box";
import M, { Extra } from "easy-maybe/lib";
import { protocol } from "@twamm/client.js";

import type { PoolDetails } from "../types/decl.d";
import * as Styled from "./cancel-order-details.styled";
import CancelOrderLiquidity from "./cancel-order-liquidity";
import Loading from "../atoms/loading";
import useBreakpoints from "../hooks/use-breakpoints";
import usePrice from "../hooks/use-price";
import { refreshEach } from "../swr-options";

export default ({
  data,
  details,
  onToggle,
  percentage,
}: {
  data?: JupToken[];
  details?: PoolDetails;
  onToggle: () => void;
  percentage: number;
}) => {
  const d = M.of(data);
  const { isMobile } = useBreakpoints();

  const tokens = M.withDefault(undefined, d);
  const priceParams = M.withDefault(
    undefined,
    M.andMap((t) => {
      const [{ symbol: id }, { symbol: vsToken }] = t;
      return { id, vsToken };
    }, d)
  );
  const withdrawAmount = M.andMap(([td, det]) => {
    const [a, b] = td;
    const { order, tradeSide, tokenPair } = det;

    const [wda, wdb] = protocol.withdrawAmount(
      (order.lpBalance * percentage) / 100,
      tradeSide,
      order,
      tokenPair
    );

    const withdrawPair = [
      wda * 10 ** (a.decimals * -1),
      wdb * 10 ** (b.decimals * -1),
    ];

    return withdrawPair;
  }, Extra.combine2([d, M.of(details)]));

  const amount = M.withDefault<Array<number | string>>(
    ["-", "-"],
    withdrawAmount
  );

  const price = usePrice(priceParams, refreshEach(10000));

  if (!tokens) return <Loading />;

  return (
    <>
      <Styled.OperationImage>
        <Styled.OperationButton onClick={onToggle}>
          <ArrowDownwardIcon />
        </Styled.OperationButton>
      </Styled.OperationImage>
      <Box p={isMobile ? 1 : 2}>
        <CancelOrderLiquidity
          ab={tokens}
          amount={amount}
          errorData={price.error}
          priceData={price.data}
        />
      </Box>
    </>
  );
};
