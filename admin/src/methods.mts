import * as web3 from "@solana/web3.js";
import * as spl from "@solana/spl-token";
import * as t from "io-ts";
import Debug from "debug";
import { SimulateResponse } from "@project-serum/anchor/dist/cjs/program/namespace/simulate.js";
import * as meta from "./utils/prepare-admin-meta.mts";
import * as poolMeta from "./utils/prepare-pool-meta.mts";
import * as types from "./types.mts";
import BN from "./utils/bn.mts";
import Client, * as cli from "./client.mts";
import loader from "./utils/loader.mts";
import { fetchOrderComplData, getTime, prettifyJSON } from "./utils/index.mts";

const _log = Debug("twamm-admin:methods");
const log = (msg: any, affix?: string) => {
  const output = affix ? _log.extend(affix) : _log;
  output(prettifyJSON(msg));
};

const clamp = (input: number, min: number = 60, max: number = 600) =>
  input <= min ? min : input >= max ? max : input;

type RunOptions = { dryRun?: boolean };

export type CommandInput<O, A> = {
  options: O;
  arguments: A;
};

const cancelOrder = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<
    unknown,
    {
      lpAmount: BN;
      nextPool: boolean;
      order: web3.PublicKey;
      owner: web3.PublicKey;
      pool: web3.PublicKey;
      tif: number;
      tokenPair: web3.PublicKey;
      tokenPairData: any;
    }
  >,
  signer: web3.Keypair,
  opts: RunOptions
) => {
  log(command);
  loader.start(`Canceling order ${command.arguments.order.toBase58()}`);

  const { lpAmount, owner, pool, tokenPair, order, tokenPairData } =
    command.arguments;

  const authority = (await cli.transferAuthority(client.program)).pda;

  const tokenA = tokenPairData.configA.mint;
  const tokenB = tokenPairData.configB.mint;

  const userAccountTokenA = (
    await cli.getOrCreateTokenCustody(
      client.provider.connection,
      signer,
      owner,
      tokenA,
      false
    )
  ).address;
  const userAccountTokenB = (
    await cli.getOrCreateTokenCustody(
      client.provider.connection,
      signer,
      owner,
      tokenB,
      false
    )
  ).address;

  const accounts = {
    payer: signer.publicKey,
    owner: owner,
    userAccountTokenA,
    userAccountTokenB,
    tokenPair,
    transferAuthority: authority,
    custodyTokenA: await cli.tokenCustody(authority, tokenA),
    custodyTokenB: await cli.tokenCustody(authority, tokenB),
    order,
    pool,
    tokenProgram: spl.TOKEN_PROGRAM_ID,
  };

  log(accounts, "cancel_order");

  const m = client.program.methods
    .cancelOrder({ lpAmount })
    .accounts(accounts)
    .signers([signer]);

  let result = opts.dryRun ? await m.simulate() : await m.rpc();

  loader.stop();
  return result;
};

export const completeOrders = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<{ feature?: "test" }, unknown>,
  signer: web3.Keypair,
  opts: RunOptions
) => {
  log(command);
  loader.start("Cancelling orders");

  const hasTestFeatureFlag = command.options.feature === "test";

  const ordersComplete = await fetchOrderComplData(
    client,
    hasTestFeatureFlag ? { fetchTokenPairs: true } : undefined
  );

  const expiredOrders = ordersComplete.mapEntries(([k, v]: [string, any]) => {
    const hasExpiredStatus = v._pool.status.expired ? true : false;
    const now = getTime();
    const hasNoBalance =
      v._pool.buySide.sourceBalance.toNumber === 0 &&
      v._pool.sellSide.sourceBalance.toNumber() === 0;

    let isExpired;
    if (hasTestFeatureFlag) {
      const poolExpTime = v._pool.expirationTime.toNumber();
      isExpired =
        hasExpiredStatus ||
        hasNoBalance ||
        v._tokenPair.inceptionTime.toNumber() >
          poolExpTime + clamp(v._pool.timeInForce / 100);
    } else {
      const poolExpTime = v._pool.expirationTime.toNumber();
      isExpired =
        hasExpiredStatus ||
        hasNoBalance ||
        now > poolExpTime + clamp(v._pool.timeInForce / 100);
    }

    return isExpired ? [k, v] : undefined;
  });

  if (expiredOrders.size === 0) {
    loader.stop();
    return [];
  }

  let results = [];
  for (let [, current] of expiredOrders.entries()) {
    const sig = await cancelOrder(
      client,
      {
        options: {},
        arguments: {
          owner: current.owner,
          tif: current._pool.timeInForce,
          lpAmount: new BN(Number.MAX_SAFE_INTEGER),
          nextPool: false,
          tokenPair: current.tokenPair,
          tokenPairData: current._tokenPair,
          pool: current.pool,
          order: current.self.publicKey,
        },
      },
      signer,
      opts
    );
    results.push(sig);
  }

  loader.stop();
  return results;
};

export const deleteTestPair = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<t.TypeOf<typeof types.DeleteTestPairOpts>, unknown>,
  signer: web3.Keypair,
  opts: RunOptions
): Promise<string | SimulateResponse<any, any>> => {
  log(command);

  log("Fetching token pair...");

  const pair = await client.program.account.tokenPair.fetch(
    command.options.tokenPair
  );

  const tokenA = pair.configA.mint;
  const tokenB = pair.configB.mint;

  const authority = (await cli.transferAuthority(client.program)).pda;

  const receiver = command.options.receiver;
  const userAccountTokenA = (
    await cli.getOrCreateTokenCustody(
      client.provider.connection,
      signer,
      receiver,
      tokenA,
      false
    )
  ).address;
  const userAccountTokenB = (
    await cli.getOrCreateTokenCustody(
      client.provider.connection,
      signer,
      receiver,
      tokenB,
      false
    )
  ).address;

  const accounts = {
    admin: signer.publicKey,
    custodyTokenA: await cli.tokenCustody(authority, tokenA),
    custodyTokenB: await cli.tokenCustody(authority, tokenB),
    multisig: (await cli.multisig(client.program)).pda,
    tokenPair: command.options.tokenPair,
    transferAuthority: (await cli.transferAuthority(client.program)).pda,
    userAccountTokenA,
    userAccountTokenB,
    tokenProgram: spl.TOKEN_PROGRAM_ID,
  };

  log(accounts, "delete_test_pair");

  const m = client.program.methods
    .deleteTestPair({})
    .accounts(accounts)
    .signers([signer]);

  return opts.dryRun ? m.simulate() : m.rpc();
};

export const deleteTestPool = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<t.TypeOf<typeof types.DeleteTestPoolOpts>, unknown>,
  signer: web3.Keypair,
  opts: RunOptions
): Promise<string | SimulateResponse<any, any>> => {
  log(command);

  log("Fetching token pair...");

  const pair = await client.program.account.tokenPair.fetch(
    command.options.tokenPair
  );

  const tokenA = pair.configA.mint;
  const tokenB = pair.configB.mint;

  const authority = (await cli.transferAuthority(client.program)).pda;

  const custodyTokenA = await cli.tokenCustody(authority, tokenA);
  const custodyTokenB = await cli.tokenCustody(authority, tokenB);

  const { nextPool, timeInForce } = command.options;

  const accounts = {
    admin: signer.publicKey,
    custodyTokenA,
    custodyTokenB,
    multisig: (await cli.multisig(client.program)).pda,
    tokenPair: command.options.tokenPair,
    transferAuthority: (await cli.transferAuthority(client.program)).pda,
    pool: (
      await cli.getPoolKey(
        client.program,
        custodyTokenA,
        custodyTokenB,
        timeInForce,
        new BN(String(nextPool))
      )
    ).pda,
  };

  log(accounts, "delete_test_pool");

  const m = client.program.methods
    .deleteTestPool({})
    .accounts(accounts)
    .signers([signer]);

  return opts.dryRun ? m.simulate() : m.rpc();
};

export const getOutstandingAmount = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<
    t.TypeOf<typeof types.GetOutstandingAmountOpts>,
    unknown
  >,
  opts: RunOptions
): Promise<string | SimulateResponse<any, any>> => {
  log(command);

  log("Fetching token pair...");

  const pair = await client.program.account.tokenPair.fetch(
    command.options.tokenPair
  );

  const accounts = {
    tokenPair: command.options.tokenPair,
    oracleTokenA: pair.configA.oracleAccount,
    oracleTokenB: pair.configB.oracleAccount,
  };

  const tokenA = pair.configA.mint;
  const tokenB = pair.configB.mint;

  const authority = (await cli.transferAuthority(client.program)).pda;

  const custodyTokenA = await cli.tokenCustody(authority, tokenA);
  const custodyTokenB = await cli.tokenCustody(authority, tokenB);

  const poolMetas: web3.AccountMeta[] = [];
  for (const [i, tif] of pair.tifs.entries()) {
    if (pair.currentPoolPresent[i]) {
      let poolKey = await cli.getPoolKey(
        client.program,
        custodyTokenA,
        custodyTokenB,
        pair.tifs[i],
        pair.poolCounters[i]
      );
      poolMetas.push(poolMeta.fromPublicKey(poolKey.pda));
    }
  }

  log(accounts, "get_outstanding_amount");

  const m = client.program.methods
    .getOutstandingAmount({})
    .accounts(accounts)
    .remainingAccounts(poolMetas);

  return opts.dryRun ? m.simulate() : m.rpc();
};

export const init = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<
    { minSignatures: number },
    { pubkeys: web3.PublicKey[] }
  >,
  opts: RunOptions
): Promise<string | SimulateResponse<any, any>> => {
  const { minSignatures } = command.options;
  const { pubkeys } = command.arguments;

  const adminMetas = pubkeys.map<web3.AccountMeta>(meta.fromPublicKey);

  const accounts = {
    multisig: (await cli.multisig(client.program)).pda,
    systemProgram: web3.SystemProgram.programId,
    transferAuthority: (await cli.transferAuthority(client.program)).pda,
    twammProgram: client.program.programId,
    twammProgramData: (await cli.twammProgramData(client.program)).pda,
    upgradeAuthority: client.provider.wallet.publicKey,
  };

  log(accounts, "init");

  const m = client.program.methods
    .init({ minSignatures })
    .accounts(accounts)
    .remainingAccounts(adminMetas);

  return opts.dryRun ? m.simulate() : m.rpc();
};

export const initTokenPair = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<
    types.TokenPairType,
    { a: web3.PublicKey; b: web3.PublicKey }
  >,
  signer: web3.Keypair,
  opts: RunOptions
): Promise<string | SimulateResponse<any, any>> => {
  log(command);

  const authority = (await cli.transferAuthority(client.program)).pda;
  const { a, b } = command.arguments;

  const accounts = {
    admin: signer.publicKey,
    multisig: (await cli.multisig(client.program)).pda,
    tokenPair: (await cli.tokenPair(client.program, a, b)).pda,
    transferAuthority: authority,
    mintTokenA: a,
    mintTokenB: b,
    custodyTokenA: await cli.tokenCustody(authority, a),
    custodyTokenB: await cli.tokenCustody(authority, b),
    systemProgram: web3.SystemProgram.programId,
    rent: web3.SYSVAR_RENT_PUBKEY,
    tokenProgram: spl.TOKEN_PROGRAM_ID,
    associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
  };

  log(accounts, "init_token_pair");

  const m = client.program.methods
    .initTokenPair(command.options)
    .accounts(accounts)
    .signers([signer]);

  return opts.dryRun ? m.simulate() : m.rpc();
};

export const listMultisig = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<unknown, unknown>
) => {
  log(command);
  loader.start("Loading multisig");

  const all = await client.program.account.multisig.all();

  loader.stop();
  return all;
};

export const listOrders = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<t.TypeOf<typeof types.ListOrdersOpts>, unknown>
) => {
  log(command);
  loader.start("Loading orders");

  const { wallet, tokenPair } = command.options;

  const ordersComplete = await fetchOrderComplData(client);

  let result: any[] = [...ordersComplete.values()].map((v) => v.self);

  if (wallet || tokenPair) {
    result = [];
    [...ordersComplete.values()].forEach((orderItem) => {
      const hasOwner = wallet && orderItem.owner.equals(wallet);
      const hasTPair =
        tokenPair && (orderItem.tokenPair?.equals(tokenPair) ?? false);

      if (wallet && !tokenPair && hasOwner) {
        result.push(orderItem.self);
      } else if (tokenPair && !wallet && hasTPair) {
        result.push(orderItem.self);
      } else if (wallet && tokenPair && hasOwner && hasTPair) {
        result.push(orderItem.self);
      }
    });
  }

  loader.stop();
  return result;
};

export const listPools = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<t.TypeOf<typeof types.ListPoolsOpts>, unknown>
) => {
  log(command);
  loader.start("Loading pools");

  const { tokenPair } = command.options;

  const all = await client.program.account.pool.all();

  let result: any[] = all;
  if (tokenPair) {
    result = all.filter((pool: any) =>
      pool.account.tokenPair.equals(tokenPair)
    );
  }

  loader.stop();
  return result;
};

export const listTokenPairs = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<t.TypeOf<typeof types.ListTokenPairsOpts>, unknown>
) => {
  log(command);
  loader.start("Loading pairs");

  let all = await client.program.account.tokenPair.all();

  if (command.options.mint) {
    all = all.filter(
      (tp: any) =>
        tp.account.configA.mint.equals(command.options.mint) ||
        tp.account.configB.mint.equals(command.options.mint)
    );
  }

  loader.stop();
  return all;
};

export const setAdminSigners = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<
    { minSignatures: number },
    { pubkeys: web3.PublicKey[] }
  >,
  signer: web3.Keypair,
  opts: RunOptions
) => {
  log(command);

  const { minSignatures } = command.options;
  const { pubkeys } = command.arguments;

  const adminMetas = pubkeys.map<web3.AccountMeta>(meta.fromPublicKey);

  const accounts = {
    admin: signer.publicKey,
    multisig: (await cli.multisig(client.program)).pda,
  };

  log(accounts, "set_admin_signers");

  const m = client.program.methods
    .setAdminSigners({ minSignatures })
    .accounts(accounts)
    .remainingAccounts(adminMetas)
    .signers([signer]);

  return opts.dryRun ? m.simulate() : m.rpc();
};

export const setCrankAuthority = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<
    { tokenPair: web3.PublicKey },
    t.TypeOf<typeof types.SetCrankAuthorityParams>
  >,
  signer: web3.Keypair,
  opts: RunOptions
): Promise<string | SimulateResponse<any, any>> => {
  log(command);

  const accounts = {
    admin: signer.publicKey,
    multisig: (await cli.multisig(client.program)).pda,
    tokenPair: command.options.tokenPair,
  };

  log(accounts, "set_crank_authority");

  const { crankAuthority } = command.arguments;

  const m = client.program.methods
    .setCrankAuthority({
      crankAuthority,
    })
    .accounts(accounts)
    .signers([signer]);

  return opts.dryRun ? m.simulate() : m.rpc();
};

export const setFees = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<
    { tokenPair: web3.PublicKey },
    t.TypeOf<typeof types.SetFeesParams>
  >,
  signer: web3.Keypair,
  opts: RunOptions
): Promise<string | SimulateResponse<any, any>> => {
  log(command);

  const accounts = {
    admin: signer.publicKey,
    multisig: (await cli.multisig(client.program)).pda,
    tokenPair: command.options.tokenPair,
  };

  log(accounts, "set_fees");

  const m = client.program.methods
    .setFees(command.arguments)
    .accounts(accounts)
    .signers([signer]);

  return opts.dryRun ? m.simulate() : m.rpc();
};

export const setLimits = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<
    { tokenPair: web3.PublicKey },
    t.TypeOf<typeof types.SetLimitsParams>
  >,
  signer: web3.Keypair,
  opts: RunOptions
): Promise<string | SimulateResponse<any, any>> => {
  log(command);

  const accounts = {
    admin: signer.publicKey,
    multisig: (await cli.multisig(client.program)).pda,
    tokenPair: command.options.tokenPair,
  };

  log(accounts, "set_limits");

  const m = client.program.methods
    .setLimits(command.arguments)
    .accounts(accounts)
    .signers([signer]);

  return opts.dryRun ? m.simulate() : m.rpc();
};

export const setOracleConfig = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<
    { tokenPair: web3.PublicKey },
    t.TypeOf<typeof types.SetOracleConfigParams>
  >,
  signer: web3.Keypair,
  opts: RunOptions
): Promise<string | SimulateResponse<any, any>> => {
  log(command);

  const accounts = {
    admin: signer.publicKey,
    multisig: (await cli.multisig(client.program)).pda,
    tokenPair: command.options.tokenPair,
  };

  log(accounts, "set_oracle_config");

  // casting object structs to satisfy anchor's `never` from Idl
  const args = command.arguments as typeof command.arguments & {
    oracleTypeTokenA: never;
    oracleTypeTokenB: never;
  };

  const m = client.program.methods
    .setOracleConfig(args)
    .accounts(accounts)
    .signers([signer]);

  return opts.dryRun ? m.simulate() : m.rpc();
};

export const setPermissions = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<
    { tokenPair: web3.PublicKey },
    t.TypeOf<typeof types.SetPermissionsParams>
  >,
  signer: web3.Keypair,
  opts: RunOptions
): Promise<string | SimulateResponse<any, any>> => {
  log(command);

  const accounts = {
    admin: signer.publicKey,
    multisig: (await cli.multisig(client.program)).pda,
    tokenPair: command.options.tokenPair,
  };

  log(accounts, "set_permissions");

  const m = client.program.methods
    .setPermissions(command.arguments)
    .accounts(accounts)
    .signers([signer]);

  return opts.dryRun ? m.simulate() : m.rpc();
};

export const setTestOraclePrice = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<
    t.TypeOf<typeof types.SetTestOraclePriceOpts>,
    t.TypeOf<typeof types.SetTestOraclePriceParams>
  >,
  signer: web3.Keypair,
  opts: RunOptions
): Promise<string | SimulateResponse<any, any>> => {
  log(command);

  log("Fetching token pair...");

  const pair = await client.program.account.tokenPair.fetch(
    command.options.tokenPair
  );

  const oracleAccountTokenA = pair.configA.oracleAccount;
  const oracleAccountTokenB = pair.configB.oracleAccount;

  const accounts = {
    admin: signer.publicKey,
    multisig: (await cli.multisig(client.program)).pda,
    tokenPair: command.options.tokenPair,
    oracleTokenA: oracleAccountTokenA,
    oracleTokenB: oracleAccountTokenB,
    systemProgram: web3.SystemProgram.programId,
  };

  log(accounts, "set_test_oracle_price");

  const m = client.program.methods
    .setTestOraclePrice(command.arguments)
    .accounts(accounts)
    .signers([signer]);

  return opts.dryRun ? m.simulate() : m.rpc();
};

export const setTestTime = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<
    t.TypeOf<typeof types.SetTestTimeOpts>,
    t.TypeOf<typeof types.SetTestTimeParams>
  >,
  signer: web3.Keypair,
  opts: RunOptions
): Promise<string | SimulateResponse<any, any>> => {
  log(command);

  const accounts = {
    admin: signer.publicKey,
    multisig: (await cli.multisig(client.program)).pda,
    tokenPair: command.options.tokenPair,
  };

  log(accounts, "set_test_time");

  const m = client.program.methods
    .setTestTime(command.arguments)
    .accounts(accounts)
    .signers([signer]);

  return opts.dryRun ? m.simulate() : m.rpc();
};

export const setTimeInForce = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<
    { tokenPair: web3.PublicKey },
    t.TypeOf<typeof types.SetTimeInForceParams>
  >,
  signer: web3.Keypair,
  opts: RunOptions
): Promise<string | SimulateResponse<any, any>> => {
  log(command);

  const accounts = {
    admin: signer.publicKey,
    multisig: (await cli.multisig(client.program)).pda,
    tokenPair: command.options.tokenPair,
  };

  log(accounts, "set_time_in_force");

  const { timeInForceIndex, newTimeInForce } = command.arguments;

  const m = client.program.methods
    .setTimeInForce({
      timeInForceIndex,
      newTimeInForce,
    })
    .accounts(accounts)
    .signers([signer]);

  return opts.dryRun ? m.simulate() : m.rpc();
};

export const settle = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<
    t.TypeOf<typeof types.SettleOpts>,
    t.TypeOf<typeof types.SettleParams>
  >,
  signer: web3.Keypair,
  opts: RunOptions
): Promise<string | SimulateResponse<any, any>> => {
  log(command);

  log("Fetching token pair...");

  const pair = await client.program.account.tokenPair.fetch(
    command.options.tokenPair
  );

  const tokenA = pair.configA.mint;
  const tokenB = pair.configB.mint;

  const authority = (await cli.transferAuthority(client.program)).pda;

  const custodyTokenA = await cli.tokenCustody(authority, tokenA);
  const custodyTokenB = await cli.tokenCustody(authority, tokenB);

  const poolMetas: web3.AccountMeta[] = [];
  for (let i = 0; i <= pair.tifs.length - 1; i++) {
    // adding current poolMetas
    if (pair.currentPoolPresent[i]) {
      let poolKey = await cli.getPoolKey(
        client.program,
        custodyTokenA,
        custodyTokenB,
        pair.tifs[i],
        pair.poolCounters[i]
      );
      poolMetas.push(poolMeta.fromPublicKey(poolKey.pda));
    }
  }

  const receiver = signer.publicKey;
  const userAccountTokenA = (
    await cli.getOrCreateTokenCustody(
      client.provider.connection,
      signer,
      receiver,
      tokenA,
      false
    )
  ).address;
  const userAccountTokenB = (
    await cli.getOrCreateTokenCustody(
      client.provider.connection,
      signer,
      receiver,
      tokenB,
      false
    )
  ).address;

  const accounts = {
    owner: signer.publicKey,
    custodyTokenA,
    custodyTokenB,
    multisig: (await cli.multisig(client.program)).pda,
    oracleTokenA: pair.configA.oracleAccount,
    oracleTokenB: pair.configB.oracleAccount,
    tokenPair: command.options.tokenPair,
    transferAuthority: (await cli.transferAuthority(client.program)).pda,
    userAccountTokenA,
    userAccountTokenB,
    tokenProgram: spl.TOKEN_PROGRAM_ID,
  };

  log(accounts, "settle");

  const params = command.arguments as typeof command.arguments & {
    supplySide: never;
  };

  const m = client.program.methods
    .settle(params)
    .accounts(accounts)
    .signers([signer])
    .remainingAccounts(poolMetas);

  return opts.dryRun ? m.simulate() : m.rpc();
};

export const withdrawFees = async (
  client: ReturnType<typeof Client>,
  command: CommandInput<
    t.TypeOf<typeof types.WithdrawFeesOpts>,
    t.TypeOf<typeof types.WithdrawFeesParams>
  >,
  signer: web3.Keypair,
  opts: RunOptions
): Promise<string | SimulateResponse<any, any>> => {
  log(command);

  const authority = (await cli.transferAuthority(client.program)).pda;

  const [receiverTokenA, receiverTokenB, receiverSol] =
    command.options.receiverKeys;

  log("Fetching token pair...");

  const pair = await client.program.account.tokenPair.fetch(
    command.options.tokenPair
  );

  const tokenA = pair.configA.mint;
  const tokenB = pair.configB.mint;

  const accounts = {
    admin: signer.publicKey,
    multisig: (await cli.multisig(client.program)).pda,
    tokenPair: command.options.tokenPair,
    transferAuthority: (await cli.transferAuthority(client.program)).pda,
    custodyTokenA: await cli.tokenCustody(authority, tokenA),
    custodyTokenB: await cli.tokenCustody(authority, tokenB),
    receiverTokenA: (
      await cli.getOrCreateTokenCustody(
        client.provider.connection,
        signer,
        receiverTokenA,
        tokenA,
        false
      )
    ).address,
    receiverTokenB: (
      await cli.getOrCreateTokenCustody(
        client.provider.connection,
        signer,
        receiverTokenB,
        tokenB,
        false
      )
    ).address,
    receiverSol,
    tokenProgram: spl.TOKEN_PROGRAM_ID,
  };

  log(accounts, "withdraw_fees");

  const m = client.program.methods
    .withdrawFees(command.arguments)
    .accounts(accounts)
    .signers([signer]);

  return opts.dryRun ? m.simulate() : m.rpc();
};
