import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";

import * as TxState from "../atoms/transaction-runner";
import useTxRunner from "../contexts/transaction-runner-context";

type AnchorError = Error & { logs?: string[] };

const Content = ({
  hasError,
  info,
  isFinished,
  isLoading,
  isReady,
  signature,
  viewExplorer,
}: {
  info: string | undefined;
  isReady: boolean;
  isLoading: boolean;
  isFinished: boolean;
  hasError: AnchorError | undefined;
  signature: string | undefined;
  viewExplorer: (sig: string) => string;
}) => {
  if (isLoading) return <TxState.Progress info={info} />;

  if (hasError) {
    return <TxState.Error error={hasError} logs={hasError.logs} />;
  }

  if (isFinished)
    return (
      <TxState.Success signature={signature as string} view={viewExplorer} />
    );

  if (isReady) return <TxState.Empty />;

  return <TxState.Empty />;
};

export default ({ id }: { id: string }) => {
  const { active, error, info, signature, viewExplorer } = useTxRunner();

  const state = useMemo(
    () => ({
      hasError: error,
      info,
      isFinished: Boolean(signature),
      isLoading: !error && active && !signature,
      isReady: !error && !active && !signature,
    }),
    [active, error, info, signature]
  );

  return (
    <Box p={2}>
      <Typography id={id} variant="h5" pb={2}>
        <Content
          hasError={state.hasError}
          info={state.info}
          isReady={state.isReady}
          isLoading={state.isLoading}
          isFinished={state.isFinished}
          signature={signature}
          viewExplorer={viewExplorer}
        />
      </Typography>
    </Box>
  );
};
