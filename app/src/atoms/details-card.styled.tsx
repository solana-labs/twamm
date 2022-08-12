import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";

export const Container = styled(Box)`
  justify-content: center;
  min-width: 125px;
  padding: ${(p) => p.theme.spacing(1)} ${(p) => p.theme.spacing(2)};
`;

export const Content = styled(Box)`
  padding: 2px;
  text-align: center;
  border: 0;
`;

export const Title = styled(Typography)`
  font-size: 14px;
  white-space: nowrap;
`;
