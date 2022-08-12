import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";

export const Container = styled(Box)`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

export const DesktopContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 90vw;
`;

export const MobileContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

export const RunnerTitle = styled(Typography)`
  text-align: center;
`;

export const Icon = styled(Box)`
  align-items: center;
  border-radius: 100%;
  display: flex;
  height: 60px;
  justify-content: center;
  margin: 0 auto;
  width: 60px;

  & > svg {
    width: 65%;
    height: 65%;
  }
`;

export const IdleIcon = styled(Icon)`
  border: 1px solid ${({ theme }) => theme.palette.text.primary};
  color: ${({ theme }) => theme.palette.text.primary};
`;

export const RefreshIcon = styled(Icon)`
  color: #4bbeff;

  & > svg {
    animation: rotation infinite 2s linear;
  }
`;

export const SuccessIcon = styled(Icon)`
  color: #70efcb;
`;

export const ErrorIcon = styled(Icon)`
  color: ${({ theme }) => theme.palette.error.main};
`;
