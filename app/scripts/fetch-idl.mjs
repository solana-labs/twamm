import anchor from "@project-serum/anchor";
import Env from "@next/env";
import fs from "fs";
import web3 from "@solana/web3.js";

const { combinedEnv: env } = Env.loadEnvConfig(process.cwd());
const PROGRAM_ADDRESS = env.NEXT_PUBLIC_PROGRAM_ADDRESS;

const connection = new web3.Connection(
  web3.clusterApiUrl("mainnet-beta"),
  "confirmed"
);
const provider = new anchor.AnchorProvider(connection, anchor.Wallet.local());

const idl = await anchor.Program.fetchIdl(PROGRAM_ADDRESS, provider);

fs.writeFileSync("idl.json", Buffer.from(JSON.stringify(idl)));

console.info("Successfully written idl.json");
