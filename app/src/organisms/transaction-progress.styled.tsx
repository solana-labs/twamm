import type { CardProps } from "@mui/material/Card";
import type { Theme } from "@mui/material/styles";
import Card from "@mui/material/Card";
import { styled } from "@mui/material/styles";

interface ActiveCardProps extends CardProps {
  istxactive?: "true" | "false";
  istxerror?: "true" | "false";
  istxsuccess?: "true" | "false";
}

export const UtilsControl = styled(Card)`
  cursor: pointer;
  display: flex;
  padding: 4px;

  ${(params: ActiveCardProps) =>
    params.istxactive === "true" &&
    params.istxerror === "false" &&
    params.istxsuccess === "false" &&
    `
    & > svg {
      animation: rotation infinite 2s linear;
    }
  `}

  ${(params: ActiveCardProps & { theme: Theme }) =>
    params.istxerror === "true" &&
    `
    & > svg {
      color: ${params.theme.palette.error.main};
    }
  `}

  ${(params: ActiveCardProps & { theme: Theme }) =>
    params.istxsuccess === "true" &&
    `
    & > svg {
      color: ${params.theme.palette.success.main};
    }
  `};
`;
