import type { SyntheticEvent } from "react";
import { isNil } from "ramda";

import * as Styled from "./interval-button-group.styled";
import type { IntervalVariant } from "../domain/interval.d";
import IntervalButton from "../atoms/interval-button";
import { formatInterval } from "../utils/index";
import { SpecialIntervals } from "../domain/interval.d";

const Instant = (props: {
  disabled: boolean;
  onSelect: (e: SyntheticEvent<HTMLElement>) => void;
  selected: boolean;
  value: Voidable<number>;
  values: Voidable<any>;
}) => {
  if (!props.values) return null;

  return (
    <IntervalButton
      disabled={props.disabled}
      onClick={props.onSelect}
      selected={props.selected}
      text="Instant"
      value={props.value}
    />
  );
};

export default ({
  disabled,
  onClick,
  value,
  valueIndex,
  valuesOpt,
  values,
}: {
  disabled: boolean;
  onClick: (e: SyntheticEvent<HTMLElement>) => void;
  value?: IntervalVariant;
  valueIndex?: number;
  valuesOpt: number;
  values?: number[];
}) => {
  if (!values) return <Styled.BlankIntervals variant="rectangular" />;

  return (
    <>
      {values
        .map((intervalValue: number, index) => {
          const isWildcardSelected =
            value === SpecialIntervals.NO_DELAY && index === 0;
          const isIntervalSelected =
            !isNil(valueIndex) && index === valueIndex + valuesOpt;

          return {
            value: intervalValue,
            selected: isWildcardSelected || isIntervalSelected,
          };
        })
        .filter((d) => d.value !== 0)
        .map((d) => {
          const text = formatInterval(d.value);
          const isComplementaryInterval = values.length === 1 && values[0] > 0;
          // make the interval selected when using scheduled interval

          const isSelected = d.selected || isComplementaryInterval;

          if (d.value === SpecialIntervals.INSTANT)
            return (
              <Instant
                disabled={disabled}
                key={`interval-${d.value}`}
                onSelect={onClick}
                selected={value === SpecialIntervals.INSTANT}
                value={d.value}
                values={values}
              />
            );

          return (
            <IntervalButton
              disabled={disabled}
              key={`interval-${d.value}`}
              onClick={onClick}
              selected={isSelected}
              text={text}
              value={d.value}
            />
          );
        })}
    </>
  );
};
