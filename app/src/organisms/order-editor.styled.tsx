import Paper from "@mui/material/Paper";
import { styled } from "@mui/material/styles";

export const Swap = styled(Paper)`
  border: 1px solid ${({ theme }) => theme.palette.action.selected};
`;
