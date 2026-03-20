import test from "node:test";
import assert from "node:assert/strict";

import { InboundDedupeStore } from "../src/dedupe-store.ts";

test("InboundDedupeStore accepts first msgId and rejects duplicate within ttl", () => {
  const store = new InboundDedupeStore({ now: () => 0, ttlMs: 600_000 });

  assert.equal(store.markSeen("bot1", "msg-1"), true);
  assert.equal(store.markSeen("bot1", "msg-1"), false);
});

test("InboundDedupeStore allows same msgId for different accounts", () => {
  const store = new InboundDedupeStore({ now: () => 0, ttlMs: 600_000 });

  assert.equal(store.markSeen("bot1", "msg-1"), true);
  assert.equal(store.markSeen("bot2", "msg-1"), true);
});

test("InboundDedupeStore expires entries after ttl", () => {
  let now = 0;
  const store = new InboundDedupeStore({ now: () => now, ttlMs: 100 });

  assert.equal(store.markSeen("bot1", "msg-1"), true);
  now = 101;
  assert.equal(store.markSeen("bot1", "msg-1"), true);
});

test("InboundDedupeStore does not dedupe empty msgId", () => {
  const store = new InboundDedupeStore({ now: () => 0, ttlMs: 600_000 });

  assert.equal(store.markSeen("bot1", ""), true);
  assert.equal(store.markSeen("bot1", ""), true);
});
