import type { getAssociatedTokenAddress as Fn } from "@solana/spl-token/lib/types/index.d";
import {
  getAssociatedTokenAddress as getAddress,
  NATIVE_MINT,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

declare module "@solana/spl-token" {
  const getAssociatedTokenAddress: typeof Fn;
}

const getAssocTokenAddress = getAddress;

const NATIVE_TOKEN_ADDRESS = NATIVE_MINT.toBase58();

export { getAssocTokenAddress, NATIVE_TOKEN_ADDRESS };

export const isNativeTokenAddress = (address: PublicKey) =>
  address.toBase58() === NATIVE_TOKEN_ADDRESS;
