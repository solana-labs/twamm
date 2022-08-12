import type { MouseEvent, ChangeEvent, SyntheticEvent } from "react";
import Box from "@mui/material/Box";
import ButtonGroup from "@mui/material/ButtonGroup";
import InfoIcon from "@mui/icons-material/Info";
import { useCallback, useMemo, useRef } from "react";

import * as Styled from "./time-interval.styled";
import i18n from "../i18n";
import Intervals from "../molecules/interval-button-group";
import Tooltip, { TooltipRef } from "./tooltip";
import type { IndexedTIF } from "../domain/interval.d";

export default ({
  disabled,
  info,
  label,
  onSelect,
  value,
  valueIndex,
  values,
}: {
  disabled: boolean;
  info?: string;
  label: string;
  onSelect: (arg0: number) => void;
  value?: number | IndexedTIF;
  valueIndex?: number;
  values?: number[];
}) => {
  const tooltipRef = useRef<TooltipRef>();

  const handleTooltipOpen = useCallback((event: MouseEvent<HTMLElement>) => {
    tooltipRef.current?.toggle(event.currentTarget);
  }, []);

  const intervalValues = useMemo(() => values, [values]);

  const onIntervalSelect = useCallback(
    (e: SyntheticEvent<HTMLElement>) => {
      const event: unknown = e;
      const { target } = event as ChangeEvent<HTMLElement>;

      onSelect(Number(target.getAttribute("data-interval")));
    },
    [onSelect]
  );

  return (
    <Styled.Interval>
      <Box pb={1}>
        <Styled.Label>
          {label}
          <Styled.InfoControl onClick={handleTooltipOpen}>
            <InfoIcon />
          </Styled.InfoControl>
        </Styled.Label>
        {!info?.length ? null : <Tooltip ref={tooltipRef} text={info} />}
      </Box>
      <ButtonGroup variant="outlined" aria-label={i18n.AriaLabelIntervals}>
        <Intervals
          disabled={disabled}
          onClick={onIntervalSelect}
          value={value}
          valueIndex={valueIndex}
          valuesOpt={1} // add the number of optional values to adjust the interval to select
          values={intervalValues}
        />
      </ButtonGroup>
    </Styled.Interval>
  );
};
