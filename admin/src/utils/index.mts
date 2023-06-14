import * as a from "@project-serum/anchor";
import * as web3 from "@solana/web3.js";
import { Map as IMap, Set as ISet } from "immutable";
import Client from "../client.mts";

export const encode = (label: string) => a.utils.bytes.utf8.encode(label);

export const getTime = () => {
  const now = new Date();
  const utcMilllisecondsSinceEpoch =
    now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  return utcMilllisecondsSinceEpoch / 1000;
};

export const populateSigners = (signers: string[]) =>
  signers.map((signer) => new web3.PublicKey(signer));

export const prettifyJSON = (a: {}) => JSON.stringify(a, null, 2);

export const resolveNegative = (str: string) => {
  let res = str;
  if (str.startsWith('"')) {
    res = str.replaceAll('"', "");
  }
  return res;
};

export const fetchOrderComplData = async (
  client: ReturnType<typeof Client>,
  opts?: { fetchTokenPairs: boolean }
) => {
  let all = await client.program.account.order.all();

  let iOrders = IMap<
    web3.PublicKey,
    {
      owner: web3.PublicKey;
      pool: web3.PublicKey;
      self: { publicKey: web3.PublicKey; account: any };
    }
  >();

  let iOrdersCompl = IMap<
    string,
    {
      owner: web3.PublicKey;
      pool: web3.PublicKey;
      self: { publicKey: web3.PublicKey; account: any };
      tokenPair: web3.PublicKey;
      _pool: any;
      _tokenPair?: any;
    }
  >();

  all.forEach((order: any) => {
    iOrders = iOrders.set(order.publicKey, {
      owner: order.account.owner,
      pool: order.account.pool,
      self: order,
    });
  });

  const ordersPools = iOrders
    .mapEntries(([k, v]) => [k, v.pool])
    .toSet()
    .toArray();

  let allPools = await client.program.account.pool.fetchMultiple(ordersPools);

  // order[] > pool[]

  let iPools = IMap<web3.PublicKey, any>();
  let iTokenPairKeys = ISet<string>();
  allPools.forEach((pool: any, index: number) => {
    iPools = iPools.set(ordersPools[index], pool);
    iTokenPairKeys = iTokenPairKeys.add(pool.tokenPair.toString());
  });

  iOrders.forEach((order) => {
    const targetPool = iPools.find((_val, k) => {
      const match = k.equals(order.pool);
      return match;
    });

    iOrdersCompl = iOrdersCompl.set(order.self.publicKey.toString(), {
      owner: order.owner,
      pool: order.pool,
      self: order.self,
      tokenPair: targetPool.tokenPair,
      _pool: targetPool,
    });
  });

  if (!opts?.fetchTokenPairs) {
    return iOrdersCompl;
  }

  const allTokenPairs = await client.program.account.tokenPair.fetchMultiple(
    iTokenPairKeys.toArray()
  );
  const tokenPairKeys = iTokenPairKeys.toList();

  let iTokenPairs = IMap<string, any>();
  allTokenPairs.forEach((tokenPair: any, i: number) => {
    iTokenPairs = iTokenPairs.set(tokenPairKeys.get(i) as string, tokenPair);
  });

  iOrdersCompl.forEach((order) => {
    const tokenPair = iTokenPairs.get(order.tokenPair.toString());

    iOrdersCompl = iOrdersCompl.update(
      order.self.publicKey.toString(),
      (value) =>
        !value
          ? value
          : {
              ...value,
              _tokenPair: tokenPair,
            }
    );
  });

  return iOrdersCompl;
};
