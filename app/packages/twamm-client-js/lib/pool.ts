/* eslint-disable max-classes-per-file */
import type { BN, Program } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import { fetchMultipleAddresses } from "./utils";
import { findAddress } from "./program";
import { getAssocTokenAddress } from "./address";

export class Pool {
  readonly program: Program;

  constructor(program: Program) {
    this.program = program;
  }

  getPool = async (address: PublicKey) => {
    const p = this.program.account.pool.fetch(address);

    return p;
  };

  getPools = async <T>(addresses: PublicKey[]) => {
    const all = await fetchMultipleAddresses<T>(
      this.program.account.pool.fetchMultiple.bind(this.program.account.pool),
      addresses
    );

    return all;
  };
}

export class PoolAuthority {
  private transferAuthority?: PublicKey;

  readonly program: Program;

  readonly tokenAMint: PublicKey;

  readonly tokenBMint: PublicKey;

  constructor(program: Program, aMint: PublicKey, bMint: PublicKey) {
    this.program = program;
    this.tokenAMint = aMint;
    this.tokenBMint = bMint;
  }

  get authority() {
    return this.transferAuthority;
  }

  init = async () => {
    this.transferAuthority = await findAddress(this.program)(
      "transfer_authority",
      []
    );
  };

  getAddress = async (tif: number, poolCounter: BN) => {
    if (!this.transferAuthority)
      throw new Error("Can't find the transfer_authority");

    const tifBuf = Buffer.alloc(4);
    tifBuf.writeUInt32LE(tif, 0);

    const counterBuf = Buffer.alloc(8);
    counterBuf.writeBigUInt64LE(BigInt(poolCounter.toString()), 0);

    const tokenACustody = await getAssocTokenAddress(
      this.tokenAMint,
      this.transferAuthority,
      true
    );

    const tokenBCustody = await getAssocTokenAddress(
      this.tokenBMint,
      this.transferAuthority,
      true
    );

    return findAddress(this.program)("pool", [
      tokenACustody.toBuffer(),
      tokenBCustody.toBuffer(),
      tifBuf,
      counterBuf,
    ]);
  };

  getPoolByTIF = async (tif: number, poolCounter: BN) => {
    const key = await this.getAddress(tif, poolCounter);

    return this.program.account.pool.fetch(key);
  };
}
