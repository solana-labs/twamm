import Box from "@mui/material/Box";
import M from "easy-maybe/lib";
import { useCallback, useMemo, useState } from "react";

import i18n from "../i18n";
import TimeInterval from "../atoms/time-interval";
import type { IntervalVariant, PoolTIF } from "../domain/interval.d";
import useIndexedTIFs from "../contexts/tif-context";
import { SpecialIntervals } from "../domain/interval.d";

export default ({
  disabled,
  indexedTifs,
  onSelect,
  selected,
}: {
  disabled: boolean;
  indexedTifs: Voidable<PoolTIF[]>;
  onSelect: (arg0: IntervalVariant, arg1: boolean) => void;
  selected?: IntervalVariant;
}) => {
  const { periodTifs, scheduleTifs, scheduleSelected, periodSelected } =
    useIndexedTIFs();

  const [instant, setInstant] = useState<number>();

  const onScheduleSelect = useCallback(
    (value: number) => {
      if (instant) setInstant(undefined);

      M.tap((itifs) => {
        const indexedTIF = itifs.find((itif) => itif.left === value);

        if (value === SpecialIntervals.NO_DELAY) {
          onSelect(value, false);
        } else if (indexedTIF) {
          onSelect(indexedTIF, true);
        }
      }, M.of(indexedTifs));
    },
    [indexedTifs, instant, onSelect]
  );

  const onPeriodSelect = useCallback(
    (value: number) => {
      M.tap((itifs) => {
        const indexedTIF = itifs.find((itif) => itif.left === value);

        if (value === SpecialIntervals.INSTANT) {
          onSelect(value, false);
        } else if (indexedTIF) {
          onSelect(indexedTIF, false);
        }
      }, M.of(indexedTifs));
    },
    [indexedTifs, onSelect]
  );

  const values = useMemo(() => {
    let period;
    let periodIndex;
    let schedule;
    let scheduleIndex;

    if (selected === SpecialIntervals.NO_DELAY) {
      schedule = -1;
      scheduleIndex = -1;
    } else if (selected === SpecialIntervals.INSTANT) {
      schedule = -1;
      period = -2;
      scheduleIndex = -1;
      periodIndex = -2;
    } else if (selected?.tif) {
      schedule = scheduleSelected;
      period = periodSelected;
      if (scheduleSelected && typeof scheduleSelected !== "number") {
        scheduleIndex = indexedTifs?.findIndex(
          (t) => t.tif === scheduleSelected.tif
        );
      }
      if (periodSelected && typeof periodSelected !== "number") {
        periodIndex = indexedTifs?.findIndex(
          (t) => t.tif === periodSelected.tif
        );
      }
    }

    return { schedule, period, periodIndex, scheduleIndex };
  }, [indexedTifs, periodSelected, selected, scheduleSelected]);

  return (
    <>
      <Box pb={2}>
        <TimeInterval
          disabled={disabled}
          info={i18n.OrderControlsIntervalsScheduleOrderInfo}
          label={i18n.OrderControlsIntervalsScheduleOrder}
          onSelect={onScheduleSelect}
          value={values.schedule}
          valueIndex={values.scheduleIndex}
          values={scheduleTifs}
        />
      </Box>
      <Box pb={2}>
        <TimeInterval
          disabled={disabled}
          info={i18n.OrderControlsIntervalsExecutionPeriodInfo}
          label={i18n.OrderControlsIntervalsExecutionPeriod}
          onSelect={onPeriodSelect}
          value={values.period}
          valueIndex={values.periodIndex}
          values={periodTifs}
        />
      </Box>
    </>
  );
};
