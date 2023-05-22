import { Cluster, clusterApiUrl } from "@solana/web3.js";
import { address } from "@twamm/client.js";
import { ClusterApiUrl as clusterUrl } from "../env";

const TARGET_NS: Cluster = "mainnet-beta"; // would be used to check the coin mint against
const TESTNET_NS = "testnet";
const DEVNET_NS = "devnet";

/// From the mainnet-beta to the testnet and back (4 testing purposes)
// The intent here is to allow using the app with coins at the testnet|devnet environments.
// The main issue is that the coin' mints are not the same at the different environments.
// In that case we have to replace the mainnet-beta coin with the testnet|devnet one.

export const clusterEnv: Cluster = ((uri?: string) => {
  try {
    if (!uri) {
      throw new Error("Cluster URL is missing");
    }
    const url = new URL(uri); // eslint-disable-line @typescript-eslint/no-unused-vars
  } catch (e: any) {
    throw e instanceof Error ? e : new Error("Cluster URL is invalid");
  }

  const testnet: Cluster = TESTNET_NS;
  const devnet: Cluster = DEVNET_NS;
  if (uri === clusterApiUrl(testnet)) return testnet;
  if (uri === clusterApiUrl(devnet)) return devnet;

  return TARGET_NS;
})(clusterUrl);

export const resolveCoinAddress = (
  coin: string,
  ns: Cluster = TARGET_NS
): string => {
  if (ns === TARGET_NS) return coin;
  // give back the addresss as is for the mainnet

  /// mainnet-beta coin addresses
  const origin = [
    address.NATIVE_TOKEN_ADDRESS,
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  ];

  const wSOL = origin[0];
  const USDC = origin[1];
  const USDT = origin[2];

  /// Store addresses 4 common tokens to be functional at the testnet & devnet
  const testnet = new Map([
    [wSOL, address.NATIVE_TOKEN_ADDRESS],
    [USDC, "CpMah17kQEL2wqyMKt3mZBdTnZbkbfx4nqmQMFDP5vwp"],
    [USDT, "ASpA3U8G2qHnyo6ag1jwtpZNj9E2MymbVDq6twi3ZvRN"],
  ]);

  const devnet = new Map([
    [wSOL, address.NATIVE_TOKEN_ADDRESS],
    [USDC, "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"],
    [USDT, "EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS"],
  ]);

  if (origin.includes(coin)) {
    let result;
    /// return non-mainnet address by mainnet-specific coin
    if (ns === TESTNET_NS) result = testnet.get(coin);
    if (ns === DEVNET_NS) result = devnet.get(coin);
    if (!result) {
      const error = new Error(`Can not match the coing for: ${ns} ${coin}`);

      console.error(error); // eslint-disable-line no-console
      throw error;
    }
    return result;
  }

  // collect the coins available at testnet|devnet
  const devcoins = new Set(
    [...testnet.values()].slice(1).concat([...devnet.values()].slice(1))
  );

  if ([...devcoins.values()].includes(coin)) {
    const error = new Error(
      "Using unknown coin. Consider to add it to the list"
    );

    console.error(error); // eslint-disable-line no-console
    throw error;
  }

  // return mainnet-specific address for non-mainnet coin

  const source = ns === TESTNET_NS ? testnet : devnet;
  const values = [...source.values()];
  const keys = [...source.keys()];

  const targetIndex = values.findIndex((v) => v === coin);
  return keys[targetIndex];
};

export default (coin: string) => resolveCoinAddress(coin, clusterEnv);
