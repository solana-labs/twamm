import type { Connection, PublicKey } from "@solana/web3.js";
import type { DefaultApi } from "@jup-ag/api";
import {
  LAMPORTS_PER_SOL,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { isNil } from "ramda";
import type { Route } from "./use-swap-routes-from-jup";
import useBlockchain from "../contexts/solana-connection-context";
// import useJupiterContext from "../contexts/jupiter-connection-context";
import useTxRunner from "../contexts/transaction-runner-context";
import useJupiterV4Api from "../contexts/jupiter-v4-api-context";
import { JUPITER_CONFIG_URI } from "../env";

const predictBestRoute = (routes: Route[]) => {
  const bestRoute = routes[0];
  // jupiter returns list of routes with the best one at 0 index
  return bestRoute;
};

const calculateComputeUnitPrice = (budget: number | undefined) => {
  if (isNil(budget)) return undefined;
  const maxUnitsBudget = 1400000;
  return Number.parseInt(
    String(((budget * LAMPORTS_PER_SOL) / maxUnitsBudget) * 1e6),
    10
  );
};

const verifyTransaction = async (tx: Transaction, owner: PublicKey) => {
  function checkKeys(t: Transaction, user: PublicKey) {
    const i = t.instructions.at(-1);
    const userAddress = user.toBase58();

    if (!i) throw new Error("Absent instructions");

    i.keys.forEach((key) => {
      if (key.isSigner && key.pubkey.toBase58() !== userAddress) {
        throw new Error("Owner addresses do not match");
      }
    });

    return t;
  }

  return checkKeys(tx, owner);
};

async function v4SwapPost(route: Route, userPublicKey: string) {
  const transactions = await (
    await fetch(`${JUPITER_CONFIG_URI}/v4/swap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route,
        userPublicKey,
      }),
    })
  ).json();

  return transactions;
}

/* eslint-disable */
async function runVersionedTransaction(
  connection: Connection,
  signTransaction: (t: Transaction) => Promise<Transaction>,
  api: DefaultApi,
  route: Route,
  userPublicKey: PublicKey
) {
  const { swapTransaction } = await v4SwapPost(route, userPublicKey.toBase58());

  const rawTransaction = Buffer.from(swapTransaction, "base64");

  const transactionMessage =
    VersionedTransaction.deserialize(rawTransaction).message;

  const transaction = new VersionedTransaction(transactionMessage);

  return null;
}
/* eslint-enable */

async function runLegacyTransaction(
  connection: Connection,
  signTransaction: (t: Transaction) => Promise<Transaction>,
  api: ReturnType<typeof useJupiterV4Api>,
  route: Route,
  userPublicKey: PublicKey,
  performanceFee: number | undefined
) {
  const args = {
    route,
    computeUnitPriceMicroLamports: calculateComputeUnitPrice(performanceFee),
    asLegacyTransaction: true,
    userPublicKey: userPublicKey.toBase58(),
  };

  const { swapTransaction } = await api.v4SwapPost({
    route: args.route,
    computeUnitPriceMicroLamports: args.computeUnitPriceMicroLamports,
    asLegacyTransaction: args.asLegacyTransaction,
    userPublicKey: args.userPublicKey,
  });

  if (!swapTransaction) throw new Error("Could not fetch the transaction data");

  const rawTransaction = Buffer.from(swapTransaction, "base64");

  const transaction = Transaction.from(rawTransaction);

  await verifyTransaction(transaction, userPublicKey);

  await signTransaction(transaction);

  const txid = await connection.sendRawTransaction(transaction.serialize());

  // FEAT: resolve deprecation
  await connection.confirmTransaction(txid);

  return txid;
}

export default () => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useBlockchain();
  // const { api } = useJupiterContext();
  const { commit, performanceFee /* , versionedAPI */ } = useTxRunner();
  const apiV4 = useJupiterV4Api();

  const run = async (routes: Route[]) => {
    if (!publicKey || !signTransaction)
      throw new Error("Can not find the wallet");

    const route = predictBestRoute(routes);

    if (!route) throw new Error("Can not find the route");

    // FEAT: resolve issues with wallet provider to support VersionedTransactions
    const result = await runLegacyTransaction(
      connection,
      signTransaction,
      apiV4,
      route,
      publicKey,
      !performanceFee ? undefined : performanceFee
    );

    return result;
  };

  return {
    execute: async (routes: Route[]) => {
      const data = await commit(run(routes));

      return data;
    },
  };
};
