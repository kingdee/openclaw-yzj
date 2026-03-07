/**
 * Compatibility layer for openclaw/clawdbot dual support.
 * Try to import from openclaw first, fall back to clawdbot.
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let sdk: any;

try {
  sdk = require("openclaw/plugin-sdk");
} catch {
  try {
    sdk = require("clawdbot/plugin-sdk");
  } catch {
    throw new Error("Neither openclaw/plugin-sdk nor clawdbot/plugin-sdk found");
  }
}

export const DEFAULT_ACCOUNT_ID = sdk.DEFAULT_ACCOUNT_ID;
export const normalizeAccountId = sdk.normalizeAccountId;
export const deleteAccountFromConfigSection = sdk.deleteAccountFromConfigSection;
export const formatPairingApproveHint = sdk.formatPairingApproveHint;
export const setAccountEnabledInConfigSection = sdk.setAccountEnabledInConfigSection;
export const emptyPluginConfigSchema = sdk.emptyPluginConfigSchema;

// Re-export types
export type ChannelAccountSnapshot = any;
export type ChannelPlugin<T = any> = any;
export type ChannelConfigSchema = any;
export type ChannelOnboardingAdapter = any;
export type ChannelConfig = any;
export type AgentInterface = any;
export type RuntimeManager = any;
export type AccountConfig = any;
export type PluginRuntime = any;
export type WizardPrompter = any;
export type OpenclawConfig = any;
export type ClawdbotConfig = any;
export type OpenclawPluginApi = any;
export type ClawdbotPluginApi = any;
