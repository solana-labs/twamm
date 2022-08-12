import { useReducer } from "react";
import * as R from "../reducers/trade-intervals.reducer";

export default (initialData = undefined) => {
  const initialState = {
    data: initialData,
  };

  return useReducer(R.default, initialState);
};

export const { action } = R;
