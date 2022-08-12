import Box from "@mui/material/Box";
import { styled } from "@mui/material/styles";

export const Container = styled(Box)`
  padding: ${(p) => p.theme.spacing(2)};
`;

export const MobileContainer = styled(Box)`
  padding: ${(p) => p.theme.spacing(2)};
  padding-top: ${(p) => p.theme.spacing(4)};
`;

export const ContentHeader = styled(Box)`
  ${(p) => p.theme.typography.h5};
  color: ${(p) => p.theme.palette.common.white};
`;
