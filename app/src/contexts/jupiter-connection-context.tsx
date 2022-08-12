import M, { Extra } from "easy-maybe/lib";
import type { Cluster } from "@solana/web3.js";
import type { ComponentClass, FC, ReactNode } from "react";
import type { TokenInfo } from "@solana/spl-token-registry";
import { Configuration, DefaultApi } from "@jup-ag/api";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { TokenListProvider } from "@solana/spl-token-registry";
import { chainId } from "./solana-connection-context";
import { JUPITER_CONFIG_URI } from "../env";

type RouteMap = Map<string, string[]>;

type TokenMap = Map<string, TokenInfo>;

export type JupiterConnectionContext = {
  readonly api: DefaultApi;
  readonly moniker: Cluster;
  readonly ready: boolean;
  readonly routeMap: RouteMap;
  readonly tokenMap: TokenMap;
};

export const Context = createContext<JupiterConnectionContext | undefined>(
  undefined
);

export const Provider: FC<{ children: ReactNode }> = ({ children }) => {
  const api = useMemo(
    () => new DefaultApi(new Configuration({ basePath: JUPITER_CONFIG_URI })),
    []
  );

  const moniker: Cluster = "mainnet-beta";
  const [ready, setReady] = useState(false);
  const [routeMap, setRouteMap] = useState<RouteMap>(new Map());
  const [tokenMap, setTokenMap] = useState<TokenMap>(new Map());

  useEffect(() => {
    (async () => {
      const [tokenList, indexedRouteMapResult] = await Promise.all([
        new TokenListProvider().resolve(),
        api.v3IndexedRouteMapGet(),
      ]);

      const { mintKeys, indexedRouteMap } = indexedRouteMapResult;

      const routes = M.andMap(
        ([rmap, mints]) =>
          Object.keys(rmap).reduce((map, key) => {
            map.set(
              mints[Number(key)],
              rmap[key].map((i) => mints[i])
            );
            return map;
          }, new Map() as RouteMap),
        Extra.combine2([M.of(indexedRouteMap), M.of(mintKeys)])
      );

      const tokens = M.andMap((t) => {
        const list = t.filterByChainId(chainId).getList();
        return list.reduce((map, item) => {
          map.set(item.address, item);
          return map;
        }, new Map() as TokenMap);
      }, M.of(tokenList));

      M.andMap(([rmap, tmap]) => {
        setRouteMap(rmap);
        setTokenMap(tmap);
        setReady(true);
      }, Extra.combine2([routes, tokens]));
    })();
  }, [api]);

  const contextValue = useMemo(
    () => ({
      api,
      moniker,
      routeMap,
      tokenMap,
      ready,
    }),
    [api, moniker, routeMap, tokenMap, ready]
  );

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
};

export default () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("Jupiter connection context required");
  }

  return context;
};

export function withCtx<P = any>(
  NestedComponent: FC<P> | ComponentClass<P, any>
) {
  return (props: P & JSX.IntrinsicAttributes) => (
    <Provider>
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <NestedComponent {...props} />
    </Provider>
  );
}
