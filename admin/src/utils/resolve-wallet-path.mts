import { resolve } from "node:path";

export default (path: string) => {
  const fullPath = resolve(path);

  return fullPath;
};
