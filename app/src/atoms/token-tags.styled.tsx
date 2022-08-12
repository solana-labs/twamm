import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import { styled } from "@mui/material/styles";

export const Tags = styled(Stack)`
  flex-wrap: wrap;
`;

export const Tag = styled(Chip)`
  border-radius: 6px;
  cursor: pointer;
`;
