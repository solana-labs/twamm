import { useReducer } from "react";
import * as R from "../reducers/select-available-tokens.reducer";

export default (initialData = undefined) => {
  const initialState = {
    data: initialData,
  };

  return useReducer(R.default, initialState);
};

export const { action } = R;
