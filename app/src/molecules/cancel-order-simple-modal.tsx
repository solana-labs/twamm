import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import M, { Extra } from "easy-maybe/lib";
import Typography from "@mui/material/Typography";
import { BN } from "@project-serum/anchor";
import { useCallback } from "react";

import * as Styled from "./cancel-order-simple-modal.styled";
import i18n from "../i18n";
import Loading from "../atoms/loading";

export default ({
  data,
  onClick,
}: {
  data: {};
  onClick: (arg0: { supply: BN }) => void;
}) => {
  const orderData = M.of(data);

  const onCancel = useCallback(() => {
    onClick({
      supply: new BN(Number.MAX_SAFE_INTEGER),
    });
  }, [onClick]);

  return (
    <Styled.Container>
      <Typography pt={3} pb={2} align="center" variant="h4">
        {i18n.OrderFlowCancelTitle}
      </Typography>
      {Extra.isNothing(orderData) && <Loading />}
      {Extra.isJust(orderData) && (
        <>
          <Box p={2}>
            <Alert severity="warning" variant="filled">
              <AlertTitle>{i18n.Warning}</AlertTitle>
              {i18n.OrderCollisionWarning}
            </Alert>
          </Box>
          <Box p={2}>
            <Styled.Control variant="contained" fullWidth onClick={onCancel}>
              {i18n.OrderControlCancelConcurrentOrder}
            </Styled.Control>
          </Box>
        </>
      )}
    </Styled.Container>
  );
};
