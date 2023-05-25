import type { Idl } from "@project-serum/anchor";

import idlJson from "../idl.json";

if (idlJson === null) throw new Error("IDL is invalid");

export const idl = idlJson as Idl;

export const JUPITER_CONFIG_URI = "https://quote-api.jup.ag";

export const JUPITER_PRICE_ENDPOINT_V1 = "https://price.jup.ag/v1/price";

export const NEXT_PUBLIC_ENABLE_TX_SIMUL =
  process.env.NEXT_PUBLIC_ENABLE_TX_SIMUL || "";

const mainTradePair = process.env.NEXT_PUBLIC_MAIN_TRADE_PAIR;
if (!mainTradePair) throw new Error("MAIN_TRADE_PAIR is not set");
export const NEXT_PUBLIC_MAIN_TRADE_PAIR = mainTradePair;

export const AnkrClusterApiUrl = "https://rpc.ankr.com/solana";
export const NEXT_PUBLIC_ANK_CLUSTER_URL = AnkrClusterApiUrl;

const clusterUrl = process.env.NEXT_PUBLIC_CLUSTER_API_URL;
if (!clusterUrl) throw new Error("CLUSTER_API_URL is not set");
export const ClusterApiUrl = clusterUrl;
export const NEXT_PUBLIC_CLUSTER_API_URL = clusterUrl;

export const programId: string | undefined =
  process.env.NEXT_PUBLIC_PROGRAM_ADDRESS;
