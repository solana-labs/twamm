import Box from "@mui/material/Box";
import { useMemo } from "react";

import type { PoolDetails } from "../types/decl.d";
import i18n from "../i18n";
import StatsList from "./account-orders-details-stats-list";
import StatsCards from "./account-orders-details-stats-cards";
import useBreakpoints from "../hooks/use-breakpoints";
import { format } from "./account-orders-details-stats.helpers";
import { formatInterval } from "../utils/index";

export default ({
  details,
  quantity,
  filledQuantity,
  timeInForce,
}: {
  details: PoolDetails;
  quantity: number;
  filledQuantity: number;
  timeInForce: number;
}) => {
  const { isMobile } = useBreakpoints();

  const statsSizes = useMemo(() => ({ xs: 6, sm: 6, md: 4 }), []);

  const fields = useMemo(
    () => [
      {
        name: i18n.OrderDetailsTimeFrame,
        data: formatInterval(timeInForce),
      },
      {
        name: i18n.OrderDetailsCompletionRate,
        data: (() => {
          const progress = (filledQuantity / quantity) * 100;

          return `${progress >= 99 ? 100 : Math.ceil(progress)}%`;
        })(),
      },
      {
        name: i18n.OrderDetailsFilledQuantity,
        data: String(filledQuantity),
      },
      {
        name: i18n.OrderDetailsQuantity,
        data: String(quantity),
      },
      {
        name: i18n.OrderDetailsPoolExpiration,
        data: format.expirationTime(details),
      },
      {
        name: i18n.OrderDetailsTotalAssets,
        data: format.totalAssets(details),
      },
      {
        name: i18n.OrderDetailsPrices,
        data: format.prices(details),
      },
      {
        name: i18n.OrderDetailsUserAveragePrice,
        data: format.userAveragePrice(details),
      },
      {
        name: i18n.OrderDetailsPoolInception,
        data: format.inceptionTime(details),
      },
      {
        name: i18n.OrderDetailsLastUpdated,
        data: format.lastBalanceChangeTime(details),
      },
    ],
    [details, filledQuantity, quantity, timeInForce]
  );

  return (
    <Box>
      {isMobile ? (
        <StatsList fields={fields} />
      ) : (
        <StatsCards fields={fields} sizes={statsSizes} />
      )}
    </Box>
  );
};
