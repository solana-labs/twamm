import type { Wallet } from "@project-serum/anchor";
import { Program, AnchorProvider as Provider } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import useBlockchain from "../contexts/solana-connection-context";
import { programId, idl } from "../env";

export default () => {
  const { commitment, createConnection } = useBlockchain();
  const wallet = useWallet();

  if (!programId) {
    throw new Error("Can not start. Absent program address");
  }

  const currentWallet: unknown = wallet;

  const preflightCommitment = { preflightCommitment: commitment };

  const connection = createConnection(commitment);

  const provider = new Provider(
    connection,
    currentWallet as Wallet,
    preflightCommitment
  );

  const program = new Program(idl, new PublicKey(programId), provider);

  return { program, provider };
};
