import type { BoxProps } from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import { styled } from "@mui/material/styles";

interface DisabledBoxProps extends BoxProps {
  disabled?: boolean;
}

export const TokenField = styled(Stack)`
  border-radius: 16px;
  display: flex;
  flex-direction: row;
  flex-grow: 0;
  align-items: center;
  cursor: pointer;
  ${(p: DisabledBoxProps) => (p.disabled ? `cursor: not-allowed;` : undefined)}
`;

export const TokenIcon = styled(Avatar)`
  width: 60px;
  height: 60px;
  margin-right: 12px;
`;

export const MobileTokenIcon = styled(Avatar)`
  width: 30px;
  height: 30px;
  margin-right: 4px;
`;

export const TokenName = styled("span")`
  text-transform: uppercase;
  color: #fff;
`;

export const TokenControl = styled("div")`
  color: #fff;
  width: 24px;
  height: 24px;
  margin-left: 4px;
`;
