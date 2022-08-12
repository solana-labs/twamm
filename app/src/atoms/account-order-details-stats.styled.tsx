import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import { styled } from "@mui/material/styles";

export const Container = styled(Box)`
  padding: ${({ theme }) => theme.spacing(2)};
`;

export const Stat = styled(Card)``;

export const Column = styled(Grid)`
  display: flex;
  flex-direction: column;
`;
