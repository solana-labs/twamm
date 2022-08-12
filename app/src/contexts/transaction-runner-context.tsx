import type { FC, ReactNode } from "react";
import type { AnchorProvider } from "@project-serum/anchor";
import { forit } from "a-wait-forit/lib-ts";
import { isNil } from "ramda";
import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useState,
} from "react";
import i18n from "../i18n";
import storage, { sanidateString, sanidateURL } from "../utils/config-storage";

const EXPLORERS = {
  explorer: { uri: "https://explorer.solana.com/tx", label: "Explorer" },
  solscan: { uri: "https://solscan.io/tx", label: "Solscan" },
  solanafm: { uri: "https://solana.fm/tx", label: "SolanaFM" },
}; // explorer is default
const FALLBACK_EXPLORER = EXPLORERS.explorer.uri;

const SLIPPAGES = [0, 0.1, 0.5, 1, 2]; // %, 0.5 is default
const FALLBACK_SLIPPAGE = SLIPPAGES[2];

const FALLBACK_VERSIONED_API = 0; // disabled by default

const PERFORMANCE_FEES = [0, 5e-6, 5e-4]; // SOL, 0 is default
const FALLBACK_PERFORMANCE_FEE = PERFORMANCE_FEES[0];

export type TransactionRunnerContext = {
  readonly active: boolean;
  readonly commit: (arg0: Promise<{}>) => Promise<string | Error | undefined>;
  readonly error?: Error;
  readonly explorer: string;
  readonly explorers: typeof EXPLORERS;
  readonly info?: string;
  readonly performanceFees: typeof PERFORMANCE_FEES;
  readonly performanceFee: number;
  readonly provider?: AnchorProvider;
  readonly setExplorer: (e: string) => void;
  readonly setInfo: (i: string) => void;
  readonly setPerformanceFee: (f: number) => void;
  readonly setProvider: (p: AnchorProvider) => void;
  readonly setSlippage: (s: number) => void;
  readonly setVersionedAPI: (s: boolean) => void;
  readonly signature?: string;
  readonly slippage: number;
  readonly slippages: typeof SLIPPAGES;
  readonly versionedAPI: boolean;
  readonly viewExplorer: (sig: string) => string;
};

const slippageStorage = storage({
  key: "twammSlippage",
  enabled: "twammEnableSlippage",
  sanidate: sanidateString,
});

const explorerStorage = storage({
  key: "twammExplorer",
  enabled: "twammEnableExplorer",
  sanidate: sanidateURL,
});

const versionedAPIStorage = storage({
  key: "twammVersionedTx",
  enabled: "twammEnableVersionedTx",
  sanidate: sanidateString,
});

const performanceFeeStorage = storage({
  key: "twammPerformanceFee",
  enabled: "twammEnablePerformaceFee",
  sanidate: sanidateString,
});

export const Context = createContext<TransactionRunnerContext | undefined>(
  undefined
);

export const Provider: FC<{ children: ReactNode }> = ({ children }) => {
  const storedSlippage = Number(slippageStorage.get());
  const storedExplorer = String(explorerStorage.get());
  const storedVersionedAPI = versionedAPIStorage.get();
  const storedPerformaceFee = performanceFeeStorage.get();

  const hasSlippage = useMemo(
    () =>
      Boolean(
        slippageStorage.enabled() &&
          !isNil(storedSlippage) &&
          !Number.isNaN(storedSlippage)
      ),
    [storedSlippage]
  );
  const hasExplorer = useMemo(
    () => Boolean(explorerStorage.enabled() && storedExplorer),
    [storedExplorer]
  );
  const hasVersionedAPI = useMemo(
    () => versionedAPIStorage.enabled() && !isNil(storedVersionedAPI),
    [storedVersionedAPI]
  );

  const hasPerformaceFee = useMemo(
    () => performanceFeeStorage.enabled() && !isNil(storedPerformaceFee),
    [storedPerformaceFee]
  );

  const initialSlippage = hasSlippage ? storedSlippage : FALLBACK_SLIPPAGE;
  const initialExplorer = hasExplorer ? storedExplorer : FALLBACK_EXPLORER;
  const initialVersionedAPIOption = hasVersionedAPI
    ? Number(storedVersionedAPI)
    : FALLBACK_VERSIONED_API;
  const initialPerformanceFee = hasPerformaceFee
    ? Number(storedPerformaceFee)
    : FALLBACK_PERFORMANCE_FEE;

  const [active, setActive] = useState<boolean>(false);
  const [error, setError] = useState<Error>();
  const [explorer, setExplorer] = useState<string>(initialExplorer);
  const [explorers] = useState(EXPLORERS);
  const [info, setInfo] = useState<string>();
  const [performanceFees] = useState(PERFORMANCE_FEES);
  const [performanceFee, setPerformanceFee] = useState<number>(
    initialPerformanceFee
  );
  const [provider, setProvider] = useState<AnchorProvider>();
  const [signature, setSignature] = useState<string>();
  const [slippage, setSlippage] = useState<number>(initialSlippage);
  const [versionedAPI, setVersionedAPI] = useState(
    Boolean(initialVersionedAPIOption)
  );

  const commit = useCallback(
    async (operation: Parameters<TransactionRunnerContext["commit"]>[0]) => {
      setSignature(undefined);
      setError(undefined);

      if (!active) setActive(true);

      const [err, signatures] = await forit(operation);

      if (signatures) {
        setActive(false);
        setSignature(signatures);

        return signatures;
      }

      if (err) {
        setActive(false);
        const clientError =
          err instanceof Error ? err : new Error(i18n.TxRunnerRequestFailure);
        setError(clientError);

        return clientError;
      }

      return undefined;
    },
    [active, setActive]
  );

  const changeSlippage = useCallback(
    (value: number) => {
      const isError = slippageStorage.set(String(value));
      const hasError = isError instanceof Error;

      if (!hasError) {
        setSlippage(value);
      }

      return undefined;
    },
    [setSlippage]
  );

  const changeExplorer = useCallback(
    (value: string) => {
      const isError = explorerStorage.set(value);
      const hasError = isError instanceof Error;

      if (!hasError) {
        setExplorer(value);
      }

      return undefined;
    },
    [setExplorer]
  );

  const changePerformaceFee = useCallback(
    (value: number) => {
      const isError = performanceFeeStorage.set(String(value));
      const hasError = isError instanceof Error;

      if (!hasError) setPerformanceFee(value);

      return undefined;
    },
    [setPerformanceFee]
  );

  const changeVersionedAPI = useCallback(
    (value: boolean) => {
      const val = value ? "1" : "0";
      const isError = versionedAPIStorage.set(val);
      const hasError = isError instanceof Error;

      if (!hasError) {
        setVersionedAPI(value);
      }

      return undefined;
    },
    [setVersionedAPI]
  );

  const viewExplorer = useCallback(
    (sig: string) => new URL(`${explorer}/${sig}`).href,
    [explorer]
  );

  const contextValue = useMemo(
    () => ({
      active,
      commit,
      error,
      explorer,
      explorers,
      info,
      performanceFee,
      performanceFees,
      provider,
      setExplorer: changeExplorer,
      setInfo,
      setPerformanceFee: changePerformaceFee,
      setProvider,
      setSlippage: changeSlippage,
      setVersionedAPI: changeVersionedAPI,
      signature,
      slippage,
      slippages: SLIPPAGES,
      versionedAPI,
      viewExplorer,
    }),
    [
      active,
      changeExplorer,
      changePerformaceFee,
      changeSlippage,
      changeVersionedAPI,
      commit,
      error,
      explorer,
      explorers,
      info,
      performanceFee,
      performanceFees,
      provider,
      setInfo,
      setProvider,
      signature,
      slippage,
      versionedAPI,
      viewExplorer,
    ]
  );

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
};

export default () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("Transaction runner context required");
  }

  return context;
};
