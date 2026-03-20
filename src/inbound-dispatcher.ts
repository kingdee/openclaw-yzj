import type { OpenclawConfig, PluginRuntime } from "./compat.js";

import { getYZJRuntime } from "./runtime.js";
import { InboundDedupeStore } from "./dedupe-store.js";
import type {
  ResolvedYZJAccount,
  YZJIncomingMessage,
  YZJInboundStatusPatch,
  YZJLogger,
} from "./types.js";

export type YZJInboundSource = "webhook" | "websocket";

export type YZJInboundTarget = {
  account: ResolvedYZJAccount;
  config: OpenclawConfig;
  runtime: YZJLogger;
  core?: PluginRuntime;
  statusSink?: (patch: YZJInboundStatusPatch) => void;
};

const dedupeStore = new InboundDedupeStore();

function logInfo(logger: YZJLogger, message: string): void {
  logger.info?.(message);
  if (!logger.info) logger.log?.(message);
}

function resolveCore(target: YZJInboundTarget): PluginRuntime {
  return target.core ?? getYZJRuntime();
}

export function clearInboundState(accountId: string): void {
  dedupeStore.clearAccount(accountId);
}

export async function dispatchInboundMessage(
  target: YZJInboundTarget,
  msg: YZJIncomingMessage,
  source: YZJInboundSource,
): Promise<{ duplicate: boolean }> {
  const accountId = target.account.accountId;
  if (!dedupeStore.markSeen(accountId, msg.msgId)) {
    logInfo(target.runtime, `[${accountId}] yzj duplicate inbound dropped from ${source}: ${msg.msgId}`);
    return { duplicate: true };
  }

  target.statusSink?.({ lastInboundAt: Date.now() });
  await startAgentForInbound(target, msg, source);
  return { duplicate: false };
}

async function sendYZJMessage(
  target: YZJInboundTarget,
  operatorOpenid: string,
  text: string,
  replyData: Record<string, unknown> | undefined,
): Promise<void> {
  const { account } = target;
  const sendMsgUrl = account.sendMsgUrl;

  if (!sendMsgUrl) {
    target.runtime.error?.(`[yzj] sendMsgUrl 未配置，无法发送消息`);
    return;
  }

  try {
    const payload: Record<string, unknown> = {
      msgtype: 2,
      content: text,
      notifyParams: [] as { type: string; values: string[] }[],
    };

    if (operatorOpenid) {
      (payload.notifyParams as { type: string; values: string[] }[]).push({
        type: "openIds",
        values: [operatorOpenid],
      });
    }

    if (replyData) {
      payload.param = replyData;
      payload.paramType = 3;
    }

    const response = await fetch(sendMsgUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      target.runtime.error?.(`[yzj] 发送消息失败：HTTP ${response.status} - ${errorText}`);
    } else {
      logInfo(target.runtime, `[yzj] 消息已发送：${text.slice(0, 50)}${text.length > 50 ? "..." : ""}`);
      target.statusSink?.({ lastOutboundAt: Date.now() });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    target.runtime.error?.(`[yzj] 发送消息时发生错误：${errorMsg}`);
  }
}

async function startAgentForInbound(
  target: YZJInboundTarget,
  msg: YZJIncomingMessage,
  source: YZJInboundSource,
): Promise<void> {
  const { account, config } = target;
  const core = resolveCore(target);

  const operatorOpenid = msg.operatorOpenid?.trim() || "unknown";
  const operatorName = msg.operatorName?.trim() || "未知用户";
  const content = msg.content?.trim() || "";
  const robotId = msg.robotId?.trim() || "unknown";
  const chatId = robotId;
  const msgId = msg.msgId?.trim() || "";

  let replyData = undefined;
  if (msgId.length > 0) {
    replyData = {
      replyMsgId: msgId,
      replyTitle: "",
      isReference: true,
      replySummary: content,
      replyPersonName: operatorName,
    };
  }

  const route = core.channel.routing.resolveAgentRoute({
    cfg: config,
    channel: "yzj",
    accountId: account.accountId,
    peer: { kind: "group", id: chatId },
  });

  logInfo(
    target.runtime,
    `[yzj] starting ${source} agent processing (agentId=${route.agentId}, peerId=${chatId}) operatorOpenid=${operatorOpenid} content="${content.slice(0, 50)}${content.length > 50 ? "..." : ""}"`,
  );

  const storePath = core.channel.session.resolveStorePath(config.session?.store, {
    agentId: route.agentId,
  });

  const envelopeOptions = core.channel.reply.resolveEnvelopeFormatOptions(config);
  const previousTimestamp = core.channel.session.readSessionUpdatedAt({
    storePath,
    sessionKey: route.sessionKey,
  });

  const body = core.channel.reply.formatAgentEnvelope({
    channel: "YZJ",
    from: `user:${operatorOpenid}`,
    previousTimestamp,
    envelope: envelopeOptions,
    body: content,
  });

  const ctxPayload = core.channel.reply.finalizeInboundContext({
    Body: body,
    RawBody: content,
    CommandBody: content,
    From: `yzj:${operatorOpenid}`,
    To: `yzj:${robotId}`,
    SessionKey: route.sessionKey,
    AccountId: route.accountId,
    ChatType: "group",
    ConversationLabel: `user:${operatorOpenid}`,
    SenderName: operatorName,
    SenderId: operatorOpenid,
    Provider: "yzj",
    Surface: "yzj",
    MessageSid: msg.msgId,
    OriginatingChannel: "yzj",
    OriginatingTo: `yzj:${robotId}`,
  });

  await core.channel.session.recordInboundSession({
    storePath,
    sessionKey: ctxPayload.SessionKey ?? route.sessionKey,
    ctx: ctxPayload,
    onRecordError: (err: unknown) => {
      target.runtime.error?.(`[yzj] failed updating session meta: ${String(err)}`);
    },
  });

  const tableMode = core.channel.text.resolveMarkdownTableMode({
    cfg: config,
    channel: "yzj",
    accountId: account.accountId,
  });

  let messageBuffer: string[] = [];
  await core.channel.reply.dispatchReplyWithBufferedBlockDispatcher({
    ctx: ctxPayload,
    cfg: config,
    dispatcherOptions: {
      deliver: (payload: { text?: string }) => {
        const text = core.channel.text.convertMarkdownTables(payload.text ?? "", tableMode);
        if (text) messageBuffer.push(text);
        const length = messageBuffer.reduce((sum, item) => sum + item.length, 0);
        if (length > 20) {
          const fullMessage = messageBuffer.join("");
          messageBuffer = [];
          void sendYZJMessage(target, operatorOpenid, fullMessage, replyData);
        }
      },
      onError: (err: unknown, info: { kind?: string }) => {
        messageBuffer = [];
        const errorMsg = `抱歉,处理您的消息时遇到问题: ${err instanceof Error ? err.message : String(err)}`;
        target.runtime.error?.(`[${account.accountId}] yzj ${info.kind ?? "reply"} reply failed: ${String(err)}`);
        void sendYZJMessage(target, operatorOpenid, errorMsg, replyData);
      },
    },
  });

  if (messageBuffer.length > 0) {
    const fullMessage = messageBuffer.join("");
    await sendYZJMessage(target, operatorOpenid, fullMessage, replyData);
  }
}
