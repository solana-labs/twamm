import type { Order as TOrder, OrderExt } from "@twamm/types";
import type { Program, Provider } from "@project-serum/anchor";
import type { PublicKey } from "@solana/web3.js";
// FEAT: rename file 👇 to prevent confusement
import type { WalletProvider } from "@twamm/types/lib/twamm-types";
import { encode } from "bs58";
import { lensPath, set } from "ramda";

import { fetchMultipleAddresses } from "./utils";
import { findAddress } from "./program";
import { getAccountDiscriminator } from "./account";

export class Order {
  readonly program: Program;

  readonly provider: Provider;

  constructor(program: Program, provider: Provider) {
    this.program = program;
    this.provider = provider;
  }

  getAddressByPool = async (poolAddress: PublicKey) => {
    const { wallet } = this.provider as WalletProvider;

    if (!wallet) throw new Error("Absent wallet");

    return findAddress(this.program)("order", [
      wallet.publicKey.toBuffer(),
      poolAddress.toBuffer(),
    ]);
  };

  getAddresses = async (account: PublicKey | null) => {
    const discriminator = getAccountDiscriminator("Order");

    const data = account
      ? [discriminator, account.toBuffer()]
      : [discriminator];

    const bytes = encode(Buffer.concat(data));

    const filters = [{ dataSize: 128 }, { memcmp: { bytes, offset: 0 } }];

    const addresses = await this.provider.connection.getProgramAccounts(
      this.program.programId,
      { filters }
    );

    return addresses;
  };

  getOrder = async (address: PublicKey) => {
    const o = this.program.account.order.fetch(address);

    return o;
  };

  getOrders = async <T>(addresses: PublicKey[]) => {
    const all = await fetchMultipleAddresses<T>(
      this.program.account.order.fetchMultiple.bind(this.program.account.order),
      addresses
    );

    return all;
  };

  getOrdersByAccount = async (account: PublicKey | null) => {
    const addresses = await this.getAddresses(account);

    const orderAddresses = addresses.map((oa) => oa.pubkey);

    const all = await this.getOrders<TOrder>(orderAddresses);

    function presentOrder(o: typeof all[0]): o is TOrder {
      return o !== null;
    }

    const orders = all.filter(presentOrder);

    return orders.map((o, i) => {
      const order: unknown = set(lensPath(["pubkey"]), orderAddresses[i], o);

      return order as OrderExt;
    });
  };
}
