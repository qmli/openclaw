import { emptyPluginConfigSchema, type OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import { buildDeepseekProvider } from "../../src/agents/models-config.providers.static.js";

const PROVIDER_ID = "deepseek";

const deepseekPlugin = {
  id: PROVIDER_ID,
  name: "DeepSeek Provider",
  description: "Bundled DeepSeek API provider plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    api.registerProvider({
      id: PROVIDER_ID,
      label: "DeepSeek",
      docsPath: "/providers/deepseek",
      envVars: ["DEEPSEEK_API_KEY"],
      auth: [],
      catalog: {
        order: "simple",
        run: async (ctx) => {
          const apiKey = ctx.resolveProviderApiKey(PROVIDER_ID).apiKey;
          if (!apiKey) {
            return null;
          }
          return {
            provider: {
              ...buildDeepseekProvider(),
              apiKey,
            },
          };
        },
      },
    });
  },
};

export default deepseekPlugin;
