/* eslint-disable react/jsx-props-no-spreading */
import Box from "@mui/material/Box";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import Link from "@mui/material/Link";
import RefreshIcon from "@mui/icons-material/Refresh";
import Typography from "@mui/material/Typography";

import * as Styled from "./transaction-runner.styled";
import i18n from "../i18n";
import LogViewer from "../organisms/log-viewer";
import useBreakpoints from "../hooks/use-breakpoints";

const extractErrorMessage = (message: string) => {
  const msgAnchor = "Error Message:";
  const simulAnchor = "simulation failed:";

  let msgArr;
  if (message.includes(msgAnchor)) {
    msgArr = message.split(msgAnchor);
  } else if (message.includes(simulAnchor)) {
    msgArr = message.split(simulAnchor);
  }

  if (msgArr && msgArr.length > 1) return msgArr[1].trim();

  return message;
};

const ResponsiveContainer = ({ children, omitDesktop, ...props }: any) => {
  const { isMobile } = useBreakpoints();

  if (isMobile || omitDesktop) {
    return (
      <Styled.MobileContainer {...props}>{children}</Styled.MobileContainer>
    );
  }

  return (
    <Styled.DesktopContainer {...props}>{children}</Styled.DesktopContainer>
  );
};

export const Empty = () => (
  <Styled.Container p={2}>
    <Box pb={2}>
      <Styled.IdleIcon>
        <HourglassEmptyIcon />
      </Styled.IdleIcon>
    </Box>
    <Box pb={1}>
      <Styled.RunnerTitle variant="h5">{i18n.TxRunnerIdle}</Styled.RunnerTitle>
    </Box>
    <Typography textAlign="center" variant="body1">
      {i18n.TxRunnerIdleDescription}
    </Typography>
  </Styled.Container>
);

export const Progress = ({ info }: { info: string | undefined }) => (
  <Styled.Container p={2}>
    <Box pb={2}>
      <Styled.RefreshIcon>
        <RefreshIcon />
      </Styled.RefreshIcon>
    </Box>
    <Box pb={1}>
      <Styled.RunnerTitle variant="h5">
        {i18n.TxRunnerProgress}
      </Styled.RunnerTitle>
    </Box>
    <Typography textAlign="center" variant="body1">
      {info || i18n.TxRunnerProgressDescription}
    </Typography>
  </Styled.Container>
);

export const Success = ({
  signature,
  view,
}: {
  signature: string;
  view: (sig: string) => string;
}) => (
  <Styled.Container p={2}>
    <Box pb={2}>
      <Styled.SuccessIcon>
        <CheckCircleIcon />
      </Styled.SuccessIcon>
    </Box>
    <Box pb={1}>
      <Styled.RunnerTitle variant="h5">
        {i18n.TxRunnerSuccess}
      </Styled.RunnerTitle>
    </Box>
    <Typography textAlign="center" variant="body1">
      {i18n.TxRunnerSuccessDescription}
    </Typography>
    <Typography textAlign="center" variant="body1">
      <Link rel="noopener" target="_blank" href={view(signature)}>
        {i18n.TxRunnerTransactionDetails}
      </Link>
    </Typography>
  </Styled.Container>
);

export const Error = ({ error, logs }: { error: Error; logs?: string[] }) => (
  <ResponsiveContainer p={2} omitDesktop={!logs}>
    <Box pb={1}>
      <Styled.ErrorIcon>
        <ErrorIcon />
      </Styled.ErrorIcon>
    </Box>
    {error && (
      <Box pb={1}>
        <Styled.RunnerTitle variant="h5">
          {extractErrorMessage(error.message)}
        </Styled.RunnerTitle>
      </Box>
    )}
    <LogViewer logs={logs} />
  </ResponsiveContainer>
);
