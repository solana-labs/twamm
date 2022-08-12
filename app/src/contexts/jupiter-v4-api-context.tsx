import type { FC, ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { Configuration, DefaultApi } from "../api/jupiter-v4";

export type JupiterApiContext = {
  defaultApi: DefaultApi;
};

export const Context = createContext<JupiterApiContext | undefined>(undefined);

export const Provider: FC<{
  children: ReactNode;
  config: { basePath: string };
}> = ({ children, config }) => {
  const [context] = useState<JupiterApiContext>({
    defaultApi: new DefaultApi(new Configuration(config)),
  });

  return <Context.Provider value={context}>{children}</Context.Provider>;
};

export default () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("JupiterApi context is required");
  }
  return context.defaultApi;
};
