import { Buffer } from "buffer";
import { encode } from "bs58";
import { sha256 } from "js-sha256";

export const getAccountDiscriminator = (name: string) =>
  Buffer.from(sha256.digest(`account:${name}`)).slice(0, 8);

export const getEncodedDiscriminator = (name: string) =>
  encode(getAccountDiscriminator(name));
