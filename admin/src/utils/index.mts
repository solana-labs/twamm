import * as a from "@project-serum/anchor";
import * as web3 from "@solana/web3.js";

export const encode = (label: string) => a.utils.bytes.utf8.encode(label);

export const getTime = () => {
  const now = new Date();
  const utcMilllisecondsSinceEpoch =
    now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  return utcMilllisecondsSinceEpoch / 1000;
};

export const populateSigners = (signers: string[]) =>
  signers.map((signer) => new web3.PublicKey(signer));

export const prettifyJSON = (a: {}) => JSON.stringify(a, null, 2);

export const resolveNegative = (str: string) => {
  let res = str;
  if (str.startsWith('"')) {
    res = str.replaceAll('"', "");
  }
  return res;
};
