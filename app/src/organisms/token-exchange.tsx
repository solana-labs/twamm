import { useCallback, useEffect } from "react";
import { OrderSide } from "@twamm/types/lib";
import M, { Extra } from "easy-maybe/lib";
import OrderEditor from "./order-editor";
import useAddressPairs from "../hooks/use-address-pairs";
import useJupTokensByMint from "../hooks/use-jup-tokens-by-mint";
import useTokenExchange, { action as A } from "../hooks/use-token-exchange";
import { Provider as TIFProvider } from "../contexts/tif-context";

export type TradeStruct = {
  amount: number;
  pair: AddressPair;
  type: OrderSide;
};

export default (props: {
  onTradeChange: (arg0: TradeStruct) => void;
  trade: TradeStruct;
}) => {
  const tokenPairs = useAddressPairs();
  const tokenPair = useJupTokensByMint(props.trade.pair);

  const [state, dispatch] = useTokenExchange();

  useEffect(() => {
    M.andMap(([pairs, pair, type]) => {
      dispatch(A.init({ pairs, pair, type }));
    }, Extra.combine3([M.of(tokenPairs.data), M.of(tokenPair.data), M.of(props.trade.type)]));

    return () => {};
  }, [dispatch, props.trade, tokenPairs.data, tokenPair.data]);

  const onSelectA = useCallback(
    (token: TokenInfo) => {
      dispatch(A.selectA({ token }));
    },
    [dispatch]
  );

  const onSelectB = useCallback(
    (token: TokenInfo) => {
      dispatch(A.selectB({ token }));
    },
    [dispatch]
  );

  const onSwap = useCallback(
    (price: number | undefined) => {
      dispatch(A.swap({ price }));
    },
    [dispatch]
  );

  const onTradeChange = useCallback(
    (next: TradeStruct) => {
      const prev = props.trade;

      if (
        prev.pair[0] !== next.pair[0] ||
        prev.pair[1] !== next.pair[1] ||
        prev.type !== next.type
      ) {
        props.onTradeChange(next);
      }
    },
    [props]
  );

  return (
    <TIFProvider>
      <OrderEditor
        a={state.data?.a}
        all={state.data?.all}
        available={state.data?.available}
        b={state.data?.b}
        onSelectA={onSelectA}
        onSelectB={onSelectB}
        onSwap={onSwap}
        onTradeChange={onTradeChange}
        tokenPair={tokenPair.data}
        tokenPairs={tokenPairs.data}
        tradeSide={state.data?.type}
      />
    </TIFProvider>
  );
};
