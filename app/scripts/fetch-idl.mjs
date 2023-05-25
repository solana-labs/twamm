import anchor from "@project-serum/anchor";
import Env from "@next/env";
import fs from "fs";
import web3 from "@solana/web3.js";

const { combinedEnv: env } = Env.loadEnvConfig(process.cwd());
const PROGRAM_ADDRESS = env.NEXT_PUBLIC_PROGRAM_ADDRESS;
const CLUSTER_ADDRESS = env.NEXT_PUBLIC_CLUSTER_API_URL;

let address;
try {
  const _url = new URL(CLUSTER_ADDRESS);
  address = CLUSTER_ADDRESS;
} catch (e) {
  address = web3.clusterApiUrl(CLUSTER_ADDRESS || "mainnet-beta");
}

const connection = new web3.Connection(
  address,
  "confirmed"
);
const provider = new anchor.AnchorProvider(connection, anchor.Wallet.local());

console.info("Loading IDL...");

const idl = await anchor.Program.fetchIdl(PROGRAM_ADDRESS, provider);

const data = JSON.stringify(idl);

if (data === "null") {
  throw new Error("Loaded IDL is invalid");
}

fs.writeFileSync("idl.json", Buffer.from(data));

console.info("Successfully written idl.json");
