import Debug from "debug";
import { spawnSync } from "node:child_process";
import test from "ava";
import * as web3 from "@solana/web3.js";

const log = Debug("twamm-admin:tests:fn");

function delay(t = 500) {
  return new Promise((res) => {
    setTimeout(() => {
      res(undefined);
    }, t);
  });
}

function matchError(buf: Buffer, err: string) {
  const isMatched = buf.toString().match(new RegExp(err));
  return isMatched ? isMatched.length > 0 : !!isMatched;
}

const matchSimulationError = (buf: Buffer) => {
  const isMatched = matchError(buf, "SimulateError");

  const skipErr = "FetchError";
  if (matchError(buf, skipErr)) {
    console.debug("Can not fetch the data. Check the test");
  }

  return isMatched;
};

const opts = () => [
  "-k",
  "signer-keypair.json",
  "-u",
  process.env.CLUSTER_MONIKER ?? "devnet",
  "-d",
  "true",
];

const adminSeed = [
  70, 60, 102, 100, 70, 60, 102, 100, 70, 60, 102, 100, 70, 60, 102, 100, 70,
  60, 102, 100, 70, 60, 102, 100, 70, 60, 102, 100, 70, 60, 102, 100,
];

const seed = Uint8Array.from(adminSeed);
const adminKeypair = web3.Keypair.fromSeed(seed);

const coinA = new web3.Keypair();
const coinB = new web3.Keypair();
const tokenPair = new web3.Keypair();
const user = new web3.Keypair();

const admPubkey = adminKeypair.publicKey.toString();
const tpPubkey = tokenPair.publicKey.toString();
const usrPubkey = user.publicKey.toString();

log({
  admin: adminKeypair.publicKey,
  coinA: coinA.publicKey,
  coinB: coinB.publicKey,
  tokenPair: tokenPair.publicKey,
  user: user.publicKey,
});

test.beforeEach(async () => {
  await delay();
});

/// init
test.serial("should fail to simulate | init", (t) => {
  let command = `init ${admPubkey}`;
  let cmd = spawnSync("./cli", opts().concat(command.split(" ")));
  t.assert(matchSimulationError(cmd.stderr));
});

/// initTokenPair
test.serial("should fail to simulate | init-token-pair", (t) => {
  let command = `init-token-pair ${coinA.publicKey.toString()} ${coinB.publicKey.toString()} token_pair.json`;
  let cmd = spawnSync("./cli", opts().concat(command.split(" ")));
  t.assert(matchSimulationError(cmd.stderr));
});

/// deleteTestPair
test.serial("should fail to simulate | delete-test-pair", (t) => {
  let command = `delete-test-pair -tp ${tpPubkey} -r ${usrPubkey}`;
  let cmd = spawnSync("./cli", opts().concat(command.split(" ")));
  t.assert(matchError(cmd.stderr, `Account does not exist ${tpPubkey}`));
  // fail to execute for a random token pair
});

/// deleteTestPool
test.serial("should fail to simulate | delete-test-pool", (t) => {
  let command = `delete-test-pool -tp ${tpPubkey} -tif 300 -np false`;
  let cmd = spawnSync("./cli", opts().concat(command.split(" ")));
  t.assert(matchError(cmd.stderr, `Account does not exist ${tpPubkey}`));
  // fail to execute for a random token pair
});

/// getOutstandingAmount
test.serial("should fail to simulate | get-outstanding-amount", (t) => {
  let command = `get-outstanding-amount -tp ${tpPubkey}`;
  let cmd = spawnSync("./cli", opts().concat(command.split(" ")));
  t.assert(matchError(cmd.stderr, `Account does not exist ${tpPubkey}`));
  // fail to execute for a random token pair
});

/// setAdminSigners
test.serial("should fail to simulate | set-admin-signers", (t) => {
  let command = `set-admin-signers ${admPubkey}`;
  let cmd = spawnSync("./cli", opts().concat(command.split(" ")));
  t.assert(matchSimulationError(cmd.stderr));
});

/// setCrankAuthority
test.serial("should fail to simulate | set-crank-authority", (t) => {
  let command = `set-crank-authority -tp ${tpPubkey} ${admPubkey}`;
  let cmd = spawnSync("./cli", opts().concat(command.split(" ")));
  t.assert(matchSimulationError(cmd.stderr));
});

/// setFees
test.serial("should fail to simulate | set-fees", (t) => {
  let command = `set-fees -tp ${tpPubkey} 2 100 2 10 22 33`;
  let cmd = spawnSync("./cli", opts().concat(command.split(" ")));
  t.assert(matchSimulationError(cmd.stderr));
});

/// setLimits
test.serial("should fail to simulate | set-limits", (t) => {
  let command = `set-limits -tp ${tpPubkey} 44 55 0.11 0.22 0.33`;
  let cmd = spawnSync("./cli", opts().concat(command.split(" ")));
  t.assert(matchSimulationError(cmd.stderr));
});

/// setOracleConfig
test.serial("should fail to simulate | set-oracle-config", (t) => {
  let command = `set-oracle-config -tp ${tpPubkey} ${1e9} ${1e9} 1000 1000 test test`;
  let cmd = spawnSync("./cli", opts().concat(command.split(" ")));
  t.assert(matchError(cmd.stderr, `Account does not exist ${tpPubkey}`));
  // fail to execute for a random token pair
});

/// setPermissions
test.serial("should fail to simulate | set-permissions", (t) => {
  let command = `set-permissions -tp ${tpPubkey} true true true true`;
  let cmd = spawnSync("./cli", opts().concat(command.split(" ")));
  t.assert(matchSimulationError(cmd.stderr));
});

/// setTestOraclePrice
test.serial("should fail to simulate | set-test-oracle-price", (t) => {
  let command = `set-test-oracle-price -tp ${tpPubkey} 1 1 0 0 0 0`;
  let cmd = spawnSync("./cli", opts().concat(command.split(" ")));
  t.assert(matchError(cmd.stderr, `Account does not exist ${tpPubkey}`));
  // fail to execute for a random token pair
});

/// setTestTime
test.serial("should fail to simulate | set-test-time", (t) => {
  let command = `set-test-time -tp ${tpPubkey} 100`;
  let cmd = spawnSync("./cli", opts().concat(command.split(" ")));
  t.assert(matchSimulationError(cmd.stderr));
});

/// setTimeInForce
test.serial("should fail to simulate | set-time-in-force", (t) => {
  let command = `set-time-in-force -tp ${tpPubkey} 3 1800`;
  let cmd = spawnSync("./cli", opts().concat(command.split(" ")));
  t.assert(matchSimulationError(cmd.stderr));
});

/// settle
test.serial("should fail to simulate | settle", (t) => {
  // setTestTime(150) to initialize the underlying pool
  let command = `settle -tp ${tpPubkey} sell 0 ${1e9} 0`;
  let cmd = spawnSync("./cli", opts().concat(command.split(" ")));
  t.assert(matchError(cmd.stderr, `Account does not exist ${tpPubkey}`));
  // fail to execute for a random token pair
});

/// withdrawFees
test.serial("should fail to simulate | withdraw-fees", (t) => {
  let command = `withdraw-fees -tp ${tpPubkey} -rk ${usrPubkey} 0 0 0`;
  let cmd = spawnSync("./cli", opts().concat(command.split(" ")));
  t.assert(matchError(cmd.stderr, `Account does not exist ${tpPubkey}`));
  // fail to execute for a random token pair
});
