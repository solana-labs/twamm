import type { Cluster } from "@solana/web3.js";

type PresetMoniker = Extract<Cluster, "mainnet-beta"> | "ankr-solana";

export type Moniker = PresetMoniker | "custom";

export type ClusterInfo = {
  name: string;
  endpoint: string;
  moniker: Moniker;
};
