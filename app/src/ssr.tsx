import type { ReactElement } from "react";

const isServer = () => typeof window === "undefined";

const BrowserOnly = ({ children }: { children: ReactElement }) =>
  isServer() ? null : children;

export default BrowserOnly;
