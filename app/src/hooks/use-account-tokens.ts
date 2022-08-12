import type { Provider } from "@project-serum/anchor";
import type { PublicKey } from "@solana/web3.js";
import useSWR from "swr";
import { SplToken } from "@twamm/client.js/lib/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import useProgram from "./use-program";

type AccountBalance = {
  pubkey: PublicKey;
  account: {
    executable: boolean;
    lamports: number;
    rentEpoch?: number;
    owner: PublicKey;
    data: {
      program: "spl-token";
      space: number;
      parsed: {
        type: "account";
        info: {
          isNative: boolean;
          mint: string;
          owner: string;
          state: string;
          tokenAmount: {
            amount: string;
            decimals: number;
            uiAmount: number;
            uiAmountString: string;
          };
        };
      };
    };
  };
};

const swrKey = (params: { address: PublicKey }) => ({
  key: "account-tokens",
  params,
});

const fetcher =
  ({ provider }: { provider: Provider }) =>
  async ({ params }: SWRParams<typeof swrKey>) => {
    const data = await provider.connection.getParsedProgramAccounts(
      SplToken.getProgramId(),
      {
        filters: [
          { dataSize: 165 },
          {
            memcmp: {
              offset: 32,
              bytes: params.address.toBase58(),
            },
          },
        ],
      }
    );

    return data as AccountBalance[];
  };

export default (_: void, options = {}) => {
  const { publicKey: address } = useWallet();
  const { provider } = useProgram();

  return useSWR(address && swrKey({ address }), fetcher({ provider }), options);
};
