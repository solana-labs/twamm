import Box from "@mui/material/Box";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Tooltip from "@mui/material/Tooltip";
import { useState } from "react";
import * as Styled from "./pair-card-metrics.styled";
import { formatPrice } from "../domain/index";

export interface MetricProps {
  title: string;
  value: number;
  formatted?: boolean;
}

export const formatDeposited = (value: number): string => {
  const RANKS = ["K", "M", "B", "T"];
  const TRESHOLD = 1e3;
  const formatUnranked = (a: number) => (a === 0 ? a : a.toFixed(2));

  let idx = 0;

  // eslint-disable-next-line no-plusplus, no-param-reassign
  while (value >= TRESHOLD && ++idx <= RANKS.length) value /= TRESHOLD;

  return String(
    idx === 0
      ? formatUnranked(value)
      : value.toFixed(1).replace(/\.?0+$/, "") + RANKS[idx - 1]
  );
};

export default ({ formatted = false, title, value }: MetricProps) => {
  const [open, setOpen] = useState<boolean>(false);

  const onClose = () => {
    setOpen(false);
  };

  const onOpen = () => {
    setOpen(true);
  };

  return (
    <Box>
      <Styled.Metric>
        <Styled.FundMetricName>{title}</Styled.FundMetricName>
        <ClickAwayListener onClickAway={onClose}>
          <Tooltip
            arrow
            PopperProps={{ disablePortal: true }}
            open={open}
            onClose={onClose}
            onClick={onOpen}
            title={formatPrice(value)}
          >
            <Styled.FundMetricValue>
              {formatted ? `$${formatDeposited(value)}` : formatPrice(value)}
            </Styled.FundMetricValue>
          </Tooltip>
        </ClickAwayListener>
      </Styled.Metric>
    </Box>
  );
};
