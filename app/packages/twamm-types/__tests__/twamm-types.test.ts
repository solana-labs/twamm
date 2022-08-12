import { strict as assert } from "assert";
import * as twammTypes from "../lib/index";

assert.deepEqual(Object.keys(twammTypes), ["OrderSide"]);
console.info("@twamm/types tests passed"); // eslint-disable-line no-console
