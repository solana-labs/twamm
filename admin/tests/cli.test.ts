import { spawnSync } from "node:child_process";
import test from "ava";

test("should parse argv", (t) => {
  const cmd = spawnSync("./cli", ["--version"]);

  t.is(cmd.stdout.toString().trim(), "0.1.0");
});

test("should require -k option", (t) => {
  const cmd = spawnSync("./cli", ["init"]);

  t.is(
    cmd.stderr.toString().trim(),
    "error: required option '-k, --keypair <path>' not specified"
  );
});
