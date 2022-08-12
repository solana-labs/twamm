import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import { styled } from "@mui/material/styles";

export const OperationImage = styled(Box)`
  color: ${({ theme }) => theme.palette.text.secondary};
  display: flex;
  justify-content: center;
`;

export const OperationButton = styled(IconButton)`
  border: 1px solid ${(p) => p.theme.palette.text.secondary};
  height: 30px;
  width: 30px;

  & > * {
    border-radius: 100%;
    padding: 3px;
  }
  & > *:hover {
    transform: rotate(180deg);
  }
`;
