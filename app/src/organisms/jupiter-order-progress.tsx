import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import M, { Extra } from "easy-maybe/lib";
import { OrderSide as OrderSides } from "@twamm/types/lib";
import { useCallback, useMemo } from "react";
import Button from "../molecules/progress-button";
import useJupiter, { withCtx } from "../contexts/jupiter-connection-context";
import useSwap from "../hooks/use-swap-order-via-jupiter";
import useSwapRoutes from "../hooks/use-swap-routes-from-jup";

function OrderProgress(props: {
  disabled: boolean;
  form?: string;
  onSuccess: () => void;
  params:
    | {
        amount: number;
        aMint: string;
        bMint: string;
        decimals: number;
        side: OrderSides;
      }
    | undefined;
  progress: boolean;
  validate: () => { [key: string]: Error } | undefined;
}) {
  const { execute } = useSwap();
  const { ready } = useJupiter();

  const tokenPair = M.andMap(
    (p) =>
      OrderSides.defaultSide === p.side
        ? [p.aMint, p.bMint]
        : [p.bMint, p.aMint],
    M.of(props.params)
  );

  const swapParams = M.withDefault(
    undefined,
    M.andMap(
      ([pair, p]) => ({
        amount: p.amount,
        inputMint: pair[0],
        outputMint: pair[1],
        decimals: p.decimals,
      }),
      Extra.combine3([
        tokenPair,
        M.of(props.params),
        M.of(
          props.params?.amount && props.params.amount > 0 ? true : undefined
        ),
      ])
    )
  );

  const routes = useSwapRoutes(swapParams);

  const onClick = useCallback(async () => {
    if (!routes.data) throw new Error("Absent routes");

    const routesData = routes.data.routes;

    await execute(routesData);

    props.onSuccess();
  }, [execute, props, routes.data]);

  const loading = M.withDefault(
    false,
    M.andMap(([rtdt, rdy, prms]) => {
      const isLoaded = rtdt && rdy;
      const isLoading = prms.amount > 0 && !isLoaded;

      return isLoading;
    }, Extra.combine3([M.of(routes.data), M.of(ready), M.of(swapParams)]))
  );

  const errors = useMemo(() => props.validate(), [props]);

  const isErrorsVisible = errors && Boolean(swapParams);

  return (
    <>
      <Button
        disabled={loading || props.disabled || routes.error}
        form={props.form}
        loading={loading || props.progress}
        onClick={onClick}
        text="Exchange"
      />
      {!routes.error ? null : (
        <Box pt={1}>
          <Alert severity="error">{routes.error.message}</Alert>
        </Box>
      )}
      {isErrorsVisible ? (
        <Box pt={1}>
          <Alert severity="error">
            <>
              {[...Object.keys(errors)].map((key) => (
                <div key={key}>{errors[key].message}</div>
              ))}
            </>
          </Alert>
        </Box>
      ) : null}
    </>
  );
}

export default withCtx<Parameters<typeof OrderProgress>[0]>(OrderProgress);
