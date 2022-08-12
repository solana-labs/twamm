import { OrderSide } from "@twamm/types/lib";
import * as R from "./select-available-tokens.reducer";

// FEAT: resolve duplicated image & logoURI
const a = {
  address: "address_a",
  decimals: 6,
  image: "path_to_a",
  logoURI: "path_to_a",
  name: "a",
  symbol: "A",
};

const b = {
  address: "address_b",
  decimals: 6,
  image: "path_to_b",
  logoURI: "path_to_b",
  name: "b",
  symbol: "B",
};

const c = {
  address: "address_c",
  decimals: 6,
  image: "path_to_c",
  logoURI: "path_to_c",
  name: "c",
  symbol: "C",
};

const d = {
  address: "address_d",
  decimals: 6,
  image: "path_to_d",
  logoURI: "path_to_d",
  name: "d",
  symbol: "D",
};

const pairs: AddressPair[] = [
  [a, b],
  [a, c],
  [b, c],
  [d, c],
].map(([a1, a2]) => [a1.address, a2.address]);

describe("select-available-tokens reducer", () => {
  it("should fail on unsupported action", () => {
    expect(R.default).toThrowError(/^Unknown action/);
    // @ts-expect-error
    expect(() => R.default(R.defaultState)).toThrowError(/^Unknown action/);
  });

  it("should `INIT`", () => {
    const next1 = R.default(
      R.defaultState,
      R.action.init({ pairs, pair: [a, b], type: OrderSide.buy })
    );

    const state1 = {
      data: {
        a: b,
        all: ["address_a", "address_b", "address_c", "address_d"],
        available: ["address_a", "address_c"],
        b: a,
        cancellable: undefined,
        pairs,
        type: OrderSide.buy,
      },
    };

    expect(next1).toStrictEqual(state1);

    const next2 = R.default(
      state1,
      R.action.init({ pairs, pair: [a, b], type: OrderSide.sell })
    );

    expect(next2).toStrictEqual(state1);
    // do not initialize state again
  });

  it("should `SELECT_A`", () => {
    const state0 = R.default(R.defaultState, R.action.selectA({ token: a }));
    expect(state0).toStrictEqual(R.defaultState);
  });

  it("should `SELECT_A` and swap tokens", () => {
    const initializedState = {
      data: {
        a: b,
        all: ["address_a", "address_b", "address_c", "address_d"],
        available: ["address_a", "address_c"],
        b: a,
        cancellable: undefined,
        pairs,
        type: OrderSide.buy,
      },
    };

    expect(
      R.default(initializedState, R.action.selectA({ token: a }))
    ).toStrictEqual({
      data: {
        a,
        all: ["address_a", "address_b", "address_c", "address_d"],
        available: ["address_b", "address_c"],
        b,
        cancellable: undefined,
        pairs,
        type: OrderSide.sell,
      },
    });
  });

  it("shoult `SELECT_A` and use C token", () => {
    const initializedState = {
      data: {
        a: b,
        all: ["address_a", "address_b", "address_c", "address_d"],
        available: ["address_a", "address_c"],
        b: a,
        cancellable: undefined,
        pairs,
        type: OrderSide.buy,
      },
    };

    expect(
      R.default(initializedState, R.action.selectA({ token: c }))
    ).toStrictEqual({
      data: {
        a: c,
        all: ["address_a", "address_b", "address_c", "address_d"],
        available: ["address_a", "address_b", "address_d"],
        b: a,
        cancellable: undefined,
        pairs,
        type: OrderSide.buy,
      },
    });
  });

  it("should `SELECT_A` and clean secondary token", () => {
    const richPairs: AddressPair[] = [
      ["address_a", "address_b"],
      ["address_a", "address_c"],
      ["address_b", "address_c"],
      ["address_c", "address_d"],
      ["address_d", "address_e"],
    ];

    const state = {
      data: {
        a,
        available: ["address_b", "address_c"],
        all: ["address_a", "address_b", "address_c", "address_d", "address_e"],
        b,
        cancellable: undefined,
        pairs: richPairs,
        type: OrderSide.sell,
      },
    };

    expect(R.default(state, R.action.selectA({ token: d }))).toStrictEqual({
      data: {
        a: d,
        available: ["address_c", "address_e"],
        all: ["address_a", "address_b", "address_c", "address_d", "address_e"],
        b: undefined,
        cancellable: undefined,
        pairs: richPairs,
        type: OrderSide.defaultSide,
      },
    });
  });

  it("should `SELECT_B`", () => {
    const state = R.default(R.defaultState, R.action.selectB({ token: a }));
    expect(state).toStrictEqual(R.defaultState);
  });

  it("should `SELECT_B` as change token", () => {
    const initializedState = {
      data: {
        a: b,
        all: ["address_a", "address_b", "address_c", "address_d"],
        available: ["address_a", "address_c"],
        b: a,
        cancellable: undefined,
        pairs,
        type: OrderSide.buy,
      },
    };

    expect(
      R.default(initializedState, R.action.selectB({ token: c }))
    ).toStrictEqual({
      data: {
        a: b,
        all: ["address_a", "address_b", "address_c", "address_d"],
        available: ["address_a", "address_c"],
        b: c,
        cancellable: undefined,
        pairs,
        type: OrderSide.sell,
      },
    });
  });

  it("should `SWAP`", () => {
    const state = R.default(R.defaultState, R.action.swap({}));
    expect(state).toStrictEqual(R.defaultState);
  });

  it("should `SWAP` adn swap", () => {
    const initializedState = {
      data: {
        a: b,
        all: ["address_a", "address_b", "address_c", "address_d"],
        available: ["address_a", "address_c"],
        b: a,
        cancellable: undefined,
        pairs,
        type: OrderSide.buy,
      },
    };

    expect(R.default(initializedState, R.action.swap({}))).toStrictEqual({
      data: {
        a,
        all: ["address_a", "address_b", "address_c", "address_d"],
        available: ["address_b", "address_c"],
        b,
        cancellable: undefined,
        pairs,
        type: OrderSide.sell,
      },
    });
  });
});
