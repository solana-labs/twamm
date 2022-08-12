import type { BN, Program, Provider } from "@project-serum/anchor";
import type { PublicKey } from "@solana/web3.js";
import type { WalletProvider } from "@twamm/types/lib";

import { findAddress } from "./program";
import { getAssocTokenAddress } from "./address";
import { Order } from "./order";
import { PoolAuthority } from "./pool";

export class Transfer {
  private poolAuthority?: PoolAuthority;

  readonly program: Program;

  readonly provider: Provider;

  constructor(program: Program, provider: Provider) {
    this.program = program;
    this.provider = provider;
  }

  get authority() {
    return this.poolAuthority;
  }

  init = async (primary: PublicKey, secondary: PublicKey) => {
    this.poolAuthority = new PoolAuthority(this.program, primary, secondary);
    await this.poolAuthority.init();
  };

  findTransferAccounts = async (
    primary: PublicKey,
    secondary: PublicKey,
    tif?: number,
    currentCounter?: BN,
    targetCounter?: BN
  ) => {
    const { wallet } = this.provider as WalletProvider;

    if (!wallet) throw new Error("Can't find the wallet");

    if (!this.poolAuthority) throw new Error("Can't find the authority");

    const order = new Order(this.program, this.provider);

    const transferAuthority = this.poolAuthority.authority as PublicKey;

    const tokenPair = await findAddress(this.program)("token_pair", [
      primary.toBuffer(),
      secondary.toBuffer(),
    ]);

    const aCustody = await getAssocTokenAddress(
      primary,
      transferAuthority,
      true
    );
    const aWallet = await getAssocTokenAddress(primary, wallet.publicKey);

    const bCustody = await getAssocTokenAddress(
      secondary,
      transferAuthority,
      true
    );
    const bWallet = await getAssocTokenAddress(secondary, wallet.publicKey);

    if (tif !== undefined && currentCounter && targetCounter) {
      const currentPool = await this.poolAuthority.getAddress(
        tif,
        currentCounter
      );
      const targetPool = await this.poolAuthority.getAddress(
        tif,
        targetCounter
      );

      const targetOrder = await order.getAddressByPool(targetPool);

      return {
        aWallet,
        aCustody,
        bWallet,
        bCustody,
        currentPool,
        targetOrder,
        targetPool,
        tokenPair,
        transferAuthority,
      };
    }

    return {
      aWallet,
      aCustody,
      bWallet,
      bCustody,
      tokenPair,
      transferAuthority,
    };
  };
}
