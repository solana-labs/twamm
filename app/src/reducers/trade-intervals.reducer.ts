import type {
  IndexedTIF,
  PoolTIF,
  IntervalVariant,
} from "../domain/interval.d";
import { SpecialIntervals } from "../domain/interval.d";

// FEAT: resolve union type issue
function byActivePool(poolTif: PoolTIF) {
  // @ts-expect-error
  const isIndexedTIF = typeof poolTif.poolStatus === "undefined";
  // @ts-expect-error
  const isActivePool = poolTif.poolStatus && poolTif.poolStatus.active;

  return isIndexedTIF || isActivePool;
}

function byExpirationTime(poolTif: PoolTIF, quota: number = 0) {
  if (poolTif.tif === poolTif.left) return true;
  // skip filtering as this interval does not have underlying pool

  const threshold = quota * poolTif.tif;

  return poolTif.left >= threshold;
}

const populateAvailableRecords = (
  list: IndexedTIF[],
  minTimeTillExpiration: number
) =>
  list
    .filter(byActivePool)
    .filter((t) => byExpirationTime(t, minTimeTillExpiration));

const populateIntervals = (list: IndexedTIF[]) => ({
  left: list.map((i) => i.left),
  tifs: list.map((i) => i.tif),
});

interface Data {
  indexedTifs: IndexedTIF[];
  minTimeTillExpiration: number;
  periodSelected: IntervalVariant | undefined;
  periodTifs: TIF[];
  scheduled: boolean;
  scheduleSelected: IntervalVariant | undefined;
  scheduleTifs: TIF[];
  selected: IntervalVariant | undefined;
}

export interface State<D = undefined> {
  data: D;
}

enum ActionTypes {
  SET_TIF = "SET_TIF",
  SET_TIFS = "SET_TIFS",
  SET_SCHEDULE = "SET_SCHEDULE",
  SET_PERIOD = "SET_PERIOD",
}

export const defaultState: State = {
  data: undefined,
};

const setTif = (payload: { value: number | IndexedTIF }) => ({
  type: ActionTypes.SET_TIF,
  payload,
});

const setTifs = (payload: {
  indexedTifs: PoolTIF[];
  minTimeTillExpiration: number | undefined;
}) => ({
  type: ActionTypes.SET_TIFS,
  payload,
});

const setSchedule = (payload: IndexedTIF) => ({
  type: ActionTypes.SET_SCHEDULE,
  payload,
});

const setPeriod = (payload: IndexedTIF) => ({
  type: ActionTypes.SET_PERIOD,
  payload,
});

type Action =
  | ReturnType<typeof setTif>
  | ReturnType<typeof setTifs>
  | ReturnType<typeof setSchedule>
  | ReturnType<typeof setPeriod>;

export const action = { setTif, setTifs, setSchedule, setPeriod };

export default (
  state: State | State<Data>,
  act: Action
): State | State<Data> => {
  switch (act?.type) {
    case ActionTypes.SET_TIFS: {
      const { indexedTifs, minTimeTillExpiration = 0 } =
        act.payload as ActionPayload<typeof setTifs>;

      const {
        periodSelected,
        scheduleSelected,
        selected = SpecialIntervals.INSTANT,
        scheduled = false,
      } = state.data ?? {};

      const available = populateAvailableRecords(
        indexedTifs,
        minTimeTillExpiration
      );

      const { left: tifsLeft } = populateIntervals(available);

      let isSelectedGone = false;
      if (selected && typeof selected === "number") {
        isSelectedGone = false;
      } else if (selected) {
        isSelectedGone = !available.find((i) => i.tif === selected.tif);
      }

      const nextPeriodSelected = !isSelectedGone ? periodSelected : undefined;
      const nextScheduleSelected = !isSelectedGone
        ? scheduleSelected
        : undefined;

      const periodTifs = scheduled
        ? [(selected as IndexedTIF).tif]
        : [SpecialIntervals.INSTANT].concat(tifsLeft);

      const scheduleTifs = [SpecialIntervals.NO_DELAY].concat(tifsLeft);

      const next = {
        indexedTifs: available,
        minTimeTillExpiration,
        periodSelected: nextPeriodSelected,
        periodTifs,
        scheduled,
        scheduleSelected: nextScheduleSelected,
        scheduleTifs,
        selected: isSelectedGone ? undefined : selected,
      };

      return { data: next };
    }
    case ActionTypes.SET_SCHEDULE: {
      if (!state.data) return state;
      if (!act.payload) return state; // rework

      const { indexedTifs = [] } = state.data;

      const { tif, left, index } = act.payload as ActionPayload<
        typeof setSchedule
      >;
      const selected = { tif, left, index };

      const tifsLeft2 = indexedTifs.map((i) => i.left);
      const periodTifs2 = [selected.tif];

      const next = {
        ...state.data,
        selected,
        scheduleSelected: selected,
        periodSelected: selected,
        periodTifs: periodTifs2,
        scheduleTifs: [SpecialIntervals.NO_DELAY].concat(tifsLeft2),
        scheduled: true,
      };

      return { data: next };
    }
    case ActionTypes.SET_PERIOD: {
      if (!state.data) return state;
      if (!act.payload) return state; // rework

      const { tif, left, index } = act.payload as ActionPayload<
        typeof setPeriod
      >;

      const selected = { tif, left, index };

      const tifsLeft = state.data.indexedTifs.map((i) => i.left);
      const periodTifs = [SpecialIntervals.INSTANT].concat(tifsLeft);
      const scheduleTifs = [SpecialIntervals.NO_DELAY].concat(tifsLeft);

      const next = {
        ...state.data,
        selected,
        scheduleSelected: SpecialIntervals.NO_DELAY,
        periodSelected: selected,
        periodTifs,
        scheduleTifs,
        scheduled: state.data.scheduled,
      };

      return { data: next };
    }
    case ActionTypes.SET_TIF: {
      if (!state.data) return state;

      const { indexedTifs, minTimeTillExpiration, selected } = state.data;
      const { value } = act.payload as ActionPayload<typeof setTif>;

      const isInstantSelected = selected === SpecialIntervals.INSTANT;
      if (value === 0 && !isInstantSelected) {
        const next = {
          ...state.data,
          selected: SpecialIntervals.NO_DELAY,
          scheduled: false,
        };

        return { data: next };
      }

      const available = populateAvailableRecords(
        indexedTifs,
        minTimeTillExpiration
      );
      const { left } = populateIntervals(available);

      const periodTifs = [SpecialIntervals.INSTANT].concat(left);
      const scheduleTifs = [SpecialIntervals.NO_DELAY].concat(left);

      let next = state.data;
      if (value === SpecialIntervals.NO_DELAY) {
        next = {
          ...state.data,
          selected: SpecialIntervals.NO_DELAY,
          scheduled: false,
          periodTifs,
          scheduleTifs,
        };
      } else if (value === SpecialIntervals.INSTANT) {
        next = {
          ...state.data,
          selected: SpecialIntervals.INSTANT,
          scheduled: false,
        };
      }

      return { data: next };
    }
    default:
      throw new Error(`Unknown action: ${act?.type}`);
  }
};
