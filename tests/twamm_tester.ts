import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Twamm } from "../target/types/twamm";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  AccountMeta,
  TransactionSignature,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import * as spl from "@solana/spl-token";

export type OrderSide = "buy" | "sell";

export class TwammTester {
  provider: anchor.AnchorProvider;
  program: anchor.Program<Twamm>;
  users: Keypair[];
  printErrors: boolean;

  admin1: Keypair;
  admin2: Keypair;
  adminMetas: AccountMeta[];
  tokenAMintKeypair: Keypair;
  tokenBMintKeypair: Keypair;

  tokenADecimals: number;
  tokenBDecimals: number;
  tokenAPrice: number;
  tokenBPrice: number;

  poolMetas: AccountMeta[];

  // pdas
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;

  multisigKey: PublicKey;
  multisigBump: number;

  tokenPairKey: PublicKey;
  tokenPairBump: number;

  authorityKey: PublicKey;
  authorityBump: number;

  tokenACustodyKey: PublicKey;
  tokenBCustodyKey: PublicKey;

  tokenAWallets: PublicKey[];
  tokenBWallets: PublicKey[];

  oracleTokenAKey: PublicKey;
  oracleTokenABump: number;

  oracleTokenBKey: PublicKey;
  oracleTokenBBump: number;

  constructor() {
    this.provider = anchor.AnchorProvider.env();
    anchor.setProvider(this.provider);
    this.program = anchor.workspace.Twamm as Program<Twamm>;
    this.printErrors = true;

    // fixed addresses
    let seed = Uint8Array.from([
      70, 60, 102, 100, 70, 60, 102, 100, 70, 60, 102, 100, 70, 60, 102, 100,
      70, 60, 102, 100, 70, 60, 102, 100, 70, 60, 102, 100, 70, 60, 102, 100,
    ]);
    this.admin1 = Keypair.fromSeed(seed);

    seed = Uint8Array.from([
      43, 121, 237, 161, 118, 173, 191, 20, 76, 255, 130, 110, 132, 165, 26,
      102, 21, 210, 11, 55, 86, 55, 6, 236, 94, 3, 167, 178, 90, 217, 69, 121,
    ]);
    this.admin2 = Keypair.fromSeed(seed);

    this.adminMetas = [];
    this.adminMetas.push({
      isSigner: false,
      isWritable: false,
      pubkey: this.admin1.publicKey,
    });
    this.adminMetas.push({
      isSigner: false,
      isWritable: false,
      pubkey: this.admin2.publicKey,
    });

    seed = Uint8Array.from([
      225, 64, 222, 166, 48, 226, 212, 130, 102, 60, 189, 160, 49, 70, 152, 50,
      195, 211, 201, 219, 33, 149, 137, 220, 247, 45, 149, 241, 45, 44, 182,
      138,
    ]);
    this.users = [];
    this.users.push(Keypair.fromSeed(seed));

    seed = Uint8Array.from([
      105, 140, 48, 201, 223, 185, 91, 129, 36, 27, 12, 117, 162, 13, 251, 250,
      130, 144, 24, 146, 201, 147, 204, 97, 48, 77, 105, 219, 38, 178, 160, 77,
    ]);
    this.users.push(Keypair.fromSeed(seed));

    seed = Uint8Array.from([
      251, 222, 108, 31, 114, 249, 147, 252, 163, 52, 150, 46, 148, 35, 127, 17,
      20, 123, 5, 45, 214, 59, 219, 109, 209, 69, 40, 244, 5, 234, 120, 162,
    ]);
    this.users.push(Keypair.fromSeed(seed));

    seed = Uint8Array.from([
      120, 168, 65, 14, 133, 132, 103, 69, 161, 164, 114, 20, 152, 119, 60, 171,
      199, 149, 71, 226, 246, 16, 188, 201, 15, 146, 183, 138, 67, 85, 80, 212,
    ]);
    this.users.push(Keypair.fromSeed(seed));

    seed = Uint8Array.from([
      34, 252, 63, 205, 83, 121, 254, 147, 133, 101, 54, 176, 184, 2, 121, 36,
      231, 156, 164, 251, 17, 236, 116, 26, 176, 175, 241, 145, 157, 42, 109,
      137,
    ]);
    this.tokenAMintKeypair = Keypair.fromSeed(seed);
    this.tokenAMint = this.tokenAMintKeypair.publicKey;

    seed = Uint8Array.from([
      209, 101, 107, 244, 132, 192, 120, 235, 46, 187, 46, 132, 38, 17, 89, 9,
      114, 196, 244, 204, 78, 120, 140, 4, 196, 157, 1, 236, 163, 252, 141, 239,
    ]);
    this.tokenBMintKeypair = Keypair.fromSeed(seed);
    this.tokenBMint = this.tokenBMintKeypair.publicKey;

    this.tokenADecimals = 9;
    this.tokenBDecimals = 6;
    this.tokenAPrice = 0;
    this.tokenBPrice = 0;

    anchor.BN.prototype.toJSON = function () {
      return this.toString(10);
    };
  }

  init = async () => {
    // pdas
    [this.multisigKey, this.multisigBump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("multisig"))],
      this.program.programId
    );

    [this.tokenPairKey, this.tokenPairBump] =
      await PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode("token_pair")),
          this.tokenAMint.toBuffer(),
          this.tokenBMint.toBuffer(),
        ],
        this.program.programId
      );

    [this.authorityKey, this.authorityBump] =
      await PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("transfer_authority"))],
        this.program.programId
      );

    this.tokenACustodyKey = await spl.getAssociatedTokenAddress(
      this.tokenAMint,
      this.authorityKey,
      true
    );

    this.tokenBCustodyKey = await spl.getAssociatedTokenAddress(
      this.tokenBMint,
      this.authorityKey,
      true
    );

    this.tokenAWallets = [];
    this.tokenBWallets = [];
    for (const wallet of this.users) {
      this.tokenAWallets.push(
        await spl.getAssociatedTokenAddress(this.tokenAMint, wallet.publicKey)
      );

      this.tokenBWallets.push(
        await spl.getAssociatedTokenAddress(this.tokenBMint, wallet.publicKey)
      );
    }

    [this.oracleTokenAKey, this.oracleTokenABump] =
      await PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode("token_a_oracle")),
          this.tokenAMint.toBuffer(),
          this.tokenBMint.toBuffer(),
        ],
        this.program.programId
      );

    [this.oracleTokenBKey, this.oracleTokenBBump] =
      await PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode("token_b_oracle")),
          this.tokenAMint.toBuffer(),
          this.tokenBMint.toBuffer(),
        ],
        this.program.programId
      );

    if ((await this.getSolBalance(this.admin1.publicKey)) < 1e9 / 2) {
      await this.confirmTx(
        await this.provider.connection.requestAirdrop(
          this.admin1.publicKey,
          1e9
        )
      );
    }

    // token pair mints
    let mint = await spl
      .getMint(this.provider.connection, this.tokenAMint)
      .then((mint) => mint)
      .catch(() => undefined);
    if (!mint) {
      await spl.createMint(
        this.provider.connection,
        this.admin1,
        this.admin1.publicKey,
        null,
        this.tokenADecimals,
        this.tokenAMintKeypair
      );

      await spl.createMint(
        this.provider.connection,
        this.admin1,
        this.admin1.publicKey,
        null,
        this.tokenBDecimals,
        this.tokenBMintKeypair
      );

      let tx = null;
      for (let i = 0; i < this.users.length; i++) {
        if ((await this.getBalance(this.users[i].publicKey)) < 1e9 / 2) {
          //await this.confirmTx(
          await this.provider.connection.requestAirdrop(
            this.users[i].publicKey,
            1e9
          );
          //);
        }

        await spl.createAssociatedTokenAccount(
          this.provider.connection,
          this.admin1,
          this.tokenAMint,
          this.users[i].publicKey
        );

        await spl.createAssociatedTokenAccount(
          this.provider.connection,
          this.admin1,
          this.tokenBMint,
          this.users[i].publicKey
        );

        await spl.mintToChecked(
          this.provider.connection,
          this.admin1,
          this.tokenAMint,
          this.tokenAWallets[i],
          this.admin1.publicKey,
          1000 * 10 ** this.tokenADecimals,
          this.tokenADecimals
        );

        tx = await spl.mintToChecked(
          this.provider.connection,
          this.admin1,
          this.tokenBMint,
          this.tokenBWallets[i],
          this.admin1.publicKey,
          1000 * 10 ** this.tokenBDecimals,
          this.tokenBDecimals
        );
      }
      if (tx) {
        this.confirmTx(tx);
      }
    }
  };

  confirmTx = async (txSignature: TransactionSignature) => {
    const latestBlockHash = await this.provider.connection.getLatestBlockhash();

    await this.provider.connection.confirmTransaction(
      {
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: txSignature,
      },
      { commitment: "processed" }
    );
  };

  confirmAndLogTx = async (txSignature: TransactionSignature) => {
    await this.confirmTx(txSignature);
    let tx = await this.provider.connection.getTransaction(txSignature, {
      commitment: "confirmed",
    });
    console.log(tx);
  };

  getBalance = async (pubkey: PublicKey) => {
    return spl
      .getAccount(this.provider.connection, pubkey)
      .then((account) => Number(account.amount))
      .catch(() => 0);
  };

  getSolBalance = async (pubkey: PublicKey) => {
    return this.provider.connection
      .getBalance(pubkey)
      .then((balance) => balance)
      .catch(() => 0);
  };

  getExtraSolBalance = async (pubkey: PublicKey) => {
    let balance = await this.provider.connection
      .getBalance(pubkey)
      .then((balance) => balance)
      .catch(() => 0);
    let accountInfo = await this.provider.connection.getAccountInfo(pubkey);
    let dataSize = accountInfo ? accountInfo.data.length : 0;
    let minBalance =
      await this.provider.connection.getMinimumBalanceForRentExemption(
        dataSize
      );
    return balance > minBalance ? balance - minBalance : 0;
  };

  getTime() {
    const now = new Date();
    const utcMilllisecondsSinceEpoch =
      now.getTime() + now.getTimezoneOffset() * 60 * 1000;
    return utcMilllisecondsSinceEpoch / 1000;
  }

  getPoolKey = async (tif: number, counter: number) => {
    let tif_buf = Buffer.alloc(4);
    tif_buf.writeUInt32LE(tif, 0);

    let counter_buf = Buffer.alloc(8);
    counter_buf.writeUInt32LE(counter, 0);

    let [poolKey, poolBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode("pool")),
        this.tokenACustodyKey.toBuffer(),
        this.tokenBCustodyKey.toBuffer(),
        tif_buf,
        counter_buf,
      ],
      this.program.programId
    );
    return poolKey;
  };

  getPool = async (tif: number, counter: number) => {
    return this.program.account.pool.fetch(await this.getPoolKey(tif, counter));
  };

  printPoolSide = async (
    name: string,
    side: OrderSide,
    tif: number,
    counter: number
  ) => {
    let pool = await this.getPool(tif, counter);
    let pool_side = side == "buy" ? pool.buySide : pool.sellSide;
    console.log("\n", name);
    console.log("sourceBalance:", pool_side.sourceBalance.toString());
    console.log("targetBalance:", pool_side.targetBalance.toString());
    console.log("lpSupply:", pool_side.lpSupply.toString());
    console.log("tokenDebtTotal:", pool_side.tokenDebtTotal.toString());
    console.log("fillsVolume:", pool_side.fillsVolume.toString());
    console.log("weightedFillsSum:", pool_side.weightedFillsSum.toString());
    console.log("minFillPrice:", pool_side.minFillPrice.toString());
    console.log("maxFillPrice:", pool_side.maxFillPrice.toString());
    console.log("numTraders:", pool_side.numTraders.toString());
    console.log(
      "settlementDebtTotal:",
      pool_side.settlementDebtTotal.toString()
    );
    console.log(
      "lastBalanceChangeTime:",
      pool_side.lastBalanceChangeTime.toString()
    );
  };

  getOrderKey = async (userId: number, tif: number, poolCounter?: number) => {
    let [orderKey, orderBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode("order")),
        this.users[userId].publicKey.toBuffer(),
        (await this.getPoolKey(tif, poolCounter)).toBuffer(),
      ],
      this.program.programId
    );
    return orderKey;
  };

  getOrder = async (userId: number, tif: number, nextPool?: boolean) => {
    return await this.program.account.order.fetch(
      await this.getOrderKey(userId, tif, nextPool ? 1 : 0)
    );
  };

  getBalances = async (userId: number) => {
    return [
      await this.getBalance(this.tokenAWallets[userId]),
      await this.getBalance(this.tokenBWallets[userId]),
    ];
  };

  ensureFails = async (promise, message = null) => {
    let printErrors = this.printErrors;
    this.printErrors = false;
    let res = null;
    try {
      await promise;
    } catch (err) {
      res = err;
    }
    this.printErrors = printErrors;
    if (!res) {
      throw new Error(message ? message : "Call should've failed");
    }
    return res;
  };

  reset = async (tifs: number[], fees: number[]) => {
    await this.deleteTestPair(0);
    await this.program.methods
      .initTokenPair({
        allowDeposits: true,
        allowWithdrawals: true,
        allowCranks: false,
        allowSettlements: true,
        feeNumerator: new anchor.BN(fees[0]),
        feeDenominator: new anchor.BN(fees[1]),
        settleFeeNumerator: new anchor.BN(0),
        settleFeeDenominator: new anchor.BN(1),
        crankRewardTokenA: new anchor.BN(0),
        crankRewardTokenB: new anchor.BN(0),
        minSwapAmountTokenA: new anchor.BN(0),
        minSwapAmountTokenB: new anchor.BN(0),
        maxSwapPriceDiff: 0.0,
        maxUnsettledAmount: 0.0,
        minTimeTillExpiration: 0.3,
        maxOraclePriceErrorTokenA: 0.0,
        maxOraclePriceErrorTokenB: 0.0,
        maxOraclePriceAgeSecTokenA: 9000,
        maxOraclePriceAgeSecTokenB: 9000,
        oracleTypeTokenA: { test: {} },
        oracleTypeTokenB: { test: {} },
        oracleAccountTokenA: this.oracleTokenAKey,
        oracleAccountTokenB: this.oracleTokenBKey,
        crankAuthority: PublicKey.default,
        timeInForceIntervals: tifs,
      })
      .accounts({
        admin: this.admin1.publicKey,
        multisig: this.multisigKey,
        tokenPair: this.tokenPairKey,
        transferAuthority: this.authorityKey,
        mintTokenA: this.tokenAMint,
        mintTokenB: this.tokenBMint,
        custodyTokenA: this.tokenACustodyKey,
        custodyTokenB: this.tokenBCustodyKey,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
      .signers([this.admin1])
      .rpc()
      .catch((err) => {
        if (this.printErrors) {
          console.error(err);
        }
        throw err;
      });

    await this.initPoolMetas(tifs);
  };

  deleteTestPool = async (userId: number, tif: number, nextPool?: boolean) => {
    await this.program.methods
      .deleteTestPool({})
      .accounts({
        admin: this.admin1.publicKey,
        multisig: this.multisigKey,
        tokenPair: this.tokenPairKey,
        transferAuthority: this.authorityKey,
        custodyTokenA: this.tokenACustodyKey,
        custodyTokenB: this.tokenBCustodyKey,
        pool: await this.getPoolKey(tif, nextPool ? 1 : 0),
      })
      .signers([this.admin1])
      .rpc()
      .catch((err) => {
        if (this.printErrors) {
          console.error(err);
        }
        throw err;
      });
  };

  deleteTestPair = async (userId: number) => {
    await this.program.methods
      .deleteTestPair({})
      .accounts({
        admin: this.admin1.publicKey,
        multisig: this.multisigKey,
        userAccountTokenA: this.tokenAWallets[userId],
        userAccountTokenB: this.tokenBWallets[userId],
        tokenPair: this.tokenPairKey,
        transferAuthority: this.authorityKey,
        custodyTokenA: this.tokenACustodyKey,
        custodyTokenB: this.tokenBCustodyKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
      .signers([this.admin1])
      .rpc()
      .catch((err) => {
        if (this.printErrors) {
          console.error(err);
        }
        throw err;
      });
  };

  withdrawFees = async (
    amountTokenA: number,
    amountTokenB: number,
    amountSol: number
  ) => {
    await this.program.methods
      .withdrawFees({
        amountTokenA: new anchor.BN(amountTokenA),
        amountTokenB: new anchor.BN(amountTokenB),
        amountSol: new anchor.BN(amountSol),
      })
      .accounts({
        admin: this.admin2.publicKey,
        multisig: this.multisigKey,
        tokenPair: this.tokenPairKey,
        transferAuthority: this.authorityKey,
        custodyTokenA: this.tokenACustodyKey,
        custodyTokenB: this.tokenBCustodyKey,
        receiverTokenA: this.tokenAWallets[3],
        receiverTokenB: this.tokenBWallets[3],
        receiverSol: this.users[3].publicKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
      .signers([this.admin2])
      .rpc()
      .catch((err) => {
        if (this.printErrors) {
          console.error(err);
        }
        throw err;
      });
  };

  setOraclePrice = async (tokenAPrice: number, tokenBPrice: number) => {
    await this.program.methods
      .setTestOraclePrice({
        priceTokenA: new anchor.BN(tokenAPrice * 100),
        priceTokenB: new anchor.BN(tokenBPrice * 1000),
        expoTokenA: -2,
        expoTokenB: -3,
        confTokenA: new anchor.BN(0),
        confTokenB: new anchor.BN(0),
        publishTimeTokenA: new anchor.BN(this.getTime()),
        publishTimeTokenB: new anchor.BN(this.getTime()),
      })
      .accounts({
        admin: this.admin1.publicKey,
        multisig: this.multisigKey,
        tokenPair: this.tokenPairKey,
        oracleTokenA: this.oracleTokenAKey,
        oracleTokenB: this.oracleTokenBKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([this.admin1])
      .rpc()
      .catch((err) => {
        if (this.printErrors) {
          console.error(err);
        }
        throw err;
      });
    this.tokenAPrice = tokenAPrice;
    this.tokenBPrice = tokenBPrice;
  };

  setTime = async (time: number) => {
    await this.program.methods
      .setTestTime({
        time: new anchor.BN(time),
      })
      .accounts({
        admin: this.admin1.publicKey,
        multisig: this.multisigKey,
        tokenPair: this.tokenPairKey,
      })
      .signers([this.admin1])
      .rpc()
      .catch((err) => {
        if (this.printErrors) {
          console.error(err);
        }
        throw err;
      });
  };

  placeOrder = async (
    userId: number,
    side: OrderSide,
    tif: number,
    amount: number,
    nextPool?: boolean
  ) => {
    await this.program.methods
      .placeOrder({
        side: side === "sell" ? { sell: {} } : { buy: {} },
        timeInForce: tif,
        amount: new anchor.BN(amount),
      })
      .accounts({
        owner: this.users[userId].publicKey,
        userAccountTokenA: this.tokenAWallets[userId],
        userAccountTokenB: this.tokenBWallets[userId],
        tokenPair: this.tokenPairKey,
        custodyTokenA: this.tokenACustodyKey,
        custodyTokenB: this.tokenBCustodyKey,
        order: await this.getOrderKey(userId, tif, nextPool ? 1 : 0),
        currentPool: await this.getPoolKey(tif, 0),
        targetPool: await this.getPoolKey(tif, nextPool ? 1 : 0),
        systemProgram: SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
      .signers([this.users[userId]])
      .rpc()
      .catch((err) => {
        if (this.printErrors) {
          console.error(err);
        }
        throw err;
      });
  };

  cancelOrder = async (
    userId: number,
    tif: number,
    lpAmount: number,
    nextPool?: boolean
  ) => {
    await this.program.methods
      .cancelOrder({
        lpAmount: new anchor.BN(lpAmount),
      })
      .accounts({
        payer: this.users[userId].publicKey,
        owner: this.users[userId].publicKey,
        userAccountTokenA: this.tokenAWallets[userId],
        userAccountTokenB: this.tokenBWallets[userId],
        tokenPair: this.tokenPairKey,
        transferAuthority: this.authorityKey,
        custodyTokenA: this.tokenACustodyKey,
        custodyTokenB: this.tokenBCustodyKey,
        order: await this.getOrderKey(userId, tif, nextPool ? 1 : 0),
        pool: await this.getPoolKey(tif, nextPool ? 1 : 0),
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
      .signers([this.users[userId]])
      .rpc()
      .catch((err) => {
        if (this.printErrors) {
          console.error(err);
        }
        throw err;
      });
  };

  initPoolMetas = async (tifs: number[]) => {
    this.poolMetas = [];
    for (const tif of tifs) {
      if (tif) {
        this.poolMetas.push({
          isSigner: false,
          isWritable: true,
          pubkey: await this.getPoolKey(tif, 0),
        });
      }
    }
  };

  settle = async (
    side: OrderSide,
    amount: number,
    minAmount?: number,
    worstExchangeRate?: number
  ) => {
    if (!this.poolMetas) {
      throw new Error("No TIFs set");
    }

    await this.program.methods
      .settle({
        supplySide: side === "sell" ? { sell: {} } : { buy: {} },
        minTokenAmountIn: new anchor.BN(minAmount ? minAmount : 1),
        maxTokenAmountIn: new anchor.BN(amount),
        worstExchangeRate: new anchor.BN(
          worstExchangeRate ? worstExchangeRate : 1
        ),
      })
      .accounts({
        owner: this.users[3].publicKey,
        userAccountTokenA: this.tokenAWallets[3],
        userAccountTokenB: this.tokenBWallets[3],
        tokenPair: this.tokenPairKey,
        transferAuthority: this.authorityKey,
        custodyTokenA: this.tokenACustodyKey,
        custodyTokenB: this.tokenBCustodyKey,
        oracleTokenA: this.oracleTokenAKey,
        oracleTokenB: this.oracleTokenBKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(this.poolMetas)
      .signers([this.users[3]])
      .rpc()
      .catch((err) => {
        if (this.printErrors) {
          console.error(err);
        }
        throw err;
      });
  };

  getTokenAAmount = (amountTokenB: number) => {
    let amountA = new anchor.BN(amountTokenB)
      .imul(new anchor.BN(1000000000))
      .imul(new anchor.BN(this.tokenBPrice))
      .div(new anchor.BN(this.tokenAPrice));

    return this.convertAmount(
      amountA,
      this.tokenBDecimals,
      this.tokenADecimals
    );
  };

  getTokenBAmount = (amountTokenA: number) => {
    let amountB = new anchor.BN(amountTokenA)
      .imul(new anchor.BN(1000000000))
      .imul(new anchor.BN(this.tokenAPrice))
      .div(new anchor.BN(this.tokenBPrice));

    return this.convertAmount(
      amountB,
      this.tokenADecimals,
      this.tokenBDecimals
    );
  };

  convertAmount = (
    amount: anchor.BN,
    source_decimals: number,
    target_decimals: number
  ) => {
    if (source_decimals === target_decimals) {
      return Math.floor(Number(amount.div(new anchor.BN(1000000000))));
    } else if (target_decimals > source_decimals) {
      return Math.floor(
        Number(
          amount
            .imul(new anchor.BN(10 ** (target_decimals - source_decimals)))
            .div(new anchor.BN(1000000000))
        )
      );
    } else {
      return Math.floor(
        Number(
          amount
            .div(new anchor.BN(10 ** (source_decimals - target_decimals)))
            .div(new anchor.BN(1000000000))
        )
      );
    }
  };
}
