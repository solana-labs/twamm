import Box from "@mui/material/Box";
import { styled } from "@mui/material/styles";

export const Container = styled(Box)`
  display: flex;
  justify-content: center;
  padding: ${(p) => p.theme.spacing(1)};
`;
