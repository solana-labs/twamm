import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";

export const LiquidityItem = styled(Box)`
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: ${(p) => p.theme.spacing(1)};
`;

export const ItemAmount = styled(Typography)`
  font-size: 1rem;
`;

export const ItemToken = styled(Box)`
  padding-left: ${(p) => p.theme.spacing(1)};
  padding-right: ${(p) => p.theme.spacing(1)};
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const TokenImage = styled(Avatar)`
  height: 24px;
  width: 24px;
`;

export const TokenName = styled(Box)`
  color: ${(p) => p.theme.palette.text.primary};
  font-weight: 600;
  font-size: 1rem;
  padding-left: ${(p) => p.theme.spacing(1)};
`;

export const RateInfo = styled(Box)`
  padding: ${(p) => p.theme.spacing(1)};
`;

export const RateItem = styled(Typography)`
  text-align: right;
`;
