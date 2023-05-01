import * as anchor from "@project-serum/anchor";
import { TwammTester } from "./twamm_tester";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import * as spl from "@solana/spl-token";
import { expect, assert } from "chai";

describe("basics", () => {
  let twamm = new TwammTester();
  let crankAuthority = PublicKey.default;
  // expected multisig account state
  let multisigExpected;
  // expected token pair account state
  let tokenPairExpected;

  // setup
  it("setup", async () => {
    await twamm.init();
  });

  // instructions tests
  it("init", async () => {
    await twamm.program.methods
      .testInit({ minSignatures: 2 })
      .accounts({
        upgradeAuthority: twamm.provider.wallet.publicKey,
        multisig: twamm.multisigKey,
        transferAuthority: twamm.authorityKey,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(twamm.adminMetas)
      .rpc();

    try {
      await twamm.program.methods
        .testInit({ minSignatures: 3 })
        .accounts({
          upgradeAuthority: twamm.provider.wallet.publicKey,
          multisig: twamm.multisigKey,
          transferAuthority: twamm.authorityKey,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(twamm.adminMetas)
        .rpc();
      assert(false, "Recursive Init should've failed");
    } catch (err) {
      assert(err.logs[3].includes("already in use"));
    }

    let multisig = await twamm.program.account.multisig.fetch(
      twamm.multisigKey
    );
    multisigExpected = {
      numSigners: 2,
      numSigned: 0,
      minSignatures: 2,
      instructionAccountsLen: 0,
      instructionDataLen: 0,
      instructionHash: new anchor.BN(0),
      signers: [
        twamm.admin1.publicKey,
        twamm.admin2.publicKey,
        PublicKey.default,
        PublicKey.default,
        PublicKey.default,
        PublicKey.default,
      ],
      signed: [false, false, false, false, false, false],
      bump: twamm.multisigBump,
    };

    expect(JSON.stringify(multisig)).to.equal(JSON.stringify(multisigExpected));
  });

  it("initTokenPair", async () => {
    await twamm.program.methods
      .initTokenPair({
        allowDeposits: false,
        allowWithdrawals: false,
        allowCranks: false,
        allowSettlements: false,
        feeNumerator: new anchor.BN(1),
        feeDenominator: new anchor.BN(10),
        settleFeeNumerator: new anchor.BN(0),
        settleFeeDenominator: new anchor.BN(1),
        crankRewardTokenA: new anchor.BN(2),
        crankRewardTokenB: new anchor.BN(3),
        minSwapAmountTokenA: new anchor.BN(4),
        minSwapAmountTokenB: new anchor.BN(5),
        maxSwapPriceDiff: 0.1,
        maxUnsettledAmount: 0.3,
        minTimeTillExpiration: 0.3,
        maxOraclePriceErrorTokenA: 123.0,
        maxOraclePriceErrorTokenB: 456.0,
        maxOraclePriceAgeSecTokenA: 8,
        maxOraclePriceAgeSecTokenB: 9,
        oracleTypeTokenA: { none: {} },
        oracleTypeTokenB: { none: {} },
        oracleAccountTokenA: PublicKey.default,
        oracleAccountTokenB: PublicKey.default,
        crankAuthority: crankAuthority,
        timeInForceIntervals: [0, 2, 3, 0, 0, 0, 0, 0, 0, 10],
      })
      .accounts({
        admin: twamm.admin1.publicKey,
        multisig: twamm.multisigKey,
        tokenPair: twamm.tokenPairKey,
        transferAuthority: twamm.authorityKey,
        mintTokenA: twamm.tokenAMint,
        mintTokenB: twamm.tokenBMint,
        custodyTokenA: twamm.tokenACustodyKey,
        custodyTokenB: twamm.tokenBCustodyKey,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([twamm.admin1])
      .rpc();

    try {
      const tokenPair = await twamm.program.account.tokenPair.fetch(
        twamm.tokenPairKey
      );
      assert(false, "TokenPair should've been missing");
    } catch (_err) {}

    // TODO: check token pair usage fails here

    await twamm.program.methods
      .initTokenPair({
        allowDeposits: false,
        allowWithdrawals: false,
        allowCranks: false,
        allowSettlements: false,
        feeNumerator: new anchor.BN(1),
        feeDenominator: new anchor.BN(10),
        settleFeeNumerator: new anchor.BN(0),
        settleFeeDenominator: new anchor.BN(1),
        crankRewardTokenA: new anchor.BN(2),
        crankRewardTokenB: new anchor.BN(3),
        minSwapAmountTokenA: new anchor.BN(4),
        minSwapAmountTokenB: new anchor.BN(5),
        maxSwapPriceDiff: 0.1,
        maxUnsettledAmount: 0.3,
        minTimeTillExpiration: 0.3,
        maxOraclePriceErrorTokenA: 123.0,
        maxOraclePriceErrorTokenB: 456.0,
        maxOraclePriceAgeSecTokenA: 8,
        maxOraclePriceAgeSecTokenB: 9,
        oracleTypeTokenA: { none: {} },
        oracleTypeTokenB: { none: {} },
        oracleAccountTokenA: PublicKey.default,
        oracleAccountTokenB: PublicKey.default,
        crankAuthority: crankAuthority,
        timeInForceIntervals: [0, 2, 3, 0, 0, 0, 0, 0, 0, 10],
      })
      .accounts({
        admin: twamm.admin2.publicKey,
        multisig: twamm.multisigKey,
        tokenPair: twamm.tokenPairKey,
        transferAuthority: twamm.authorityKey,
        mintTokenA: twamm.tokenAMint,
        mintTokenB: twamm.tokenBMint,
        custodyTokenA: twamm.tokenACustodyKey,
        custodyTokenB: twamm.tokenBCustodyKey,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([twamm.admin2])
      .rpc();

    let tokenPair = await twamm.program.account.tokenPair.fetch(
      twamm.tokenPairKey
    );

    tokenPairExpected = {
      allowDeposits: false,
      allowWithdrawals: false,
      allowCranks: false,
      allowSettlements: false,
      feeNumerator: new anchor.BN(1),
      feeDenominator: new anchor.BN(10),
      settleFeeNumerator: new anchor.BN(0),
      settleFeeDenominator: new anchor.BN(1),
      maxSwapPriceDiff: 0.1,
      maxUnsettledAmount: 0.3,
      minTimeTillExpiration: 0.3,
      crankAuthority: crankAuthority,
      configA: {
        crankReward: new anchor.BN(2),
        minSwapAmount: new anchor.BN(4),
        maxOraclePriceError: 123.0,
        maxOraclePriceAgeSec: 8,
        oracleType: { none: {} },
        oracleAccount: PublicKey.default,
        mint: twamm.tokenAMint,
        custody: twamm.tokenACustodyKey,
        decimals: 9,
      },
      configB: {
        crankReward: new anchor.BN(3),
        minSwapAmount: new anchor.BN(5),
        maxOraclePriceError: 456.0,
        maxOraclePriceAgeSec: 9,
        oracleType: { none: {} },
        oracleAccount: PublicKey.default,
        mint: twamm.tokenBMint,
        custody: twamm.tokenBCustodyKey,
        decimals: 6,
      },
      statsA: {
        pendingWithdrawals: new anchor.BN(0),
        feesCollected: new anchor.BN(0),
        orderVolumeUsd: new anchor.BN(0),
        routedVolumeUsd: new anchor.BN(0),
        settledVolumeUsd: new anchor.BN(0),
      },
      statsB: {
        pendingWithdrawals: new anchor.BN(0),
        feesCollected: new anchor.BN(0),
        orderVolumeUsd: new anchor.BN(0),
        routedVolumeUsd: new anchor.BN(0),
        settledVolumeUsd: new anchor.BN(0),
      },
      tifs: [0, 2, 3, 0, 0, 0, 0, 0, 0, 10],
      poolCounters: Array(10).fill(new anchor.BN(0)),
      currentPoolPresent: Array(10).fill(false),
      futurePoolPresent: Array(10).fill(false),
      tokenPairBump: twamm.tokenPairBump,
      transferAuthorityBump: twamm.authorityBump,
      inceptionTime: new anchor.BN(0),
    };

    expect(JSON.stringify(tokenPair)).to.equal(
      JSON.stringify(tokenPairExpected)
    );
  });

  it("setCrankAuthority", async () => {
    crankAuthority = twamm.users[0].publicKey;

    let signature = await twamm.program.methods
      .setCrankAuthority({ crankAuthority: crankAuthority })
      .accounts({
        admin: twamm.admin2.publicKey,
        multisig: twamm.multisigKey,
        tokenPair: twamm.tokenPairKey,
      })
      .signers([twamm.admin2])
      .rpc();
    await twamm.confirmTx(signature);
    let tx_log = await twamm.provider.connection.getTransaction(signature, {
      commitment: "confirmed",
    });
    assert(tx_log.meta.logMessages[4].includes("AQ=="));

    let tokenPair = await twamm.program.account.tokenPair.fetch(
      twamm.tokenPairKey
    );
    expect(JSON.stringify(tokenPair)).to.equal(
      JSON.stringify(tokenPairExpected)
    );

    try {
      await twamm.program.methods
        .setCrankAuthority({ crankAuthority: crankAuthority })
        .accounts({
          admin: twamm.admin2.publicKey,
          multisig: twamm.multisigKey,
          tokenPair: twamm.tokenPairKey,
        })
        .signers([twamm.admin2])
        .rpc();
      assert(false, "Second call to setCrankAuthority expected to fail");
    } catch (_err) {}

    await twamm.program.methods
      .setCrankAuthority({ crankAuthority: crankAuthority })
      .accounts({
        admin: twamm.admin1.publicKey,
        multisig: twamm.multisigKey,
        tokenPair: twamm.tokenPairKey,
      })
      .signers([twamm.admin1])
      .rpc();

    tokenPair = await twamm.program.account.tokenPair.fetch(twamm.tokenPairKey);
    tokenPairExpected.crankAuthority = crankAuthority;
    expect(JSON.stringify(tokenPair)).to.equal(
      JSON.stringify(tokenPairExpected)
    );

    try {
      await twamm.program.methods
        .setCrankAuthority({ crankAuthority: crankAuthority })
        .accounts({
          admin: twamm.provider.wallet.publicKey,
          multisig: twamm.multisigKey,
          tokenPair: twamm.tokenPairKey,
        })
        .rpc();
      assert(false, "Non-admin call to setCrankAuthority expected to fail");
    } catch (err) {
      expect(err.error.errorMessage).to.equal(
        "Account is not authorized to sign this instruction"
      );
    }
  });

  it("setAdminSigners", async () => {
    await twamm.program.methods
      .setAdminSigners({ minSignatures: 1 })
      .accounts({
        admin: twamm.admin1.publicKey,
        multisig: twamm.multisigKey,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(twamm.adminMetas)
      .signers([twamm.admin1])
      .rpc();

    let multisig = await twamm.program.account.multisig.fetch(
      twamm.multisigKey
    );
    expect(multisig.minSignatures).to.equal(2);
    expect(multisig.numSigned).to.equal(1);

    await twamm.program.methods
      .setAdminSigners({ minSignatures: 1 })
      .accounts({
        admin: twamm.admin2.publicKey,
        multisig: twamm.multisigKey,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(twamm.adminMetas)
      .signers([twamm.admin2])
      .rpc();

    multisig = await twamm.program.account.multisig.fetch(twamm.multisigKey);
    multisigExpected.minSignatures = 1;
    expect(JSON.stringify(multisig)).to.equal(JSON.stringify(multisigExpected));
  });

  it("setFees", async () => {
    await twamm.program.methods
      .setFees({
        feeNumerator: new anchor.BN(2),
        feeDenominator: new anchor.BN(100),
        settleFeeNumerator: new anchor.BN(2),
        settleFeeDenominator: new anchor.BN(10),
        crankRewardTokenA: new anchor.BN(22),
        crankRewardTokenB: new anchor.BN(33),
      })
      .accounts({
        admin: twamm.admin2.publicKey,
        multisig: twamm.multisigKey,
        tokenPair: twamm.tokenPairKey,
      })
      .signers([twamm.admin2])
      .rpc();

    let tokenPair = await twamm.program.account.tokenPair.fetch(
      twamm.tokenPairKey
    );
    tokenPairExpected.feeNumerator = new anchor.BN(2);
    tokenPairExpected.feeDenominator = new anchor.BN(100);
    tokenPairExpected.settleFeeNumerator = new anchor.BN(2);
    tokenPairExpected.settleFeeDenominator = new anchor.BN(10);
    tokenPairExpected.configA.crankReward = new anchor.BN(22);
    tokenPairExpected.configB.crankReward = new anchor.BN(33);
    expect(JSON.stringify(tokenPair)).to.equal(
      JSON.stringify(tokenPairExpected)
    );
  });

  it("setLimits", async () => {
    await twamm.program.methods
      .setLimits({
        minSwapAmountTokenA: new anchor.BN(44),
        minSwapAmountTokenB: new anchor.BN(55),
        maxSwapPriceDiff: 0.11,
        maxUnsettledAmount: 0.22,
        minTimeTillExpiration: 0.33,
      })
      .accounts({
        admin: twamm.admin2.publicKey,
        multisig: twamm.multisigKey,
        tokenPair: twamm.tokenPairKey,
      })
      .signers([twamm.admin2])
      .rpc();

    let tokenPair = await twamm.program.account.tokenPair.fetch(
      twamm.tokenPairKey
    );
    tokenPairExpected.maxSwapPriceDiff = 0.11;
    tokenPairExpected.maxUnsettledAmount = 0.22;
    tokenPairExpected.minTimeTillExpiration = 0.33;
    tokenPairExpected.configA.minSwapAmount = new anchor.BN(44);
    tokenPairExpected.configB.minSwapAmount = new anchor.BN(55);
    expect(JSON.stringify(tokenPair)).to.equal(
      JSON.stringify(tokenPairExpected)
    );
  });

  it("setOracleConfig", async () => {
    await twamm.program.methods
      .setOracleConfig({
        maxOraclePriceErrorTokenA: 123.5,
        maxOraclePriceErrorTokenB: 456.5,
        maxOraclePriceAgeSecTokenA: 88,
        maxOraclePriceAgeSecTokenB: 99,
        oracleTypeTokenA: { test: {} },
        oracleTypeTokenB: { test: {} },
        oracleAccountTokenA: twamm.oracleTokenAKey,
        oracleAccountTokenB: twamm.oracleTokenBKey,
      })
      .accounts({
        admin: twamm.admin1.publicKey,
        multisig: twamm.multisigKey,
        tokenPair: twamm.tokenPairKey,
      })
      .signers([twamm.admin1])
      .rpc();

    let tokenPair = await twamm.program.account.tokenPair.fetch(
      twamm.tokenPairKey
    );
    tokenPairExpected.configA.maxOraclePriceError = 123.5;
    tokenPairExpected.configA.maxOraclePriceAgeSec = 88;
    tokenPairExpected.configA.oracleType = { test: {} };
    tokenPairExpected.configA.oracleAccount = twamm.oracleTokenAKey;
    tokenPairExpected.configB.maxOraclePriceError = 456.5;
    tokenPairExpected.configB.maxOraclePriceAgeSec = 99;
    tokenPairExpected.configB.oracleType = { test: {} };
    tokenPairExpected.configB.oracleAccount = twamm.oracleTokenBKey;
    expect(JSON.stringify(tokenPair)).to.equal(
      JSON.stringify(tokenPairExpected)
    );
  });

  it("setPermissions", async () => {
    await twamm.program.methods
      .setPermissions({
        allowDeposits: true,
        allowWithdrawals: true,
        allowCranks: true,
        allowSettlements: true,
      })
      .accounts({
        admin: twamm.admin1.publicKey,
        multisig: twamm.multisigKey,
        tokenPair: twamm.tokenPairKey,
      })
      .signers([twamm.admin1])
      .rpc();

    let tokenPair = await twamm.program.account.tokenPair.fetch(
      twamm.tokenPairKey
    );
    tokenPairExpected.allowDeposits = true;
    tokenPairExpected.allowWithdrawals = true;
    tokenPairExpected.allowCranks = true;
    tokenPairExpected.allowSettlements = true;
    expect(JSON.stringify(tokenPair)).to.equal(
      JSON.stringify(tokenPairExpected)
    );
  });

  it("setTimeInForce", async () => {
    try {
      await twamm.program.methods
        .setTimeInForce({
          timeInForceIndex: 1,
          newTimeInForce: 10,
        })
        .accounts({
          admin: twamm.admin1.publicKey,
          multisig: twamm.multisigKey,
          tokenPair: twamm.tokenPairKey,
        })
        .signers([twamm.admin1])
        .rpc();
      assert(false, "Set duplicate TIF expected to fail");
    } catch (_err) {}

    await twamm.program.methods
      .setTimeInForce({
        timeInForceIndex: 1,
        newTimeInForce: 20,
      })
      .accounts({
        admin: twamm.admin1.publicKey,
        multisig: twamm.multisigKey,
        tokenPair: twamm.tokenPairKey,
      })
      .signers([twamm.admin1])
      .rpc();

    let tokenPair = await twamm.program.account.tokenPair.fetch(
      twamm.tokenPairKey
    );
    tokenPairExpected.tifs = [0, 20, 3, 0, 0, 0, 0, 0, 0, 10];
    expect(JSON.stringify(tokenPair)).to.equal(
      JSON.stringify(tokenPairExpected)
    );
  });

  it("withdrawFees", async () => {
    await twamm.withdrawFees(0, 0, 0);
  });

  it("placeOrder", async () => {
    await twamm.placeOrder(0, "sell", 3, 100);
  });

  it("cancelOrder", async () => {
    await twamm.cancelOrder(0, 3, 1000);
  });

  it("setOraclePrice", async () => {
    await twamm.setOraclePrice(1000, 1000);
  });

  it("setTime", async () => {
    await twamm.setTime(50);
    let tokenPair = await twamm.program.account.tokenPair.fetch(
      twamm.tokenPairKey
    );
    expect(tokenPair.inceptionTime.toString()).to.equal("50");
  });

  it("crank", async () => {
    let poolAccounts = [];
    poolAccounts.push({
      isSigner: false,
      isWritable: true,
      pubkey: await twamm.getPoolKey(20, 0),
    });
    poolAccounts.push({
      isSigner: false,
      isWritable: true,
      pubkey: await twamm.getPoolKey(3, 0),
    });
    poolAccounts.push({
      isSigner: false,
      isWritable: true,
      pubkey: await twamm.getPoolKey(10, 0),
    });

    await twamm.program.methods
      .crank({
        routerInstructionData: Buffer.from([0]),
      })
      .accounts({
        owner: twamm.users[0].publicKey,
        userAccountTokenA: twamm.tokenAWallets[0],
        userAccountTokenB: twamm.tokenBWallets[0],
        tokenPair: twamm.tokenPairKey,
        transferAuthority: twamm.authorityKey,
        custodyTokenA: twamm.tokenACustodyKey,
        custodyTokenB: twamm.tokenBCustodyKey,
        oracleTokenA: twamm.oracleTokenAKey,
        oracleTokenB: twamm.oracleTokenBKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(poolAccounts)
      .signers([twamm.users[0]])
      .rpc();
  });

  it("settle", async () => {
    twamm.initPoolMetas([20, 3, 10]);
    let err = await twamm.ensureFails(twamm.settle("sell", 1000));
    expect(err.error.errorCode.code).to.equal("NothingToSettle");
  });
});
