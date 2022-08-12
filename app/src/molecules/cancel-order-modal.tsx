import Box from "@mui/material/Box";
import M, { Extra } from "easy-maybe/lib";
import Typography from "@mui/material/Typography";
import { BN } from "@project-serum/anchor";
import { useCallback, useState } from "react";

import type { CancelOrderData, OrderDetails } from "../types/decl.d";
import * as Styled from "./cancel-order-modal.styled";
import CancelOrderAmount from "./cancel-order-amount";
import CancelOrderDetails from "./cancel-order-details";
import i18n from "../i18n";
import Loading from "../atoms/loading";
import useJupTokensByMint from "../hooks/use-jup-tokens-by-mint";
import usePoolDetails from "../hooks/use-pool-details";
import useBreakpoints from "../hooks/use-breakpoints";

export default ({
  data,
  detailsData,
  onApprove,
}: {
  data?: CancelOrderData;
  detailsData: OrderDetails;
  onApprove: (arg0: CancelOrderData) => void;
}) => {
  const { isMobile } = useBreakpoints();

  const [percentage, setPercentage] = useState<number>(100);
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);

  const order = M.of(data);

  const tokens = useJupTokensByMint(
    M.withDefault(
      undefined,
      M.andMap(({ a, b }) => [a, b], order)
    )
  );

  const details = usePoolDetails(detailsData.poolAddress, detailsData.order);

  const onAmountChange = useCallback((value: number) => {
    setPercentage(value);
  }, []);

  const onCancel = useCallback(() => {
    M.tap((cd) => {
      const { supply } = cd;
      const cancellableAmount = (supply.toNumber() * percentage) / 100;

      onApprove({
        ...cd,
        supply: new BN(cancellableAmount),
      });
    }, order);
  }, [onApprove, order, percentage]);

  const onToggleDetails = useCallback(() => {
    setDetailsOpen((prev) => !prev);
  }, [setDetailsOpen]);

  return (
    <Styled.Container>
      <Typography
        pt={3}
        pb={isMobile ? 1 : 2}
        align="center"
        variant={isMobile ? "h5" : "h4"}
      >
        {i18n.OrderFlowCancelTitle}
      </Typography>
      {Extra.isNothing(order) && <Loading />}
      {Extra.isJust(order) && (
        <>
          <Box p={2}>
            <CancelOrderAmount
              isMobile={isMobile}
              percentage={percentage}
              onChange={onAmountChange}
              onToggleDetails={onToggleDetails}
            />
          </Box>
          {detailsOpen && (
            <CancelOrderDetails
              data={tokens.data}
              details={details.data}
              onToggle={onToggleDetails}
              percentage={percentage}
            />
          )}
          <Box p={2}>
            <Styled.Control
              disabled={!percentage}
              variant="contained"
              fullWidth
              onClick={onCancel}
            >
              {i18n.OrderFlowCancelControl}
            </Styled.Control>
          </Box>
        </>
      )}
    </Styled.Container>
  );
};
