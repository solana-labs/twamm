import Avatar from "@mui/material/Avatar";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { styled } from "@mui/material/styles";

export const Header = styled(Toolbar)`
  justify-content: space-between;
  background-color: #121623;
`;

export const Logo = styled(Stack)`
  align-items: center;
`;

export const Image = styled(Avatar)`
  margin-right: 8px;
`;

export const Controls = styled(Stack)`
  flex-grow: 0;
  align-items: center;
`;

export const UtilsControl = styled(Card)`
  cursor: pointer;
  display: flex;
  padding: 4px;
`;

export const WalletButton = styled(WalletMultiButton)`
  background: #4bbeff;
  border-radius: 40px;
  width: 100%;
  color: #fff;
  display: flex;
  justify-content: center;

  &.wallet-adapter-button {
    background-color: ${({ theme }) => theme.palette.primary.main};
    white-space: nowrap;
  }
  &.wallet-adapter-button:not([disabled]):hover,
  &.wallet-adapter-button:focus,
  &.wallet-adapter-button:active {
    background-color: #4bbeff;
    color: #000;
  }
`;
