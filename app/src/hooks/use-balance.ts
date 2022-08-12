import type { Provider } from "@project-serum/anchor";
import type { PublicKey } from "@solana/web3.js";
import M, { Extra } from "easy-maybe/lib";
import useSWR from "swr";
import { SplToken } from "@twamm/client.js/lib/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import useAccountTokens from "./use-account-tokens";
import useProgram from "./use-program";

const swrKey = (params: {
  address: PublicKey;
  balances: NonNullable<ReturnType<typeof useAccountTokens>["data"]>;
  mint: string;
}) => ({
  key: "balance",
  params,
});

const fetcher =
  ({ provider }: { provider: Provider }) =>
  async ({ params }: SWRParams<typeof swrKey>) => {
    if (SplToken.isNativeAddress(params.mint)) {
      const data: number = await provider.connection.getBalance(params.address);

      return Number((data * 1e-9).toFixed(String(data).length));
    }

    const accounts = params.balances.map((d) => d.account.data.parsed.info);
    const targetInfo = accounts.find((a) => a.mint === params.mint);

    if (!targetInfo) return 0;

    return targetInfo.tokenAmount.uiAmount;
  };

export default (mint: Voidable<string>, options = {}) => {
  const { publicKey: address } = useWallet();
  const { provider } = useProgram();

  const accountTokens = useAccountTokens(undefined, options);

  return useSWR(
    M.withDefault(
      undefined,
      M.andMap(
        (a) => swrKey({ address: a[0], balances: a[1], mint: a[2] }),
        Extra.combine3([M.of(address), M.of(accountTokens.data), M.of(mint)])
      )
    ),
    fetcher({ provider }),
    options
  );
};
