import type { Cache } from "swr";

export function localStorageProvider(storage: Cache) {
  if (!globalThis.localStorage) return storage ?? new Map([]);

  const map = new Map<any, any>(
    JSON.parse(globalThis.localStorage?.getItem("app-cache") || "[]")
  );

  globalThis?.addEventListener("beforeunload", () => {
    const appCache = JSON.stringify(Array.from(map.entries()));
    globalThis.localStorage.setItem("app-cache", appCache);
  });

  return map;
}
