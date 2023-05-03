import { resolve } from "node:path";
import { readFile } from "node:fs";
import { promisify } from "node:util";

const readContent = promisify(readFile);

const readFileContent = async (path: string) => readContent(resolve(path));

export default readFileContent;

export const readJSON = async (path: string) => {
  const content = (await readFileContent(path)).toString();
  return JSON.parse(content);
};
