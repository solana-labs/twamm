import type { BN } from "@project-serum/anchor";
import type { GridCellParams } from "@mui/x-data-grid-pro";
import M from "easy-maybe/lib";

export interface Params extends GridCellParams<BN> {}

export default ({ value }: Pick<Params, "value">) => {
  const data = M.of(value);

  const orderDate = M.andMap((t) => {
    const time = t.toNumber();
    return time ? new Date(time * 1e3) : undefined;
  }, data);
  const orderTime = M.withDefault(undefined, orderDate);

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{orderTime ? orderTime.toLocaleString() : "-"}</>;
};
