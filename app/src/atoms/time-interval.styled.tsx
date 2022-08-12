import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { styled } from "@mui/material/styles";

export const Interval = styled(Box)`
  color: ${({ theme }) => theme.palette.text.primary};
`;

export const Label = styled(Box)`
  ${(p) => `
    font-size: ${p.theme.typography.overline.fontSize};
    font-weight: ${p.theme.typography.overline.fontWeight};
  `}
  display: flex;
  flex-direction: row;
  gap: 8px;

  svg {
    width: 16px;
    height: 16px;
  }
`;

export const InfoControl = styled(IconButton)`
  padding: 0;
`;
