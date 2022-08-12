/// <reference types="@twamm/types" />
export declare type IndexedTIF = {
  index: TIFIndex;
  left: number;
  tif: TIF;
};

export declare type PoolTIF =
  | IndexedTIF
  | {
      index: TIFIndex;
      left: number;
      poolStatus: PoolStatusStruct | undefined;
      tif: TIF;
    };

export enum SpecialIntervals {
  NO_DELAY = -1,
  INSTANT = -2,
}

export type IntervalVariant =
  | IndexedTIF
  | SpecialIntervals.NO_DELAY
  | SpecialIntervals.INSTANT;
