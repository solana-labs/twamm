import type { SyntheticEvent } from "react";
import * as Styled from "./interval-button.styled";
import useBreakpoints from "../hooks/use-breakpoints";

interface Props {
  disabled?: boolean;
  onClick: (e: SyntheticEvent<HTMLElement>) => void;
  selected?: boolean;
  text: string;
  value?: number;
}

const SelectableButton = (props: Omit<Props, "selected">) => {
  const { isMobile } = useBreakpoints();

  return isMobile ? (
    <Styled.MobileSelectedScheduleButton
      data-interval={props.value}
      key={props.value}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.text}
    </Styled.MobileSelectedScheduleButton>
  ) : (
    <Styled.SelectedScheduleButton
      data-interval={props.value}
      key={props.value}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.text}
    </Styled.SelectedScheduleButton>
  );
};

const Button = (props: Omit<Props, "selected">) => {
  const { isMobile } = useBreakpoints();

  return isMobile ? (
    <Styled.MobileScheduleButton
      data-interval={props.value}
      key={props.value}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.text}
    </Styled.MobileScheduleButton>
  ) : (
    <Styled.ScheduleButton
      data-interval={props.value}
      key={props.value}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.text}
    </Styled.ScheduleButton>
  );
};

export default (props: Props) => {
  if (props.selected)
    return (
      <SelectableButton
        value={props.value}
        disabled
        onClick={props.onClick}
        text={props.text}
      />
    );

  return (
    <Button
      disabled={props.disabled}
      onClick={props.onClick}
      text={props.text}
      value={props.value}
    />
  );
};
