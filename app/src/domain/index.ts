import { OrderSide } from "@twamm/types/lib";

export const populatePairByType = <T = any>(a: T, b: T, type: OrderSide): T[] =>
  type === OrderSide.sell ? [a, b] : [b, a];

export const formatPrice = (a: number, useCurrency = true) => {
  const opts = useCurrency
    ? {
        style: "currency",
        currency: "USD",
      }
    : {};

  return new Intl.NumberFormat("en-US", opts).format(a);
};
