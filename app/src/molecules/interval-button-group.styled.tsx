import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { styled } from "@mui/material/styles";

export const BlankIntervals = styled(Skeleton)`
  border-radius: 8px;
  height: 26.5px;
  width: 50%;
`;

export const Interval = styled(Box)`
  color: ${({ theme }) => theme.palette.text.primary};
`;
