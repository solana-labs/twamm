import { flatten, lensPath, pipe, set } from "ramda";
import { OrderSide } from "@twamm/types/lib";

const flattenPairs = (pairs: AddressPair[]) =>
  Array.from(new Set(flatten(pairs)).values());

const matchPairs = (pair: AddressPair, pairs: AddressPair[]) => {
  const matchedPair = pairs.find(
    (tokenPair) => tokenPair.includes(pair[0]) && tokenPair.includes(pair[1])
  );

  if (!matchedPair) return OrderSide.defaultSide;

  const type = pair[0] === matchedPair[0] ? OrderSide.sell : OrderSide.buy;

  return type;
};

const selectComplementary = (
  token: JupToken | undefined,
  pairs: AddressPair[]
) => {
  if (!token) return [];

  const availablePairs = pairs.filter((pair) => pair.includes(token.address));

  const available = flatten(availablePairs).filter(
    (pairToken) => pairToken !== token.address
  );

  return available;
};

enum ActionTypes {
  INIT = "INIT",
  SELECT_A = "SELECT_A",
  SELECT_B = "SELECT_B",
  SWAP = "SWAP",
}

export interface Data {
  a: TokenInfo;
  all: string[];
  available: string[];
  b?: TokenInfo;
  cancellable: undefined;
  pairs: AddressPair[];
  type: OrderSide;
}

export interface State<D = undefined> {
  data: D;
}

export const defaultState: State = {
  data: undefined,
};

const init = (payload: {
  pairs: AddressPair[];
  pair: JupToken[];
  type: OrderSide;
}) => ({
  type: ActionTypes.INIT,
  payload,
});

const selectA = (payload: { token: TokenInfo }) => ({
  type: ActionTypes.SELECT_A,
  payload,
});

const selectB = (payload: { token: TokenInfo }) => ({
  type: ActionTypes.SELECT_B,
  payload,
});

const swap = (payload: { price?: number }) => ({
  type: ActionTypes.SWAP,
  payload,
});

type Action =
  | ReturnType<typeof init>
  | ReturnType<typeof selectA>
  | ReturnType<typeof selectB>
  | ReturnType<typeof swap>;

export const action = {
  init,
  selectA,
  selectB,
  swap,
};

export default (
  state: State | State<Data>,
  act: Action
): State | State<Data> => {
  switch (act?.type) {
    case ActionTypes.INIT: {
      if (state.data) return state;

      const { pair, pairs, type } = act.payload as ActionPayload<typeof init>;

      const isChangingType = OrderSide.defaultSide !== type;

      const [a, b]: [JupToken | undefined, JupToken] = isChangingType
        ? [pair[1], pair[0]]
        : [pair[0], pair[1]];

      if (!a || !b) return state;

      const all = flattenPairs(pairs);
      const available = selectComplementary(a, pairs);

      const next = {
        a: { ...a, image: a.logoURI },
        all,
        available,
        b: { ...b, image: b.logoURI },
        cancellable: undefined,
        pairs,
        type,
      };

      return { data: next };
    }
    case ActionTypes.SELECT_A: {
      if (!state.data) return state;

      const lensA = lensPath(["data", "a"]);
      const lensAvailable = lensPath(["data", "available"]);
      const lensB = lensPath(["data", "b"]);
      const lensType = lensPath(["data", "type"]);

      const { a, b, pairs, type } = state.data;
      const { token } = act.payload as ActionPayload<typeof selectA>;

      if (token.address === b?.address) {
        // swap the tokens when oppisite token is selected as primary
        const applyState = pipe(
          set(lensA, b),
          set(lensB, a),
          set(lensAvailable, selectComplementary(b, pairs)),
          set(
            lensType,
            type === OrderSide.sell ? OrderSide.buy : OrderSide.sell
          )
        );

        return applyState(state);
      }

      // Allow to select every token for A
      // Cleanup present b if does not match the pair
      const available = selectComplementary(token, pairs);

      const shouldResetB = b && !available.includes(b.address);

      if (shouldResetB) {
        // set the primary token and cleanup secondary one as it does not match the available pairs
        const applyState = pipe(
          set(lensA, token),
          set(lensB, undefined),
          set(lensAvailable, available),
          set(lensType, OrderSide.defaultSide)
        );

        return applyState(state);
      }

      let nextType;
      if (b && !shouldResetB) {
        const pair: AddressPair = [token.address, b.address];
        nextType = matchPairs(pair, pairs);
      }

      const nextState = {
        data: {
          ...state.data,
          a: token,
          b: shouldResetB ? undefined : b,
          available,
          type: nextType || type,
        },
      };

      return nextState;
    }
    case ActionTypes.SELECT_B: {
      if (!state.data) return state;

      const { a, pairs } = state.data;
      const { token } = act.payload as ActionPayload<typeof selectB>;

      let type = OrderSide.defaultSide;
      if (a) {
        const pair: AddressPair = [a.address, token.address];
        type = matchPairs(pair, pairs);
      }

      const applyState = pipe(
        set(lensPath(["data", "b"]), token),
        set(lensPath(["data", "type"]), type)
      );

      return applyState(state);
    }
    case ActionTypes.SWAP: {
      if (!state.data) return state;

      const { a, all, b, pairs, type } = state.data;

      const available = b ? selectComplementary(b, pairs) : all;

      const applyState = pipe(
        set(lensPath(["data", "available"]), available),
        set(lensPath(["data", "a"]), b),
        set(lensPath(["data", "b"]), a),
        set(
          lensPath(["data", "type"]),
          type === OrderSide.sell ? OrderSide.buy : OrderSide.sell
        )
      );

      return applyState(state);
    }
    default:
      throw new Error(`Unknown action: ${act?.type}`);
  }
};
