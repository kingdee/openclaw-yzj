import test from "node:test";
import assert from "node:assert/strict";

import { normalizeYZJWebhookPath } from "../src/onboarding-helpers.ts";

test("normalizeYZJWebhookPath keeps leading slash and trims whitespace", () => {
  assert.equal(normalizeYZJWebhookPath(" /yzj/custom/ "), "/yzj/custom");
});

test("normalizeYZJWebhookPath adds a leading slash when missing", () => {
  assert.equal(normalizeYZJWebhookPath("yzj/webhook"), "/yzj/webhook");
});
