import type { PublicKey } from "@solana/web3.js";
import { flatten, splitEvery } from "ramda";
import type { AccountClient } from "@project-serum/anchor";

const MAX_MULTIPLE = 5;

export const fetchMultipleAddresses = async <T = Object>(
  fetchMultiple: AccountClient["fetchMultiple"],
  addresses: PublicKey[],
  max?: number
) => {
  type TNullable = T | null;

  const maxMultiple = max || MAX_MULTIPLE;

  const addrStrings = addresses.map((a) => a.toBase58());
  const uniqAddresses = Array.from(new Set(addrStrings));
  const addrGroups = splitEvery(maxMultiple, uniqAddresses);

  const results: Array<TNullable>[] = [];
  // respect possible nullable

  for (let i = 0; i <= addrGroups.length - 1; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const eachResult: unknown = await fetchMultiple(addrGroups[i]);

    results.push(eachResult as Array<TNullable>);
  }

  const data: unknown = flatten(results);
  const list = data as TNullable[];

  if (addresses.length === uniqAddresses.length) {
    return list;
  }

  const resultMap = new Map<string, TNullable>();
  list.forEach((res, index) => {
    resultMap.set(uniqAddresses[index], res);
  });

  const all = addrStrings.map(
    (address) =>
      resultMap.get(address) as NonNullable<ReturnType<typeof resultMap["get"]>>
  );

  return all;
};
