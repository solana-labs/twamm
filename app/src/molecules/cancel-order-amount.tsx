import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import { memo, useCallback, useMemo } from "react";

import * as Styled from "./cancel-order-amount.styled";
import i18n from "../i18n";
import { isFloat } from "../utils/index";

const labelFormat = (value: number) =>
  isFloat(value) ? `${Math.round(value)}%` : `${value}%`;

const values = [25, 50, 75, 100];

export default memo(
  ({
    isMobile,
    percentage,
    onChange,
    onToggleDetails,
  }: {
    isMobile: boolean;
    percentage: number;
    onChange: (amount: number) => void;
    onToggleDetails: () => void;
  }) => {
    const marks = useMemo(
      () => [
        {
          value: 0,
          label: labelFormat(0),
        },
      ],
      []
    );

    const onPercentageChange = useCallback(
      (_: Event, value: number | number[]) => {
        if (Array.isArray(value)) {
          onChange(value[0]);
        } else {
          onChange(value);
        }
      },
      [onChange]
    );

    return (
      <Card>
        <Styled.Header>
          <Styled.Title variant="h6">
            {i18n.OrderFlowControlAmount}
          </Styled.Title>
          <Styled.DetailsControl variant="body2" onClick={onToggleDetails}>
            {i18n.OrderFlowCancelDetails}
          </Styled.DetailsControl>
        </Styled.Header>
        <CardContent sx={{ padding: 0 }}>
          <Styled.Amount sx={{ fontSize: isMobile ? "1.2rem" : "2.5rem" }}>
            {percentage}%
          </Styled.Amount>
          <Box p={2}>
            <Styled.AmountSlider
              defaultValue={100}
              getAriaValueText={labelFormat}
              marks={marks}
              onChange={onPercentageChange}
              value={percentage}
              valueLabelDisplay="auto"
              valueLabelFormat={labelFormat}
            />
          </Box>
          <Styled.Values direction="row" spacing={2}>
            {values.map((value) => (
              <Chip
                color={percentage === value ? "secondary" : undefined}
                key={`percentage-${value}`}
                label={`${value}%`}
                onClick={() => onChange(value)}
                variant="outlined"
              />
            ))}
          </Styled.Values>
        </CardContent>
      </Card>
    );
  }
);
