import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyWebSocketPayload,
  DEFAULT_WEBSOCKET_HEALTH,
  getReconnectDelayMs,
  shouldReconnectAfterInvalidFrames,
} from "../src/websocket-client-helpers.ts";

test("websocket health settings use fixed heartbeat and stale defaults", () => {
  assert.deepEqual(DEFAULT_WEBSOCKET_HEALTH, { heartbeatMs: 15_000, staleMs: 45_000 });
});

test("reconnect backoff grows and caps at sixty seconds", () => {
  assert.equal(getReconnectDelayMs(0), 1_000);
  assert.equal(getReconnectDelayMs(1), 2_000);
  assert.equal(getReconnectDelayMs(2), 5_000);
  assert.equal(getReconnectDelayMs(3), 10_000);
  assert.equal(getReconnectDelayMs(4), 30_000);
  assert.equal(getReconnectDelayMs(5), 60_000);
  assert.equal(getReconnectDelayMs(8), 60_000);
});

test("invalid non-control websocket frames reconnect after three consecutive failures", () => {
  assert.equal(shouldReconnectAfterInvalidFrames(1), false);
  assert.equal(shouldReconnectAfterInvalidFrames(2), false);
  assert.equal(shouldReconnectAfterInvalidFrames(3), true);
});

test("auth websocket payload is treated as control traffic", () => {
  assert.deepEqual(
    classifyWebSocketPayload({ success: true, cmd: "auth" }),
    { kind: "control", reason: "auth" },
  );
});

test("directPush websocket payload with needAck returns ack command", () => {
  assert.deepEqual(
    classifyWebSocketPayload({
      msg: {
        dataKey: "replyCount",
        data: 1,
        dataEncoding: "int",
        msgChgTime: 1773978437058,
        groupId: "69ac29c1e4b0ad1b3b3b473b",
        msgId: "69bcc338e4b0c9f597559c80",
      },
      level: 1,
      needAck: true,
      cmd: "directPush",
      type: "msgChg",
      seq: 1,
    }),
    { kind: "control", reason: "directPush", ack: "{\"cmd\":\"ack\",\"seq\":1}" },
  );
});

test("message websocket payload without business body is treated as notification", () => {
  assert.deepEqual(
    classifyWebSocketPayload({ cmd: "message", lastUpdateTime: "2026-03-20 11:47:17" }),
    { kind: "control", reason: "message" },
  );
});

test("messageRead websocket payload is treated as notification", () => {
  assert.deepEqual(
    classifyWebSocketPayload({ cmd: "messageRead", lastUpdateTime: "2026-03-20 13:20:38" }),
    { kind: "control", reason: "messageRead" },
  );
});
