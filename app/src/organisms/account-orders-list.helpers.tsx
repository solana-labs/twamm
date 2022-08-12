import type { PublicKey } from "@solana/web3.js";
import { filledQuantity, quantity } from "@twamm/client.js/lib/protocol";

import type { OrderData } from "../types/decl.d";
import type {
  ComparatorFn,
  RowParams,
  ValueGetterParams,
} from "./row-column-list";
import i18n from "../i18n";
import PoolOrderTimeCell from "../atoms/account-order-pool-order-time-cell";
import PoolTIFCell from "../atoms/account-order-pool-tif-cell";
import PoolTIFLeftCell from "../atoms/account-order-pool-tif-left-cell";
import TokenPairCell from "../atoms/account-order-token-pair-cell";
import { formatPrice } from "../domain/index";

const sortByTokenPair: ComparatorFn<PublicKey> = (a, b) => {
  const aKey = String(a);
  const bKey = String(b);

  if (aKey === bKey) return 0;
  return aKey < bKey ? -1 : 1;
};

export const populateRow = (data: OrderData) => {
  const order = {
    address: data.order,
    lpBalance: data.lpBalance,
    side: data.side,
    tokenDebt: data.tokenDebt,
  };

  const amount = quantity(data.tokenPairData, data);

  const filledAmount = filledQuantity(data.tokenPairData, data.poolData, data);

  return {
    id: data.id,
    filledQuantity: filledAmount,
    order,
    orderData: order,
    orderTime: data.time,
    pool: data.pool,
    poolData: data.poolData,
    quantity: amount,
    side: data.side,
    supply: data.lpBalance,
    tif: data.poolData.timeInForce,
    tokenPair: data.poolData.tokenPair,
  };
};

export const populateDetails = (
  data: RowParams<ReturnType<typeof populateRow>>
) => ({
  filledQuantity: data.row.filledQuantity,
  order: data.row.order, // Data,
  poolAddress: data.row.pool,
  quantity: data.row.quantity,
  side: data.row.side,
  supply: data.row.supply,
  timeInForce: data.row.tif,
});

export const columns = ({ isMobile }: { isMobile?: boolean }) => [
  {
    field: "pre",
    hideable: false,
    sortable: false,
    xs: 1,
    md: 1,
  },
  {
    field: "tokenPair",
    headerName: i18n.OrdersColumnsPair,
    hideable: false,
    renderCell: TokenPairCell,
    sortable: false,
    sortComparator: sortByTokenPair,
    xs: isMobile ? 5 : 3,
    md: isMobile ? 6 : 2,
  },
  {
    field: "tif",
    headerName: i18n.OrdersColumnsTimeFrame,
    hideable: true,
    renderCell: PoolTIFCell,
    resizable: false,
    sortable: true,
    xs: 1,
    md: 2,
  },
  {
    field: "quantity",
    headerName: i18n.OrdersColumnsQunatity,
    hideable: false,
    sortable: true,
    xs: isMobile ? 3 : 2,
    md: isMobile ? 3 : 2,
    valueGetter: ({ row }: ValueGetterParams) =>
      formatPrice(row.quantity, false),
  },
  {
    field: "filledQuantity",
    headerName: i18n.OrdersColumnsFilledQuantity,
    hideable: false,
    sortable: true,
    xs: isMobile ? 3 : 2,
    md: isMobile ? 3 : 2,
    valueGetter: ({ row }: ValueGetterParams) =>
      formatPrice(row.filledQuantity, false),
  },
  {
    field: "orderTime",
    headerName: i18n.OrdersColumnsOrderTime,
    hideable: true,
    renderCell: PoolOrderTimeCell,
    resizable: false,
    sortable: true,
    xs: 2,
    md: 2,
  },
  {
    field: "timeLeft",
    headerName: i18n.OrdersColumnsExpiration,
    hideable: true,
    renderCell: PoolTIFLeftCell,
    resizable: false,
    sortable: false,
    xs: 1,
    md: 1,
  },
];
