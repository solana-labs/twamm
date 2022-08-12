import type { FC, ReactNode } from "react";
import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useState,
} from "react";
import type { IntervalVariant, IndexedTIF } from "../domain/interval.d";
import useTradeIntervals, { action as A } from "../hooks/use-trade-intervals";
import { SpecialIntervals } from "../domain/interval.d";

type ScheduleTIF = boolean;

export type TIFContext = {
  readonly periodSelected?: IntervalVariant;
  readonly periodTifs?: TIF[];
  readonly scheduled: boolean;
  readonly scheduleSelected?: IntervalVariant;
  readonly scheduleTifs?: TIF[];
  readonly selected?: IntervalVariant;
  readonly setIntervals: (i?: IndexedTIF[]) => void;
  readonly setOptions: (o: { minTimeTillExpiration: number }) => void;
  readonly setTif: (e: IntervalVariant, s: ScheduleTIF) => void;
  readonly tifs?: IndexedTIF[];
};

export const Context = createContext<TIFContext | undefined>(undefined);

export const Provider: FC<{ children: ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<{ minTimeTillExpiration: number }>({
    minTimeTillExpiration: 0,
  });

  const [state, dispatch] = useTradeIntervals();

  const changeOptions = useCallback(
    (opts: { minTimeTillExpiration: number }) => {
      setOptions(opts);
    },
    []
  );

  const changeTif = useCallback(
    (execute: IntervalVariant, schedule: ScheduleTIF) => {
      switch (execute) {
        case 0: {
          dispatch(A.setTif({ value: 0 }));
          break;
        }

        case SpecialIntervals.NO_DELAY:
        case SpecialIntervals.INSTANT:
          dispatch(A.setTif({ value: execute }));
          break;

        default: {
          if (schedule) {
            dispatch(A.setSchedule(execute));
          } else {
            dispatch(A.setPeriod(execute));
          }
        }
      }
    },
    [dispatch]
  );

  const changeIntervals = useCallback(
    (indexedTifs: IndexedTIF[] | undefined) => {
      // FEAT: consider using comparing method to reduce the number of updates;
      if (indexedTifs) {
        dispatch(
          A.setTifs({
            indexedTifs,
            minTimeTillExpiration: options.minTimeTillExpiration,
          })
        );
      }
    },
    [dispatch, options]
  );

  const contextValue = useMemo(
    () => ({
      periodSelected: state.data?.periodSelected,
      periodTifs: state.data?.periodTifs,
      scheduled: Boolean(state.data?.scheduled),
      scheduleSelected: state.data?.scheduleSelected,
      scheduleTifs: state.data?.scheduleTifs,
      selected: state.data?.selected,
      setIntervals: changeIntervals,
      setOptions: changeOptions,
      setTif: changeTif,
      tifs: state.data?.indexedTifs,
    }),
    [changeIntervals, changeOptions, changeTif, state]
  );

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
};

export default () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("Tif context required");
  }

  return context;
};

export const selectors = (data?: { selected: IntervalVariant }) => ({
  get isInstantOrder() {
    return (
      Boolean(data?.selected) && data?.selected === SpecialIntervals.INSTANT
    );
  },
  get isProgramOrder() {
    return (
      Boolean(data?.selected) && data?.selected !== SpecialIntervals.NO_DELAY
    );
  },
});
