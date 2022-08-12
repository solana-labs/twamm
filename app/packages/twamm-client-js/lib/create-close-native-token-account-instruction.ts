import type { createCloseAccountInstruction as Fn } from "@solana/spl-token/lib/types/index.d"; // eslint-disable-line max-len
import { createCloseAccountInstruction as createInstruction } from "@solana/spl-token"; // eslint-disable-line max-len
import { PublicKey, Signer } from "@solana/web3.js";
import { isNativeTokenAddress } from "./address";

declare module "@solana/spl-token" {
  const createCloseAccountInstruction: typeof Fn;
}

export const createCloseNativeTokenAccountInstruction = async (
  mint: PublicKey,
  destination: PublicKey,
  authority: PublicKey,
  multiSigners?: Signer[],
  programId?: PublicKey
) => {
  if (!isNativeTokenAddress(mint)) return undefined;

  return createInstruction(
    destination,
    authority,
    authority,
    multiSigners,
    programId
  );
};
