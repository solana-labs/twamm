import type { ClusterInfo } from "./cluster.d";

type PredicateFn = (item: ClusterInfo) => boolean;

const CUSTOM_MONIKER = "custom";

const findByEndpoint = (endpoint: string, c: ClusterInfo) =>
  c.endpoint === endpoint;

export default function ClusterUtils(fallback: ClusterInfo) {
  const self = {
    findBy: (
      valueOrPredicate: string | PredicateFn | undefined,
      clusters: ClusterInfo[],
      defaultValue = fallback
    ) => {
      if (!valueOrPredicate) return defaultValue;

      const predicate =
        typeof valueOrPredicate === "function"
          ? valueOrPredicate
          : (c: ClusterInfo) => findByEndpoint(valueOrPredicate, c);

      return (clusters.find((c) => predicate(c)) ??
        defaultValue) as ClusterInfo;
    },
    findByMoniker: (moniker: string | undefined, clusters: ClusterInfo[]) => {
      const monikerPredicate = (c: ClusterInfo) => c.moniker === moniker;

      return self.findBy(monikerPredicate, clusters);
    },
    isCustomMoniker: (moniker: string) => moniker === CUSTOM_MONIKER,
  };

  return self;
}
