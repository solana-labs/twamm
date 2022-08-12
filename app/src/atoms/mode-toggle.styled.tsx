import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { styled } from "@mui/material/styles";

const styledButton = styled(ToggleButton);

const BORDER_RADIUS = "40px";
const BORDER = "1px solid rgba(255, 255, 255, 0.2)";

export const ModeButtonGroup = styled(ToggleButtonGroup)`
  border-radius: 40px;
  background: rgba(255, 255, 255, 0.04);
  & .MuiToggleButton-root:hover {
    background-color: transparent;
  }
`;

export const ModeButton = styledButton`
  color: #fff;
  border-radius: 24px;
  padding: 14px 34px;
  text-transform: none;
  border: 1px solid transparent;
  font-weight: 600;
  white-space: nowrap;

  ${(p) =>
    p?.selected
      ? `
    background-color: #121623 !important;
    border: ${BORDER};
    border-bottom-left-radius: ${BORDER_RADIUS} !important;
    border-bottom-right-radius: ${BORDER_RADIUS} !important;
    border-left: ${BORDER} !important;
    border-top-left-radius: ${BORDER_RADIUS} !important;
    border-top-right-radius: ${BORDER_RADIUS} !important;
    color: #fff !important;
    `
      : undefined}
`;
