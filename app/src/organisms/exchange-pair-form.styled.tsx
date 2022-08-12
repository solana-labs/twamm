import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import { styled } from "@mui/material/styles";

export const TokenLabelBox = styled(Box)`
  color: ${({ theme }) => theme.palette.text.secondary};
  padding-bottom: ${({ theme }) => theme.spacing(1)};
  font-size: 14px;
  font-weight: 600;
`;

export const OperationImage = styled(Box)`
  color: ${({ theme }) => theme.palette.text.secondary};
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing(2)};
`;

export const OperationButton = styled(IconButton)`
  border: 1px solid ${({ theme }) => theme.palette.text.secondary};
  width: 30px;
  height: 30px;

  & > * {
    border-radius: 100%;
    padding: 3px;
    transform: rotate(90deg);
  }
`;

export const ConnectBox = styled(Box)`
  & .wallet-adapter-dropdown {
    width: 100%;
  }
`;

export const ConnectButton = styled(Button)`
  background-color: #4bbeff;
  border-radius: 40px;
  width: 100%;
  display: flex;
  justify-content: center;
  color: #000;
  &:hover,
  &:focus,
  &:active {
    color: #fff;
  }
`;
