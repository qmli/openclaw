---
summary: "Use the DeepSeek API (OpenAI-compatible) in OpenClaw"
read_when:
  - You want DeepSeek official model IDs (deepseek-chat, deepseek-reasoner)
  - You need DEEPSEEK_API_KEY setup
title: "DeepSeek"
---

# DeepSeek

DeepSeek exposes an OpenAI-compatible API at `https://api.deepseek.com/v1`. Model IDs are defined in the [DeepSeek API docs](https://api-docs.deepseek.com/) (`deepseek-chat` and `deepseek-reasoner`, both DeepSeek-V3.2 with 128K context).

## CLI setup

```bash
export DEEPSEEK_API_KEY="sk-..."
openclaw onboard --auth-choice skip
openclaw models set deepseek/deepseek-chat
```

## Config snippet

```json5
{
  env: { DEEPSEEK_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "deepseek/deepseek-chat" },
    },
  },
}
```

## Model IDs

- `deepseek-chat` — non-thinking mode (default catalog entry: **DeepSeek Chat**)
- `deepseek-reasoner` — thinking mode (**DeepSeek Reasoner**)

## Notes

- Not the same as Hugging Face Inference (`huggingface/deepseek-ai/...`); use `HF_TOKEN` for those models.
- Provider registers when `DEEPSEEK_API_KEY` is set.
