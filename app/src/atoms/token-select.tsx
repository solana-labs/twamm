import type { MouseEvent } from "react";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import Box from "@mui/material/Box";
import CancelIcon from "@mui/icons-material/Cancel";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import { useRef } from "react";

import * as Styled from "./token-select.styled";
import i18n from "../i18n";
import Tooltip, { TooltipRef } from "./tooltip";
import useBreakpoints from "../hooks/use-breakpoints";

export default ({
  alt,
  disabled = false,
  image,
  label,
  onClick,
}: {
  alt?: string;
  disabled?: boolean;
  image?: string;
  label?: string;
  onClick: (e: MouseEvent) => void;
}) => {
  const tooltipRef = useRef<TooltipRef>();

  const { isMobile } = useBreakpoints();

  const handlePopoverOpen = (event: MouseEvent<HTMLElement>) => {
    tooltipRef.current?.open(event.currentTarget);
  };

  const handleClick = (e: MouseEvent<HTMLElement>) => {
    tooltipRef.current?.close();
    onClick(e);
  };

  return (
    <Box>
      <Styled.TokenField
        direction="row"
        onClick={disabled ? handlePopoverOpen : handleClick}
        disabled={disabled}
        sx={isMobile ? {} : { minHeight: 79 }}
      >
        {isMobile ? (
          <Styled.MobileTokenIcon alt={alt} src={image}>
            {disabled ? <CancelIcon /> : <QuestionMarkIcon />}
          </Styled.MobileTokenIcon>
        ) : (
          <Styled.TokenIcon alt={alt} src={image}>
            {disabled ? <CancelIcon /> : <QuestionMarkIcon />}
          </Styled.TokenIcon>
        )}
        <Styled.TokenName>{label ?? "-"}</Styled.TokenName>
        <Styled.TokenControl>
          <ArrowDropDownIcon />
        </Styled.TokenControl>
      </Styled.TokenField>
      {disabled && <Tooltip ref={tooltipRef} text={i18n.TokenSelectTooltip} />}
    </Box>
  );
};
