import { useContext } from "react";

import { ApiContext } from "../contexts/coingecko-api-context";

// FEAT: replace coingecko with jupiter
export default () => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error("Coingecko context is required");
  }
  return context.contractApi;
};
