import type { Provider } from "@project-serum/anchor";
import type { PublicKey } from "@solana/web3.js";

export enum OrderSide {
  "sell" = "sell",
  "buy" = "buy",
  "defaultSide" = "sell",
}

export interface WalletProvider extends Provider {
  wallet: { publicKey: PublicKey };
}
