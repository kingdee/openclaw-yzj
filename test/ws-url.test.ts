import test from "node:test";
import assert from "node:assert/strict";

import { deriveYZJWebSocketUrl, resolveInboundMode } from "../src/ws-url.ts";

test("deriveYZJWebSocketUrl builds websocket URL from sendMsgUrl", () => {
  assert.equal(
    deriveYZJWebSocketUrl("https://yunzhijia.com/gateway/robot/webhook/send?yzjtype=12&yzjtoken=abc"),
    "wss://yunzhijia.com/xuntong/websocket?yzjtoken=abc",
  );
});

test("deriveYZJWebSocketUrl rejects malformed urls", () => {
  assert.throws(() => deriveYZJWebSocketUrl("not-a-url"), /invalid sendMsgUrl/i);
});

test("deriveYZJWebSocketUrl rejects missing yzjtoken", () => {
  assert.throws(
    () => deriveYZJWebSocketUrl("https://yunzhijia.com/gateway/robot/webhook/send?yzjtype=12"),
    /missing yzjtoken/i,
  );
});

test("resolveInboundMode prefers account config over channel config", () => {
  assert.equal(
    resolveInboundMode({ inboundMode: "websocket" }, { inboundMode: "webhook" }),
    "websocket",
  );
});

test("resolveInboundMode falls back to channel config then webhook default", () => {
  assert.equal(resolveInboundMode({}, { inboundMode: "websocket" }), "websocket");
  assert.equal(resolveInboundMode({}, {}), "webhook");
});
