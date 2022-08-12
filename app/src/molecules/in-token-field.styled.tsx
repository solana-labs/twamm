import Box from "@mui/material/Box";
import { styled } from "@mui/material/styles";

export const TokenField = styled(Box)`
  background: rgba(255, 255, 255, 0.04);
  padding: 9px 11px 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
`;

export const TokenTotal = styled(Box)`
  color: ${(p) => p.theme.palette.text.secondary};
  font-size: 13px;
  font-weight: 600;
  padding-top: 10px;
  text-align: right;
`;
