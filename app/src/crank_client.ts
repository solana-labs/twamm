//@ts-nocheck
import {
  setProvider,
  Program,
  AnchorProvider,
  workspace,
  utils,
  BN,
} from "@project-serum/anchor";
import { Twamm } from "../../target/types/twamm";
import {
  PublicKey,
  TransactionInstruction,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { TOKEN_LIST_URL, Jupiter, SwapMode, RouteInfo } from "@jup-ag/core";
import {
  getAccount,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import JSBI from "jsbi";
import fetch from "node-fetch";
import { sha256 } from "js-sha256";
import { encode } from "bs58";

export type OrderSide = "buy" | "sell";

export interface Token {
  chainId: number; // 101,
  address: string; // 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  symbol: string; // 'USDC',
  name: string; // 'Wrapped USDC',
  decimals: number; // 6,
  logoURI: string; // 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/BXXkv6z8ykpG1yuvUDPgh732wzVHB69RnB9YgSYh3itW/logo.png',
  tags: string[]; // [ 'stablecoin' ]
}

export class CrankClient {
  provider: AnchorProvider;
  program: Program<Twamm>;
  jupiter: Jupiter;
  jupiterId: string;

  tokenAWallet: PublicKey;
  tokenBWallet: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenACustody: PublicKey;
  tokenBCustody: PublicKey;
  transferAuthority: PublicKey;
  tokenPair: PublicKey;
  tokenPairConfig;
  tokenPairName: string;

  init = async (
    cluster_url: string,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey
  ) => {
    this.provider = AnchorProvider.local(cluster_url, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    setProvider(this.provider);
    this.program = workspace.Twamm as Program<Twamm>;

    this.tokenAMint = tokenAMint;
    this.tokenBMint = tokenBMint;
    this.tokenAWallet = await getAssociatedTokenAddress(
      this.tokenAMint,
      this.provider.wallet.publicKey
    );
    this.tokenBWallet = await getAssociatedTokenAddress(
      this.tokenBMint,
      this.provider.wallet.publicKey
    );
    await this.checkCreateTokenAccount(this.tokenAMint, this.tokenAWallet);
    await this.checkCreateTokenAccount(this.tokenBMint, this.tokenBWallet);

    this.transferAuthority = await this.findProgramAddress(
      "transfer_authority",
      []
    );
    this.tokenACustody = await getAssociatedTokenAddress(
      this.tokenAMint,
      this.transferAuthority,
      true
    );
    this.tokenBCustody = await getAssociatedTokenAddress(
      this.tokenBMint,
      this.transferAuthority,
      true
    );
    this.tokenPair = await this.findProgramAddress("token_pair", [
      this.tokenAMint.toBuffer(),
      this.tokenBMint.toBuffer(),
    ]);

    const tokens: Token[] = await (
      await fetch(TOKEN_LIST_URL["mainnet-beta"])
    ).json();
    const inputToken = tokens.find(
      (t) => t.address === this.tokenAMint.toString()
    );
    const outputToken = tokens.find(
      (t) => t.address === this.tokenBMint.toString()
    );
    if (!inputToken) {
      throw new Error(`Token ${this.tokenAMint} not found`);
    }
    if (!outputToken) {
      throw new Error(`Token ${this.tokenBMint} not found`);
    }
    this.tokenPairName = `${inputToken.symbol}-${outputToken.symbol}`;

    BN.prototype.toJSON = function () {
      return this.toString(10);
    };

    this.jupiterId = "JUP3c2Uh3WA4Ng34tw6kPd2G4C5BB21Xo36Je1s32Ph";
    this.jupiter = await Jupiter.load({
      connection: this.provider.connection,
      cluster: "mainnet-beta",
      user: this.transferAuthority,
      wrapUnwrapSOL: false,
      routeCacheDuration: 0,
    });
  };

  checkCreateTokenAccount = async (
    tokenMint: PublicKey,
    accountAddress: PublicKey
  ) => {
    try {
      let tokenAccount = await getAccount(
        this.provider.connection,
        accountAddress
      );
    } catch (err) {
      if (!err.stack || !err.stack.startsWith("TokenAccountNotFoundError")) {
        throw new Error("Unexpected error in getAccount");
      }
      let transaction = new Transaction();
      transaction.add(
        createAssociatedTokenAccountInstruction(
          this.provider.wallet.publicKey,
          accountAddress,
          this.provider.wallet.publicKey,
          tokenMint
        )
      );
      await this.provider.sendAll([{ tx: transaction }]);
    }
  };

  reloadConfig = async () => {
    this.tokenPairConfig = await this.program.account.tokenPair.fetch(
      this.tokenPair
    );
  };

  getRoutes = async (side: OrderSide, amount: BN, slippage = 5.0) => {
    return this.jupiter
      .computeRoutes({
        inputMint: side === "sell" ? this.tokenAMint : this.tokenBMint,
        outputMint: side === "sell" ? this.tokenBMint : this.tokenAMint,
        amount: JSBI.BigInt(amount.toString()),
        slippage,
        forceFetch: true,
        onlyDirectRoutes: true,
        swapMode: SwapMode.ExactIn,
      })
      .then((routes) => {
        return routes;
      })
      .catch((error) => {
        console.error(error);
        return null;
      });
  };

  getInstructions = async (routes: RouteInfo[], maxSlippageFromBest = 0.05) => {
    if (!routes.length) {
      return null;
    }
    const recentBlockhash = await this.provider.connection
      .getLatestBlockhash()
      .then((blockhashConfig) => {
        return blockhashConfig.blockhash;
      })
      .catch((error) => {
        console.error(error);
        return null;
      });
    if (!recentBlockhash) {
      return null;
    }
    const bestRouteAmount = JSBI.toNumber(routes[0].otherAmountThreshold);

    for (const route of routes) {
      // check for approximate slippage
      if (
        (bestRouteAmount - JSBI.toNumber(route.otherAmountThreshold)) /
          bestRouteAmount >
        maxSlippageFromBest
      ) {
        return null;
      }

      // get transactions for the specific route
      const res = await this.jupiter
        .exchange({
          routeInfo: route,
        })
        .then((result) => {
          return result;
        })
        .catch((error) => {
          console.error(error);
          return null;
        });

      // validate
      if (!res) {
        this.log("DEBUG: Skipped route due to transactions build fail");
        continue;
      }

      let { setupTransaction, swapTransaction, cleanupTransaction } =
        res.transactions;

      if (setupTransaction || cleanupTransaction) {
        this.log("DEBUG: Skipped route with setup/cleanup transactions");
        continue;
      }

      let preInstructions: TransactionInstruction[] =
        swapTransaction.instructions.length > 1
          ? swapTransaction.instructions.slice(0, -1)
          : [];

      let swapInstruction = swapTransaction.instructions.at(-1);
      for (const key of swapInstruction.keys) {
        if (key.isSigner) {
          if (key.pubkey.toString() !== this.transferAuthority.toString()) {
            this.log("DEBUG: Skipped route with unexpected signer");
            continue;
          }
          key.isSigner = false;
        }
      }

      let postInstructions: TransactionInstruction[] = [];

      if (swapInstruction.programId.toString() !== this.jupiterId) {
        this.log(
          `DEBUG: Skipped route with unexpected router ID: ${swapInstruction.programId.toString()}`
        );
        continue;
      }

      // check serialized transaction size
      let [ret, tx] = await this.crank(
        preInstructions,
        swapInstruction,
        postInstructions,
        true
      );
      if (!ret) {
        return null;
      }
      tx.feePayer = this.provider.wallet.publicKey;
      tx.recentBlockhash = recentBlockhash;
      try {
        tx.serialize({ verifySignatures: false });
      } catch (err) {
        if (err.toString().startsWith("Error: Transaction too large")) {
          this.log("DEBUG: Skipped route with transaction size over the limit");
          continue;
        }
      }

      return [preInstructions, swapInstruction, postInstructions];
    }
    return null;
  };

  getPoolKey = async (tif: number, poolCounter: BN) => {
    let tifBuf = Buffer.alloc(4);
    tifBuf.writeUInt32LE(tif, 0);

    let counterBuf = Buffer.alloc(8);
    counterBuf.writeBigUInt64LE(BigInt(poolCounter.toString()), 0);

    return this.findProgramAddress("pool", [
      this.tokenACustody.toBuffer(),
      this.tokenBCustody.toBuffer(),
      tifBuf,
      counterBuf,
    ]);
  };

  getPool = async (tif: number, poolCounter: BN) => {
    return this.program.account.pool.fetch(
      await this.getPoolKey(tif, poolCounter)
    );
  };

  getOrderKey = async (tif: number, poolCounter: BN) => {
    return this.findProgramAddress("order", [
      this.provider.wallet.publicKey.toBuffer(),
      (await this.getPoolKey(tif, poolCounter)).toBuffer(),
    ]);
  };

  getOrder = async (tif: number, poolCounter: BN) => {
    return this.program.account.order.fetch(
      await this.getOrderKey(tif, poolCounter)
    );
  };

  getOrders = async () => {
    let data = encode(
      Buffer.concat([
        this.getAccountDiscriminator("Order"),
        this.provider.wallet.publicKey.toBuffer(),
      ])
    );
    let orders = await this.provider.connection.getProgramAccounts(
      this.program.programId,
      {
        filters: [{ dataSize: 128 }, { memcmp: { bytes: data, offset: 0 } }],
      }
    );
    return Promise.all(
      orders.map((order) => {
        return this.program.account.order.fetch(order.pubkey);
      })
    );
  };

  getTokenPairs = async () => {
    let data = encode(this.getAccountDiscriminator("TokenPair"));
    let tokenPairs = await this.provider.connection.getProgramAccounts(
      this.program.programId,
      {
        filters: [{ dataSize: 592 }, { memcmp: { bytes: data, offset: 0 } }],
      }
    );
    return Promise.all(
      tokenPairs.map((pair) => {
        return this.program.account.tokenPair.fetch(pair.pubkey);
      })
    );
  };

  getBalance = async (pubkey: PublicKey) => {
    return getAccount(this.provider.connection, pubkey)
      .then((account) => Number(account.amount))
      .catch(() => 0);
  };

  getCurrentTime = () => {
    return Math.floor(Date.now() / 1000);
  };

  getAccountDiscriminator = (name: string) => {
    return Buffer.from(sha256.digest(`account:${name}`)).slice(0, 8);
  };

  findProgramAddress = async (name: string, seeds: Buffer[]) => {
    let full_seeds = name ? [Buffer.from(utils.bytes.utf8.encode(name))] : [];
    full_seeds.push(...seeds);
    return (
      await PublicKey.findProgramAddress(full_seeds, this.program.programId)
    )[0];
  };

  log = (message: string) => {
    let date = new Date();
    let date_str = date.toDateString();
    let time = date.toLocaleTimeString();
    console.log(`[${date_str} ${time}] [${this.tokenPairName}] ${message}`);
  };

  error = (message: string) => {
    let date = new Date();
    let date_str = date.toDateString();
    let time = date.toLocaleTimeString();
    console.error(`[${date_str} ${time}] [${this.tokenPairName}] ${message}`);
  };

  getOutstandingAmount = async () => {
    // main accounts
    let getOutstandingAmountAccounts = {
      owner: this.provider.wallet.publicKey,
      tokenPair: this.tokenPair,
      oracleTokenA: this.tokenPairConfig.configA.oracleAccount,
      oracleTokenB: this.tokenPairConfig.configB.oracleAccount,
    };

    // pool accounts
    let poolAccounts = [];
    for (const [index, tif] of this.tokenPairConfig.tifs.entries()) {
      if (this.tokenPairConfig.currentPoolPresent[index]) {
        poolAccounts.push({
          isSigner: false,
          isWritable: false,
          pubkey: await this.getPoolKey(
            tif,
            this.tokenPairConfig.poolCounters[index]
          ),
        });
      }
    }
    if (!poolAccounts.length) {
      return [true, 0];
    }

    try {
      return [
        true,
        await this.program.methods
          .getOutstandingAmount({})
          .accounts(getOutstandingAmountAccounts)
          .remainingAccounts(poolAccounts)
          .view(),
      ];
    } catch (err) {
      if (err && err.error && err.error.errorMessage) {
        return [false, err.error.errorMessage];
      }
      console.error(err);
      return [false, "Unknown error"];
    }
  };

  crank = async (
    preInstructions: TransactionInstruction[],
    swapInstruction: TransactionInstruction,
    postInstructions: TransactionInstruction[],
    returnTransactionOnly = false
  ) => {
    // main accounts
    let crankAccounts = {
      owner: this.provider.wallet.publicKey,
      userAccountTokenA: this.tokenAWallet,
      userAccountTokenB: this.tokenBWallet,
      tokenPair: this.tokenPair,
      transferAuthority: this.transferAuthority,
      custodyTokenA: this.tokenACustody,
      custodyTokenB: this.tokenBCustody,
      oracleTokenA: this.tokenPairConfig.configA.oracleAccount,
      oracleTokenB: this.tokenPairConfig.configB.oracleAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    };

    // pool accounts
    let poolAccounts = [];
    for (const [index, tif] of this.tokenPairConfig.tifs.entries()) {
      if (this.tokenPairConfig.currentPoolPresent[index]) {
        poolAccounts.push({
          isSigner: false,
          isWritable: true,
          pubkey: await this.getPoolKey(
            tif,
            this.tokenPairConfig.poolCounters[index]
          ),
        });
      }
    }

    if (!poolAccounts.length) {
      return [false, "Nothing to settle at this time"];
    }

    if (swapInstruction) {
      // router
      poolAccounts.push({
        isSigner: false,
        isWritable: false,
        pubkey: swapInstruction.programId,
      });

      // jupiter accounts
      poolAccounts.push(...swapInstruction.keys);
    }

    // build method
    let methodBuilder = this.program.methods
      .crank({
        routerInstructionData: Buffer.from(
          swapInstruction ? swapInstruction.data : []
        ),
      })
      .accounts(crankAccounts)
      .remainingAccounts(poolAccounts);

    if (preInstructions) {
      methodBuilder = methodBuilder.preInstructions(preInstructions);
    }
    if (postInstructions) {
      methodBuilder = methodBuilder.preInstructions(postInstructions);
    }

    // crank
    try {
      return [
        true,
        returnTransactionOnly
          ? await methodBuilder.transaction()
          : await methodBuilder.rpc(),
      ];
    } catch (err) {
      if (err && err.error && err.error.errorMessage) {
        return [false, err.error.errorMessage];
      }
      console.error(err);
      return [false, "Unknown error"];
    }
  };

  placeOrder = async (
    side: OrderSide,
    tif: number,
    amount: number,
    nextPool?: boolean
  ) => {
    let preInstructions =
      side === "sell" &&
      this.tokenAMint.toString() ==
        "So11111111111111111111111111111111111111112"
        ? [
            SystemProgram.transfer({
              fromPubkey: this.provider.wallet.publicKey,
              toPubkey: this.tokenAWallet,
              lamports: amount,
            }),
            createSyncNativeInstruction(this.tokenAWallet),
          ]
        : [];
    if (
      side === "buy" &&
      this.tokenBMint.toString() ==
        "So11111111111111111111111111111111111111112"
    ) {
      preInstructions.push(
        SystemProgram.transfer({
          fromPubkey: this.provider.wallet.publicKey,
          toPubkey: this.tokenBWallet,
          lamports: amount,
        })
      );
      preInstructions.push(createSyncNativeInstruction(this.tokenBWallet));
    }

    let tif_index = this.tokenPairConfig.tifs.indexOf(tif);
    if (tif_index < 0) {
      throw new Error("Invalid TIF");
    }
    let counter = this.tokenPairConfig.poolCounters[tif_index];

    await this.program.methods
      .placeOrder({
        side: side === "sell" ? { sell: {} } : { buy: {} },
        timeInForce: tif,
        amount: new BN(amount),
      })
      .accounts({
        owner: this.provider.wallet.publicKey,
        userAccountTokenA: this.tokenAWallet,
        userAccountTokenB: this.tokenBWallet,
        tokenPair: this.tokenPair,
        custodyTokenA: this.tokenACustody,
        custodyTokenB: this.tokenBCustody,
        order: await this.getOrderKey(tif, nextPool ? counter + 1 : counter),
        currentPool: await this.getPoolKey(tif, counter),
        targetPool: await this.getPoolKey(
          tif,
          nextPool ? counter + 1 : counter
        ),
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions(preInstructions)
      .rpc()
      .catch((err) => {
        console.error(err);
        throw err;
      });
  };

  cancelOrder = async (poolAddress: PublicKey, lpAmount: number) => {
    let postInstructions =
      this.tokenAMint.toString() ==
      "So11111111111111111111111111111111111111112"
        ? [
            createCloseAccountInstruction(
              this.tokenAWallet,
              this.provider.wallet.publicKey,
              this.provider.wallet.publicKey
            ),
          ]
        : [];
    if (
      this.tokenBMint.toString() ==
      "So11111111111111111111111111111111111111112"
    ) {
      postInstructions.push(
        createCloseAccountInstruction(
          this.tokenBWallet,
          this.provider.wallet.publicKey,
          this.provider.wallet.publicKey
        )
      );
    }

    let pool = await this.program.account.pool.fetch(poolAddress);

    await this.program.methods
      .cancelOrder({
        lpAmount: new BN(lpAmount),
      })
      .accounts({
        owner: this.provider.wallet.publicKey,
        userAccountTokenA: this.tokenAWallet,
        userAccountTokenB: this.tokenBWallet,
        tokenPair: this.tokenPair,
        transferAuthority: this.transferAuthority,
        custodyTokenA: this.tokenACustody,
        custodyTokenB: this.tokenBCustody,
        order: await this.getOrderKey(pool.timeInForce, pool.counter),
        pool: poolAddress,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .postInstructions(postInstructions)
      .rpc()
      .catch((err) => {
        console.error(err);
        throw err;
      });
  };

  cancelAll = async () => {
    Promise.all(
      (await this.getOrders()).map((order) =>
        this.cancelOrder(order.pool, Number.MAX_SAFE_INTEGER)
      )
    );
  };
}
