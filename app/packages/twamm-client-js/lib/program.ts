import { PublicKey } from "@solana/web3.js";
import { Program, utils } from "@project-serum/anchor";

export const findAddress =
  (program: Program) => async (name: string, seeds: Buffer[]) => {
    const full_seeds = name ? [Buffer.from(utils.bytes.utf8.encode(name))] : [];
    full_seeds.push(...seeds);
    return (
      await PublicKey.findProgramAddress(full_seeds, program.programId)
    )[0];
  };
