import * as a from "@project-serum/anchor";
import * as spl from "@solana/spl-token";
import * as web3 from "@solana/web3.js";
import Idl from "@program_types/twamm.ts";
import BN from "./utils/bn.mts";
import { encode } from "./utils/index.mts";

type TwammProgram = a.Program<Idl.Twamm>;

const COMMITMENT: web3.Commitment = "confirmed";

export type ClusterMoniker = web3.Cluster & string;

export default function client(urlOrMoniker: ClusterMoniker) {
  const url = urlOrMoniker.startsWith("http")
    ? urlOrMoniker
    : web3.clusterApiUrl(urlOrMoniker);

  const provider = a.AnchorProvider.local(url, {
    commitment: COMMITMENT,
    preflightCommitment: COMMITMENT,
  });

  const warning =
    "\r\n❗️Be aware that `provider.cluster` setting at Anchor.toml and the `url` option should lead to the same cluster.\r\n";

  process.stderr.write(warning);

  a.setProvider(provider);

  const program = a.workspace.Twamm as TwammProgram;

  return { provider, program };
}

export const upgradeAuthority = new web3.PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111"
);

export const multisig = async (program: TwammProgram, name = "multisig") => {
  const [pda, bump] = await web3.PublicKey.findProgramAddress(
    [Buffer.from(encode(name))],
    program.programId
  );

  return { pda, bump };
};

const oracleToken = async (
  program: TwammProgram,
  tokenA: web3.PublicKey,
  tokenB: web3.PublicKey,
  name?: string
) => {
  if (!name) throw new Error("Provide the seeds");

  const [pda, bump] = await web3.PublicKey.findProgramAddress(
    [Buffer.from(encode(name)), tokenA.toBuffer(), tokenB.toBuffer()],
    program.programId
  );

  return { pda, bump };
};

export const oracleTokenA = async (
  program: TwammProgram,
  tokenA: web3.PublicKey,
  tokenB: web3.PublicKey
) => {
  return oracleToken(program, tokenA, tokenB, "token_a_oracle");
};

export const oracleTokenB = async (
  program: TwammProgram,
  tokenA: web3.PublicKey,
  tokenB: web3.PublicKey
) => {
  return oracleToken(program, tokenA, tokenB, "token_b_oracle");
};

export const tokenPair = async (
  program: TwammProgram,
  tokenA: web3.PublicKey,
  tokenB: web3.PublicKey,
  name = "token_pair"
) => {
  const [pda, bump] = await web3.PublicKey.findProgramAddress(
    [Buffer.from(encode(name)), tokenA.toBuffer(), tokenB.toBuffer()],
    program.programId
  );

  return { pda, bump };
};

export const transferAuthority = async (
  program: TwammProgram,
  name = "transfer_authority"
) => {
  const [pda, bump] = await web3.PublicKey.findProgramAddress(
    [Buffer.from(encode(name))],
    program.programId
  );

  return { pda, bump };
};

export const tokenCustody = async (
  authorityKey: web3.PublicKey,
  tokenMint: web3.PublicKey,
  ownerOffCurve: boolean | undefined = true
) => {
  return spl.getAssociatedTokenAddress(tokenMint, authorityKey, ownerOffCurve);
};

export const getOrCreateTokenCustody = async (
  connection: web3.Connection,
  payer: web3.Keypair,
  authorityKey: web3.PublicKey,
  tokenMint: web3.PublicKey,
  ownerOffCurve: boolean | undefined = true
) => {
  return spl.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenMint,
    authorityKey,
    ownerOffCurve
  );
};

export const poolKey = async (
  program: TwammProgram,
  tokenACustody: web3.PublicKey,
  tokenBCustody: web3.PublicKey,
  tif: number,
  counter: BN
) => {
  let tif_buf = Buffer.alloc(4);
  tif_buf.writeUInt32LE(tif, 0);

  let counter_buf = Buffer.alloc(8);
  counter_buf.writeUint32LE(counter.toNumber(), 0);

  let [pda, bump] = await web3.PublicKey.findProgramAddress(
    [
      Buffer.from(encode("pool")),
      tokenACustody.toBuffer(),
      tokenBCustody.toBuffer(),
      tif_buf,
      counter_buf,
    ],
    program.programId
  );

  return { pda, bump };
};

export const getPoolKey = async (
  program: TwammProgram,
  tokenACustody: web3.PublicKey,
  tokenBCustody: web3.PublicKey,
  tif: number,
  counter: BN
) => poolKey(program, tokenACustody, tokenBCustody, tif, counter);

export const twamm = async (program: TwammProgram, name = "twamm") => {
  const [pda, bump] = await web3.PublicKey.findProgramAddress(
    [Buffer.from(encode(name))],
    program.programId
  );

  return { pda, bump };
};

export const twammProgramData = async (program: TwammProgram) => {
  const [pda, bump] = web3.PublicKey.findProgramAddressSync(
    [program.programId.toBuffer()],
    upgradeAuthority
  );

  return { pda, bump };
};
