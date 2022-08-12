import type { FC, ReactNode } from "react";
import type { Commitment } from "@solana/web3.js";
import { clusterApiUrl, Connection } from "@solana/web3.js";
import R, { useCallback, useContext, useMemo, useRef, useState } from "react";
import { ENV as ChainIdEnv } from "@solana/spl-token-registry";
import ClusterUtils from "../domain/cluster";
import storage, { sanidateURL } from "../utils/config-storage";
import type * as T from "../domain/cluster.d";
import { AnkrClusterApiUrl, ClusterApiUrl } from "../env";

type CommitmentLevel = Extract<Commitment, "confirmed">;

const STORAGE_KEY = "twammClusterEndpoint";
const ENABLE_STORAGE_KEY = "twammEnableClusterEndpoint";

const clusterStorage = storage({
  key: STORAGE_KEY,
  enabled: ENABLE_STORAGE_KEY,
  sanidate: sanidateURL,
});

const COMMITMENT = "confirmed";

export const chainId = ChainIdEnv.MainnetBeta;

const FALLBACK_ENDPOINT = ClusterApiUrl ?? clusterApiUrl("mainnet-beta");

export const endpoints: Record<string, T.ClusterInfo> = {
  solana: {
    name: "Solana",
    endpoint: FALLBACK_ENDPOINT,
    moniker: "mainnet-beta",
  },
  ankr: {
    name: "Ankr",
    endpoint: AnkrClusterApiUrl,
    moniker: "ankr-solana",
  },
  custom: {
    name: "Custom",
    endpoint: FALLBACK_ENDPOINT,
    moniker: "custom",
  },
};

const fallbackCluster = endpoints.solana as T.ClusterInfo;

export type SolanaConnectionContext = {
  readonly presets: typeof endpoints;
  readonly cluster: T.ClusterInfo;
  readonly clusters: T.ClusterInfo[];
  readonly commitment: CommitmentLevel;
  readonly connection: Connection;
  readonly createConnection: (commitment?: CommitmentLevel) => Connection;
  readonly setCluster: (cluster: T.ClusterInfo | T.Moniker) => boolean;
};

export const Context = R.createContext<SolanaConnectionContext | undefined>(
  undefined
);

const cluster = ClusterUtils(fallbackCluster);

export const Provider: FC<{ children: ReactNode }> = ({ children }) => {
  const hasStoredEndpoint = Boolean(
    clusterStorage.enabled() && clusterStorage.get()
  );

  const initialClusters = [
    endpoints.solana,
    endpoints.ankr,
    {
      name: endpoints.custom.name,
      endpoint: hasStoredEndpoint
        ? (clusterStorage.get<string>() as string)
        : endpoints.custom.endpoint,
      moniker: endpoints.custom.moniker,
    },
  ];

  const initialCluster = hasStoredEndpoint
    ? cluster.findBy(clusterStorage.get<string>(), initialClusters)
    : fallbackCluster;

  const [commitment] = useState<CommitmentLevel>(COMMITMENT);
  const [clusters] = useState<T.ClusterInfo[]>(initialClusters);
  const [currentCluster, setCurrentCluster] = useState(initialCluster);
  const [presets] = useState(endpoints);

  const connectionRef = useRef<Connection>(
    new Connection(currentCluster.endpoint, commitment)
  );

  const changeCluster = useCallback(
    (value: T.ClusterInfo | T.Moniker) => {
      const target =
        typeof value !== "string"
          ? value
          : cluster.findByMoniker(value, clusters);

      const isError = clusterStorage.set(target.endpoint);
      // FEAT: fixup multiple responsibilities 4 .set
      const hasError = isError instanceof Error;

      if (!hasError) {
        setCurrentCluster(target);
      }

      return hasError;
    },
    [clusters, setCurrentCluster]
  );

  const createConnection = useCallback(
    (commit: CommitmentLevel = commitment) => {
      const prevEndpoint =
        connectionRef.current && connectionRef.current.rpcEndpoint;

      if (!prevEndpoint || prevEndpoint !== currentCluster.endpoint) {
        const conn = new Connection(currentCluster.endpoint, commit);
        connectionRef.current = conn;

        return connectionRef.current;
      }

      return connectionRef.current;
    },
    [currentCluster, commitment]
  );

  const contextValue = useMemo(
    () => ({
      cluster: currentCluster,
      clusters,
      commitment,
      connection: connectionRef.current,
      createConnection,
      presets,
      setCluster: changeCluster,
    }),
    [
      currentCluster,
      clusters,
      changeCluster,
      commitment,
      createConnection,
      presets,
    ]
  );

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
};

export default () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("Solana connection context required");
  }

  return context;
};
