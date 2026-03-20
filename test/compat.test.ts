import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("compat layer uses static openclaw plugin-sdk imports", () => {
  const source = readFileSync(new URL("../src/compat.ts", import.meta.url), "utf8");
  const importLines = source
    .split("\n")
    .filter((line) => line.includes('from "openclaw/plugin-sdk'));

  assert.ok(importLines.length >= 1);
  assert.ok(importLines.every((line) => line.includes('from "openclaw/plugin-sdk"')));
  assert.doesNotMatch(source, /createRequire/);
  assert.doesNotMatch(source, /clawdbot\/plugin-sdk/);
});
