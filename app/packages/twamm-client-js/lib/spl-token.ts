import { PublicKey } from "@solana/web3.js";
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export const SplToken = {
  getProgramId(enable2022 = false): PublicKey {
    return enable2022 ? new PublicKey(TOKEN_2022_PROGRAM_ID) : TOKEN_PROGRAM_ID;
  },
  isNativeAddress(address: string | PublicKey) {
    const addr = typeof address === "string" ? address : address.toBase58();
    return addr === NATIVE_MINT.toBase58();
  },
};
