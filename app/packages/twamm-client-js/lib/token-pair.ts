import type { Program, Provider } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { OrderSide } from "@twamm/types/lib";

import { Pool } from "./pool";
import { findAddress } from "./program";
import { fetchMultipleAddresses } from "./utils";
import { getEncodedDiscriminator } from "./account";

export class TokenPair {
  readonly pool: Pool;

  readonly program: Program;

  readonly provider: Provider;

  constructor(program: Program, provider: Provider) {
    this.program = program;
    this.provider = provider;
    this.pool = new Pool(program);
  }

  getAddresses = async () => {
    const data = await this.getData();

    return data.map((d) => d.pubkey);
  };

  getData = async () => {
    const discriminator = getEncodedDiscriminator("TokenPair");

    const addresses = await this.provider.connection.getProgramAccounts(
      this.program.programId,
      {
        filters: [
          { dataSize: 592 },
          { memcmp: { bytes: discriminator, offset: 0 } },
        ],
      }
    );

    return addresses;
  };

  /**
   *  Allow to fetch pair for exchange regardless of the token' position
   */
  getExchangePair = async <T>(primary: string, secondary: string) => {
    const self = this;

    async function getPair(a: string, b: string) {
      const addressPair: [PublicKey, PublicKey] = [
        new PublicKey(a),
        new PublicKey(b),
      ];

      return self.getPairByPairAddresses(addressPair);
    }

    async function fetchPair(a: string, b: string) {
      let data;
      let err;
      try {
        data = await getPair(a, b);
      } catch (e: unknown) {
        err = e;
      }

      return [err, data];
    }

    const [err, data] = await fetchPair(primary, secondary);

    let assumedType = OrderSide.sell;
    let pair = [new PublicKey(primary), new PublicKey(secondary)];
    let result;

    if (err) {
      const [err1, data1] = await fetchPair(secondary, primary);
      if (err1) throw new Error("Can not fetch the pair");

      assumedType = OrderSide.buy;
      pair = [new PublicKey(secondary), new PublicKey(primary)];
      result = data1 as T;
    } else {
      result = data as T;
    }

    return {
      data: result,
      primary: pair[0],
      secondary: pair[1],
      assumedType,
    };
  };

  getPair = async (address: PublicKey) => {
    const p = this.program.account.tokenPair.fetch(address);

    return p;
  };

  getPairByPairAddresses = async (addressPair: [PublicKey, PublicKey]) => {
    const bufferPair = [addressPair[0].toBuffer(), addressPair[1].toBuffer()];

    const address = await findAddress(this.program)("token_pair", bufferPair);

    return this.getPair(address);
  };

  getPairs = async <T>(addresses: PublicKey[]) => {
    const all = await fetchMultipleAddresses<T>(
      this.program.account.tokenPair.fetchMultiple.bind(
        this.program.account.tokenPair
      ),
      addresses
    );

    return all;
  };

  getPairByPoolAddress = async (address: PublicKey) => {
    const pool = (await this.pool.getPool(address)) as { tokenPair: PublicKey };
    const pair = await this.getPair(pool.tokenPair);

    return pair;
  };
}
