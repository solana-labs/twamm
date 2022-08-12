import CancelIcon from "@mui/icons-material/Cancel";
import DoneIcon from "@mui/icons-material/Done";
import RefreshIcon from "@mui/icons-material/Refresh";
import UpdateIcon from "@mui/icons-material/Update";
import { useEffect, useMemo } from "react";

import * as Styled from "./transaction-progress.styled";
import useTxRunner from "../contexts/transaction-runner-context";
import { useSnackbar } from "../contexts/notification-context";

export interface Props {
  setOpen: (arg0: boolean) => void;
}

export default ({ setOpen }: Props) => {
  const { active, error, signature } = useTxRunner();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (active) {
      enqueueSnackbar("Transaction is in progress...", {
        variant: "info",
        autoHideDuration: 1e3,
      });
    }
    return () => {};
  }, [active, enqueueSnackbar]);

  const txStateIcon = useMemo(() => {
    if (error) return <CancelIcon />;
    if (signature) return <DoneIcon />;
    if (active) return <RefreshIcon />;
    return <UpdateIcon />;
  }, [active, error, signature]);

  return (
    <Styled.UtilsControl
      istxactive={active ? "true" : "false"}
      istxerror={error ? "true" : "false"}
      istxsuccess={signature ? "true" : "false"}
      onClick={() => setOpen(true)}
    >
      {txStateIcon}
    </Styled.UtilsControl>
  );
};
