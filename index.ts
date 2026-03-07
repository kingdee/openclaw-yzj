import type { OpenclawPluginApi } from "./src/compat.js";
import { emptyPluginConfigSchema } from "./src/compat.js";

import { handleYZJWebhookRequest } from "./src/monitor.js";
import { setYZJRuntime } from "./src/runtime.js";
import { yzjPlugin } from "./src/channel.js";

const plugin = {
  id: "yzj",
  name: "YZJ",
  description: "OpenClaw YZJ (Yunzhijia) intelligent bot channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenclawPluginApi) {
    setYZJRuntime(api.runtime);
    api.registerChannel({ plugin: yzjPlugin });
    api.registerHttpRoute({
      path: "/yzj",
      handler: handleYZJWebhookRequest,
      auth: "plugin",
      match: "prefix",
    });
  },
};

export default plugin;
