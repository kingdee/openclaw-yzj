/**
 * Compatibility surface re-exported from the OpenClaw plugin SDK.
 *
 * Use static imports so plugin loading goes through OpenClaw's own resolver
 * instead of Node resolution relative to the installed plugin directory.
 *
 * Use the monolithic `openclaw/plugin-sdk` entry for compatibility with older
 * OpenClaw builds that do not correctly resolve subpath exports such as
 * `openclaw/plugin-sdk/compat`.
 */

export {
  DEFAULT_ACCOUNT_ID,
  normalizeAccountId,
  deleteAccountFromConfigSection,
  formatPairingApproveHint,
  setAccountEnabledInConfigSection,
  emptyPluginConfigSchema,
} from "openclaw/plugin-sdk";

export type {
  ChannelAccountSnapshot,
  ChannelPlugin,
  ChannelConfigSchema,
  ChannelOnboardingAdapter,
  PluginRuntime,
  WizardPrompter,
  OpenClawConfig as OpenclawConfig,
  OpenClawConfig as ClawdbotConfig,
  OpenClawPluginApi,
  OpenClawPluginApi as ClawdbotPluginApi,
} from "openclaw/plugin-sdk";

export type ChannelConfig = any;
export type AgentInterface = any;
export type RuntimeManager = any;
export type AccountConfig = any;
