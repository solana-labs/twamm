import Box from "@mui/material/Box";
import M from "easy-maybe/lib";
import type { Counter } from "@twamm/types";
import { Form } from "react-final-form";
import { OrderSide } from "@twamm/types/lib";
import { useCallback, useMemo, useState } from "react";

import * as formHelpers from "../domain/order";
import ExchangePairForm from "./exchange-pair-form";
import ExecuteJupiterOrder from "./jupiter-order-progress";
import ExecuteProgramOrder from "./program-order-progress";
import type { IntervalVariant, PoolTIF } from "../domain/interval.d";
import type { ValidationErrors } from "../domain/order";
import useIndexedTIFs, { selectors } from "../contexts/tif-context";

export default ({
  primary,
  secondary,
  intervalTifs,
  onABSwap,
  onASelect,
  onBSelect,
  poolCounters: counters,
  poolTifs,
  side: s,
  tokenA,
  tokenADecimals,
  tokenB,
  tokenPair: pair,
}: {
  primary?: TokenInfo;
  secondary?: TokenInfo;
  intervalTifs?: PoolTIF[];
  onABSwap: () => void;
  onASelect: () => void;
  onBSelect: () => void;
  poolCounters?: Counter[];
  poolTifs?: number[];
  side?: OrderSide;
  tokenA?: string;
  tokenADecimals?: number;
  tokenB?: string;
  tokenPair?: TokenTuple<JupToken>;
}) => {
  const { selected: selectedTif, scheduled, setTif } = useIndexedTIFs();

  const [amount, setAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [prepareError, setPrepareError] = useState<Error>();

  const tifs = M.withDefault(undefined, M.of(poolTifs));
  const poolCounters = M.withDefault(undefined, M.of(counters));
  const side = M.withDefault(undefined, M.of(s));
  const tokenPair = M.withDefault(undefined, M.of(pair));

  const onChangeAmount = useCallback(
    (value: number) => {
      setAmount(value);
    },
    [setAmount]
  );

  const onIntervalSelect = useCallback(
    (indexedTIF: IntervalVariant, schedule: boolean) => {
      setTif(indexedTIF, schedule);
    },
    [setTif]
  );

  const errors = useMemo<Voidable<ValidationErrors>>(
    () =>
      formHelpers.validate(amount, selectedTif, tokenA, tokenB, scheduled) ||
      (prepareError ? { tif: prepareError } : undefined),
    [amount, prepareError, selectedTif, scheduled, tokenA, tokenB]
  );

  const jupiterParams = useMemo(() => {
    if (!side) return undefined;
    if (!selectedTif) return undefined;
    if (!tokenADecimals) return undefined;
    if (!tokenPair) return undefined;

    const [a, b] = tokenPair;
    const params = formHelpers.prepare4Jupiter(
      side,
      amount,
      tokenADecimals,
      a.address,
      b.address
    );

    return params;
  }, [amount, side, selectedTif, tokenPair, tokenADecimals]);

  const programParams = useMemo(() => {
    if (!poolCounters) return undefined;
    if (!selectedTif) return undefined;
    if (!tifs) return undefined;
    if (!tokenADecimals) return undefined;
    if (!side) return undefined;
    if (!tokenPair) return undefined;

    if (typeof selectedTif === "number") return undefined;

    const [a, b] = tokenPair;
    const timeInForce = selectedTif.tif;
    const nextPool = scheduled;

    try {
      const params = formHelpers.prepare4Program(
        timeInForce,
        nextPool,
        intervalTifs,
        side,
        amount,
        tokenADecimals,
        a.address,
        b.address,
        tifs,
        poolCounters
      );
      setPrepareError(undefined);
      return params;
    } catch (e: unknown) {
      setPrepareError(e as Error);
      return undefined;
    }
  }, [
    amount,
    intervalTifs,
    poolCounters,
    selectedTif,
    scheduled,
    side,
    tifs,
    tokenPair,
    tokenADecimals,
  ]);

  const selected = selectors(
    selectedTif ? { selected: selectedTif } : undefined
  );

  const onSubmit = () => {
    setSubmitting(true);
  };

  const onSuccess = () => {
    setSubmitting(false);
  };

  return (
    <Form onSubmit={onSubmit} validate={() => errors}>
      {({ handleSubmit, valid }) => (
        <>
          <ExchangePairForm
            amount={amount}
            primary={primary}
            onABSwap={onABSwap}
            onASelect={onASelect}
            onBSelect={onBSelect}
            onChangeAmount={onChangeAmount}
            onIntervalSelect={onIntervalSelect}
            onSubmit={handleSubmit}
            secondary={secondary}
            submitting={submitting}
          />
          <Box py={3}>
            {selected.isInstantOrder ? (
              <ExecuteJupiterOrder
                disabled={!jupiterParams || !valid || submitting}
                form="exchange-form"
                onSuccess={onSuccess}
                params={jupiterParams}
                progress={submitting}
                validate={() => errors}
              />
            ) : (
              <ExecuteProgramOrder
                disabled={!programParams || !valid || submitting}
                form="exchange-form"
                onSuccess={onSuccess}
                params={programParams}
                progress={submitting}
                scheduled={scheduled}
                validate={() => errors}
              />
            )}
          </Box>
        </>
      )}
    </Form>
  );
};
