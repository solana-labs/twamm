import type { ReactNode } from "react";
import type { SxProps, Theme } from "@mui/material";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";

import * as Styled from "./wallet-guard.styled";

const ConnectButton = ({ sx }: { sx?: SxProps<Theme> }) => (
  <Styled.ConnectBox sx={sx}>
    <Styled.ConnectButton>Connect Wallet</Styled.ConnectButton>
  </Styled.ConnectBox>
);

export const ConnectWalletGuard = ({
  append = true,
  children,
  sx,
}: {
  append?: boolean;
  children?: ReactNode;
  sx?: SxProps<Theme>;
}) => {
  const { connected, publicKey } = useWallet();

  const isConnected = useMemo(
    () => Boolean(connected) && publicKey !== null,
    [connected, publicKey]
  );
  const address = useMemo(
    () => (isConnected ? publicKey?.toBase58() : undefined),
    [publicKey, isConnected]
  );

  if (!isConnected || !address) {
    return !append ? (
      <ConnectButton sx={sx} />
    ) : (
      <>
        {children}
        <ConnectButton sx={sx} />
      </>
    );
  }

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>;
};
