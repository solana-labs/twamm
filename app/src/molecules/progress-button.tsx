import { useMemo } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import * as Styled from "./progress-button.styled";
import { ConnectWalletGuard } from "../organisms/wallet-guard";

export interface Props {
  disabled: boolean;
  form?: string;
  loading?: boolean;
  onClick?: () => void;
  text?: string;
}

export default ({ disabled, form, loading = false, onClick, text }: Props) => {
  const sx = useMemo(() => ({ marginLeft: "8px" }), []);

  return (
    <ConnectWalletGuard append={false}>
      <Styled.ActionButton
        form={form}
        disabled={disabled}
        onClick={onClick}
        type="submit"
      >
        {text}
        {loading ? <CircularProgress sx={sx} size={20} /> : undefined}
      </Styled.ActionButton>
    </ConnectWalletGuard>
  );
};
