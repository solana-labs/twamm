import type { PoolTIF } from "../domain/interval.d";
import { SpecialIntervals } from "../domain/interval.d";
import * as R from "./trade-intervals.reducer";

const populateIndexedTIFs = (
  tifs: TIF[],
  left: Array<null | number> = [],
  opts: Array<null | {}> = []
): PoolTIF[] =>
  tifs.map((tif, index) => ({
    tif,
    left: left[index] ?? tif,
    index,
    ...(opts[index] ?? {}),
  }));

describe("trade-intervals reducer 2.0", () => {
  it("should fail on unsupported action", () => {
    expect(R.default).toThrowError(/^Unknown action/);
    // @ts-expect-error
    expect(() => R.default(R.defaultState)).toThrowError(/^Unknown action/);
  });

  it("should `SET_TIFS`", () => {
    expect(
      R.default(
        R.defaultState,
        R.action.setTifs({
          indexedTifs: populateIndexedTIFs([300, 900, 1500]),
          minTimeTillExpiration: undefined,
        })
      )
    ).toStrictEqual({
      data: {
        indexedTifs: [
          { tif: 300, left: 300, index: 0 },
          { tif: 900, left: 900, index: 1 },
          { tif: 1500, left: 1500, index: 2 },
        ],
        minTimeTillExpiration: 0,
        periodSelected: undefined,
        periodTifs: [-2, 300, 900, 1500],
        scheduled: false,
        scheduleSelected: undefined,
        scheduleTifs: [-1, 300, 900, 1500],
        selected: SpecialIntervals.INSTANT,
      },
    });
  });

  it("should `SET_TIFS` and clean up unavailable intervals", () => {
    expect(
      R.default(
        {
          data: {
            indexedTifs: populateIndexedTIFs([300, 900, 1500]),
            minTimeTillExpiration: 0.3,
            periodSelected: { tif: 300, left: 300, index: 0 },
            periodTifs: [-2, 300, 900, 1500],
            scheduled: false,
            scheduleSelected: -1,
            scheduleTifs: [-1, 300, 900, 1500],
            selected: { tif: 300, left: 300, index: 0 },
          },
        },
        R.action.setTifs({
          indexedTifs: populateIndexedTIFs([300, 900, 1500], [59]),
          minTimeTillExpiration: 0.3,
        })
      )
    ).toStrictEqual({
      data: {
        indexedTifs: [
          { tif: 900, left: 900, index: 1 },
          { tif: 1500, left: 1500, index: 2 },
        ],
        minTimeTillExpiration: 0.3,
        periodSelected: undefined,
        periodTifs: [-2, 900, 1500],
        scheduled: false,
        scheduleSelected: undefined,
        scheduleTifs: [-1, 900, 1500],
        selected: undefined,
      },
    });
  });

  it("should `SET_TIFS` and filter out tifs", () => {
    expect(
      R.default(
        R.defaultState,
        R.action.setTifs({
          indexedTifs: populateIndexedTIFs(
            [300, 900, 1500, 1800, 2100, 2400, 2700],
            [null, null, null, 539, null, null, null],
            [
              null,
              null,
              null,
              null,
              { poolStatus: { inactive: {} } },
              { poolStatus: { active: {} } },
              { poolStatus: { expired: {} } },
            ]
          ),
          minTimeTillExpiration: 0.3,
        })
      )
    ).toStrictEqual({
      data: {
        indexedTifs: [
          { tif: 300, left: 300, index: 0 },
          { tif: 900, left: 900, index: 1 },
          { tif: 1500, left: 1500, index: 2 },
          { tif: 2400, left: 2400, index: 5, poolStatus: { active: {} } },
        ],
        minTimeTillExpiration: 0.3,
        periodSelected: undefined,
        periodTifs: [SpecialIntervals.INSTANT, 300, 900, 1500, 2400],
        scheduled: false,
        scheduleSelected: undefined,
        scheduleTifs: [SpecialIntervals.NO_DELAY, 300, 900, 1500, 2400],
        selected: SpecialIntervals.INSTANT,
      },
    });
  });

  it("should `SET_SCHEDULE`", () => {
    const state1 = R.default(
      R.defaultState,
      R.action.setTifs({
        indexedTifs: populateIndexedTIFs([300, 900, 1500], [250, null, null]),
        minTimeTillExpiration: 0,
      })
    );
    expect(
      R.default(
        state1 as R.State,
        R.action.setSchedule({
          tif: 300,
          left: 250,
          index: 0,
        })
      )
    ).toEqual({
      data: {
        indexedTifs: populateIndexedTIFs([300, 900, 1500], [250, null, null]),
        minTimeTillExpiration: 0,
        periodSelected: { tif: 300, left: 250, index: 0 },
        periodTifs: [300],
        scheduled: true,
        scheduleSelected: { tif: 300, left: 250, index: 0 },
        scheduleTifs: [-1, 250, 900, 1500],
        selected: { tif: 300, left: 250, index: 0 },
      },
    });
  });

  it("should `SET_PERIOD`", () => {
    const state = R.default(
      R.defaultState,
      R.action.setTifs({
        indexedTifs: populateIndexedTIFs([300, 900, 1500], [250, null, null]),
        minTimeTillExpiration: 0,
      })
    );
    expect(
      R.default(
        state as R.State,
        R.action.setPeriod({ tif: 300, left: 250, index: 0 })
      )
    ).toEqual({
      data: {
        indexedTifs: populateIndexedTIFs([300, 900, 1500], [250, null, null]),
        minTimeTillExpiration: 0,
        periodSelected: { tif: 300, left: 250, index: 0 },
        periodTifs: [-2, 250, 900, 1500],
        scheduled: false,
        scheduleSelected: -1,
        scheduleTifs: [-1, 250, 900, 1500],
        selected: { tif: 300, left: 250, index: 0 },
      },
    });
  });
});
