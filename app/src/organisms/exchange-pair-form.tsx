import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import M, { Extra } from "easy-maybe/lib";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import { useCallback, useMemo } from "react";
import * as Styled from "./exchange-pair-form.styled";
import AmountField from "../atoms/amount-field";
import i18n from "../i18n";
import InTokenField from "../molecules/in-token-field";
import TokenSelect from "../atoms/token-select";
import TradeIntervals from "../molecules/trade-intervals";
import type { IntervalVariant } from "../domain/interval.d";
import useIndexedTIFs, { selectors } from "../contexts/tif-context";
import usePrice from "../hooks/use-price";

export default ({
  amount,
  primary,
  onABSwap,
  onASelect,
  onBSelect,
  onChangeAmount,
  onIntervalSelect,
  onSubmit,
  secondary,
  submitting,
}: {
  amount?: number;
  primary?: JupToken;
  onABSwap: () => void;
  onASelect: () => void;
  onBSelect: () => void;
  onChangeAmount: (arg0: number) => void;
  onIntervalSelect: (a: IntervalVariant, b: boolean) => void;
  onSubmit: () => void;
  secondary?: JupToken;
  submitting: boolean;
}) => {
  const [a, b] = [primary, secondary];

  const { tifs: intervalTifs, selected } = useIndexedTIFs();

  const { isInstantOrder } = useMemo(
    () => selectors(selected ? { selected } : undefined),
    [selected]
  );

  const isInstantEnabled = isInstantOrder ? true : undefined;

  const instantParams = M.andMap(
    ([c, d, e]) => ({
      id: c.symbol,
      vsToken: d.symbol,
      vsAmount: String(e),
    }),
    Extra.combine3([M.of(a), M.of(b), M.of(amount)])
  );

  const instantPrice = usePrice(
    M.withDefault(
      undefined,
      M.andMap(
        ([params]) => params,
        Extra.combine2([instantParams, M.of(isInstantEnabled)])
      )
    )
  );

  const instantAmount = M.withDefault(
    0,
    M.andMap(
      ([q, price]) => q * price,
      Extra.combine2([M.of(amount), M.of(instantPrice.data)])
    )
  );

  const handleChangeAmount = (value: number) => {
    onChangeAmount(value);
  };
  const handleSwap = () => {
    onABSwap();
  };
  const handleInputSelect = () => {
    onASelect();
  };
  const handleOutputSelect = () => {
    onBSelect();
  };
  const handleIntervalSelect = useCallback(
    (indexed: IntervalVariant, schedule: boolean) => {
      onIntervalSelect(indexed, schedule);
    },
    [onIntervalSelect]
  );

  return (
    <form onSubmit={onSubmit} id="exchange-form">
      <Styled.TokenLabelBox>{i18n.TradeOrderYouPay}</Styled.TokenLabelBox>
      <InTokenField
        address={a?.address}
        name={a?.symbol}
        onChange={handleChangeAmount}
        onSelect={handleInputSelect}
        src={a?.logoURI}
      />
      <Styled.OperationImage>
        <Styled.OperationButton disabled={!a || !b} onClick={handleSwap}>
          <SyncAltIcon />
        </Styled.OperationButton>
      </Styled.OperationImage>
      <Styled.TokenLabelBox>{i18n.TradeOrderYouReceive}</Styled.TokenLabelBox>
      <Box pb={2}>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={4}>
            <TokenSelect
              alt={b?.symbol}
              disabled={!a}
              image={b?.logoURI}
              label={b?.symbol}
              onClick={handleOutputSelect}
            />
          </Grid>
          {isInstantEnabled && Boolean(instantAmount) && (
            <Grid item xs={12} sm={8}>
              <AmountField disabled amount={Number(instantAmount.toFixed(9))} />
            </Grid>
          )}
        </Grid>
      </Box>
      <Box py={2}>
        <TradeIntervals
          disabled={submitting}
          indexedTifs={intervalTifs}
          onSelect={handleIntervalSelect}
          selected={selected}
        />
      </Box>
    </form>
  );
};
