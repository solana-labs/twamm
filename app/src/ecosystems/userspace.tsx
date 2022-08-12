import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { address } from "@twamm/client.js";
import { ErrorBoundary } from "react-error-boundary";
import { OrderSide } from "@twamm/types/lib";
import { useCallback, useMemo, useState } from "react";

import ErrorFallback from "../atoms/error-fallback";
import ModeToggle, { modes } from "../atoms/mode-toggle";
import styles from "./userspace.module.css";
import TokenPairs from "../organisms/token-pairs";
import AccountOrders from "../organisms/account-orders";
import TokenExchange, { TradeStruct } from "../organisms/token-exchange";
import useBreakpoints from "../hooks/use-breakpoints";

const DEFAULT_MODE = modes.get("exchange") as string;

const DEFAULT_TRADE = {
  amount: 0,
  pair: [
    address.NATIVE_TOKEN_ADDRESS,
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  ] as AddressPair,
  type: OrderSide.buy,
};

export default () => {
  const [mode, setMode] = useState<string>(DEFAULT_MODE);
  const [trade, setTrade] = useState<TradeStruct>(DEFAULT_TRADE);

  const { isMobile } = useBreakpoints();

  const onModeChange = useCallback(
    (nextMode: string) => {
      setMode(nextMode);
    },
    [setMode]
  );

  const onTradeChange = useCallback((next: TradeStruct) => {
    setTrade(next);
  }, []);

  const component = useMemo(() => {
    if (mode === modes.get("pools")) return <TokenPairs />;

    if (mode === modes.get("orders")) return <AccountOrders />;

    if (mode === modes.get("exchange"))
      return <TokenExchange trade={trade} onTradeChange={onTradeChange} />;

    return null;
  }, [mode, onTradeChange, trade]);

  const maxWidth = useMemo(
    () => (mode === modes.get("exchange") ? "sm" : undefined),
    [mode]
  );

  return (
    <Container maxWidth={maxWidth}>
      <Box pt={isMobile ? 4 : 10}>
        <Box className={styles.controls} p={2}>
          <ModeToggle mode={mode} onChange={onModeChange} />
        </Box>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          {component}
        </ErrorBoundary>
      </Box>
    </Container>
  );
};
