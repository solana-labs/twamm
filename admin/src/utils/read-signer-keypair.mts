import * as web3 from "@solana/web3.js";
import * as fs from "fs";
import * as util from "util";

const read_file = util.promisify(fs.readFile);

const getSignerKeypair = async (path: string) => {
  const id = await read_file(path);

  const secret = JSON.parse(id.toString());
  const secretKey = Uint8Array.from(secret);
  const keypair = web3.Keypair.fromSecretKey(secretKey);

  return keypair;
};

export default getSignerKeypair;
