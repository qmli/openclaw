import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { withEnvAsync } from "../test-utils/env.js";
import { resolveApiKeyForProvider } from "./model-auth.js";
import { resolveImplicitProvidersForTest } from "./models-config.e2e-harness.js";
import { buildDeepseekProvider } from "./models-config.providers.js";

describe("DeepSeek provider", () => {
  it("should include deepseek when DEEPSEEK_API_KEY is configured", async () => {
    const agentDir = mkdtempSync(join(tmpdir(), "openclaw-test-"));
    await withEnvAsync({ DEEPSEEK_API_KEY: "test-key" }, async () => {
      const providers = await resolveImplicitProvidersForTest({ agentDir });
      expect(providers?.deepseek).toBeDefined();
      expect(providers?.deepseek?.models?.length).toBeGreaterThan(0);
    });
  });

  it("resolves the deepseek api key value from env", async () => {
    const agentDir = mkdtempSync(join(tmpdir(), "openclaw-test-"));
    await withEnvAsync({ DEEPSEEK_API_KEY: "deepseek-test-api-key" }, async () => {
      const auth = await resolveApiKeyForProvider({
        provider: "deepseek",
        agentDir,
      });

      expect(auth.apiKey).toBe("deepseek-test-api-key");
      expect(auth.mode).toBe("api-key");
      expect(auth.source).toContain("DEEPSEEK_API_KEY");
    });
  });

  it("should build deepseek provider with official model ids", () => {
    const provider = buildDeepseekProvider();
    expect(provider.baseUrl).toBe("https://api.deepseek.com/v1");
    expect(provider.api).toBe("openai-completions");
    const modelIds = provider.models.map((m) => m.id);
    expect(modelIds).toEqual(["deepseek-chat", "deepseek-reasoner"]);
  });
});
