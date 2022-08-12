import type { GridCellParams } from "@mui/x-data-grid-pro";
import M from "easy-maybe/lib";

export interface Params extends GridCellParams<number> {}

export default ({ value }: Pick<Params, "value">) => {
  const data = M.of(value);
  const orderDate = M.andMap(
    (time) => (time ? new Date(time * 1e3) : undefined),
    data
  );
  const orderTime = M.withDefault(undefined, orderDate);

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{orderTime ? orderTime.toLocaleString() : "-"}</>;
};
