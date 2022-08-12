declare type Voidable<T> = T | undefined;

declare type Action<Payload> = { type: string; payload: Payload };

declare type ActionPayload<Fn> = ReturnType<Fn>["payload"];

declare interface Actor<InPayload, OutPayload> {
  (arg0: string, arg1: InPayload): Action<OutPayload>;
}

interface PromiseFulfilledResult<T> {
  status: "fulfilled";
  value: T;
}

interface PromiseRejectedResult {
  status: "rejected";
  reason: any;
}

declare type PromiseSettledResult<T> =
  | PromiseFulfilledResult<T>
  | PromiseRejectedResult;

declare type SWRParams<F> = ReturnType<F>;

declare type SWRArgs<F> = Parameters<F>[0];

declare type JupTokenData = {
  address: string;
  chainId: number;
  decimals: number;
  logoURI: string;
  name: string;
  symbol: string;
  tags: string[] | undefined;
};

declare type JupTokenDataV2 = {
  address: string;
  chainId: number;
  decimals: number;
  logoURI: string;
  name: string;
  symbol: string;
  extensions: {} | undefined;
};

declare type CoinToken = Pick<
  JupTokenDataV2,
  "address" | "decimals" | "name" | "symbol"
>;

declare type JupToken = CoinToken & Pick<JupTokenDataV2, "logoURI">;

declare type TokenInfo = JupToken & { image: string };

declare type AddressPair = [string, string];

declare type TokenTuple<T> = [T, T];
