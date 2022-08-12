import type { WalletProvider } from "@twamm/types/lib";
import type { createAssociatedTokenAccountInstruction as Fn } from "@solana/spl-token/lib/types/index.d"; // eslint-disable-line max-len
import { createAssociatedTokenAccountInstruction as createInstruction } from "@solana/spl-token"; // eslint-disable-line max-len
import { PublicKey } from "@solana/web3.js";

declare module "@solana/spl-token" {
  const createAssociatedTokenAccountInstruction: typeof Fn;
}

export const assureAccountCreated = async (
  provider: WalletProvider,
  mint: PublicKey,
  address: PublicKey,
  programId?: PublicKey
) => {
  const { wallet } = provider;

  if (!wallet) throw new Error("Absent wallet");

  try {
    const accountInfo = await provider.connection.getAccountInfo(address);

    if (!accountInfo) {
      throw new Error("TokenAccountNotFoundError");
    }
  } catch (err: any) {
    if (!err?.message.startsWith("TokenAccountNotFoundError")) {
      throw new Error("Unexpected error in getAccountInfo");
    }

    return createInstruction(
      wallet.publicKey,
      address,
      wallet.publicKey,
      mint,
      programId
    );
  }

  return undefined;
};
