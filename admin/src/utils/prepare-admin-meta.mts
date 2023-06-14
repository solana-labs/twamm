import * as web3 from "@solana/web3.js";

export default (keypair: web3.Keypair): web3.AccountMeta => ({
  isSigner: false,
  isWritable: false,
  pubkey: keypair.publicKey,
});

export const fromPublicKey = (pubkey: web3.PublicKey): web3.AccountMeta => ({
  isSigner: false,
  isWritable: false,
  pubkey,
});
