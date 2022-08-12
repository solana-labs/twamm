import type { Revalidator, RevalidatorOptions, SWRConfiguration } from "swr";

import { localStorageProvider as provider } from "./swr-cache";

export const retryFor = (interval = 10000, retryAttempts = 5) => ({
  onErrorRetry: (
    resp: Error,
    key: string,
    configuration: SWRConfiguration,
    revalidate: Revalidator,
    revalidatorOpts: Required<RevalidatorOptions>
  ) => {
    const { refreshInterval } = configuration;
    const { retryCount } = revalidatorOpts;

    // FEAT: cover 404 codes from jsonrpc
    if (retryCount > retryAttempts) return;

    const retryIn =
      typeof refreshInterval === "number" ? refreshInterval : interval;

    setTimeout(revalidate, retryIn, { retryCount });
  },
});

export const dedupeEach = (dedupingInterval = 2000) => ({ dedupingInterval });

export const revalOnFocus = (revalidateOnFocus = false) => ({
  revalidateOnFocus,
});

export const keepPrevious = () => ({ keepPreviousData: true });

export const refreshEach = (refreshInterval = 10000) => ({ refreshInterval });

export const add = (options: Array<{}>) =>
  options.reduce((opt, acc) => ({ ...acc, ...opt }), {});

interface ConfigurationWithProvider extends SWRConfiguration {
  provider?: typeof provider;
}

export default (config?: SWRConfiguration): ConfigurationWithProvider => ({
  ...(config || {}),
  ...dedupeEach(10e3),
  ...revalOnFocus(),
  ...retryFor(),
  // provider,
});
