import type { Provider } from "@project-serum/anchor";
import type { WalletProvider } from "@twamm/types/lib";
import type { createSyncNativeInstruction as Fn } from "@solana/spl-token/lib/types/index.d"; // eslint-disable-line max-len
import {
  TOKEN_PROGRAM_ID,
  createSyncNativeInstruction as createInstruction,
} from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { SplToken } from "./spl-token";

declare module "@solana/spl-token" {
  const createSyncNativeInstruction: typeof Fn;
}

export const createTransferNativeTokenInstructions = async (
  provider: Provider,
  mint: PublicKey,
  address: PublicKey,
  uiAmount: number,
  programId: PublicKey = TOKEN_PROGRAM_ID
) => {
  let instructions;
  const { wallet } = provider as WalletProvider;

  if (SplToken.isNativeAddress(mint)) {
    instructions = [
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: address,
        lamports: uiAmount * 1e9,
      }),
      createInstruction(address, programId),
    ];
  }

  return instructions;
};
