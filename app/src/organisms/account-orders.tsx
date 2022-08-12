import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import AccountOrdersList from "./account-orders-list";
import useOrderRecords from "../hooks/use-order-records";
import { ConnectWalletGuard } from "./wallet-guard";
import { add, keepPrevious, refreshEach } from "../swr-options";

const REFRESH_INTERVAL = 10000;

export default () => {
  const orders = useOrderRecords(
    undefined,
    add([keepPrevious(), refreshEach(REFRESH_INTERVAL)])
  );

  return (
    <Box pb={2}>
      <Typography pb={2} variant="h4">
        Orders
      </Typography>
      <ConnectWalletGuard>
        <AccountOrdersList
          data={orders.data}
          error={orders.error}
          loading={orders.isLoading}
          updating={orders.isValidating}
          updatingInterval={REFRESH_INTERVAL}
        />
      </ConnectWalletGuard>
    </Box>
  );
};
