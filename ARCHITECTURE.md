### OpenClaw 工程架构概览

OpenClaw 是一个 **多通道 AI 网关**，通过插件化方式对接多种聊天渠道（Telegram、Slack、Discord、Signal、WhatsApp、iMessage、Web 等）和模型/工具提供方（OpenAI、Anthropic、Ollama、Bedrock 等），并通过 CLI、Web UI、桌面/移动 App 提供统一控制入口。

核心可以按“纵向分层 + 横向扩展”来理解。

---

### 1. 分层架构

- **入口与接口层**
  - `src/index.ts`：包入口，导出核心库 API，并在作为可执行文件时启动 CLI。
  - `src/cli/*`：命令行工具（`openclaw`），负责：
    - 解析命令与参数（`program/*`）。
    - 注册子命令：消息发送/读取、通道管理、系统与安全命令、技能与密钥管理等。
  - 客户端应用与 UI：
    - `ui/`：基于 Web 的控制台 UI（配置、会话、通道、日志、使用情况等）。
    - `apps/ios`, `apps/android`, `apps/macos`, `apps/shared`：原生 App，封装 UI 与系统集成，通过 Gateway 协议与核心通信。

- **核心业务层：Gateway + Channels**
  - `src/gateway/*`：
    - `server.ts` / `server.impl.ts`：Gateway HTTP + WebSocket 服务入口。
    - `server/ws-connection*`：连接管理（认证、连接策略、防 flood、消息收发）。
    - 会话管理：`session-utils.ts`, `sessions-resolve.ts`, `sessions-patch.ts`。
    - 插件 HTTP 路由：`server/plugins-http*.ts`。
    - 启动与健康检查：`startup-auth.ts`, `startup-control-ui-origins.ts`, 各类 `*.health.test.ts`。
  - `src/channels/*`：
    - 通道统一抽象：会话封装、线程绑定、typing 状态、状态/反应更新等。
    - 通道插件桥接：`channels/plugins/*` 定义通道插件接口、规范 inbound/outbound 格式、处理 pairing/心跳/状态等。
  - `src/commands/channels/*`：通道操作的 CLI 命令（添加/移除/状态/日志/能力）。

- **支持层：Routing / Utils / Wizard / TUI**
  - 路由与命令调度（位于 `src/commands/*` 及相关模块）：负责从 CLI/Gateway 接收指令，路由到具体 agent、插件或工具。
  - 基础设施与工具：
    - `src/infra/*`：错误处理、子进程执行、网络兼容、平台差异等。
    - `src/utils/*`：账号 ID、并发控制、指令 tag、API key 遮蔽、消息封装等通用工具。
    - `src/wizard/*`：安装/配置向导（包括 gateway 配置、secret 输入、完成态引导等）。
  - 终端 TUI：`src/tui/*` 提供基于终端的交互 UI（聊天视图、会话列表、主题、高亮等）。

- **扩展层：插件系统**
  - `extensions/*`：每个子目录是一个插件包（如 `openai`, `anthropic`, `ollama`, `whatsapp`, `telegram`, `matrix`, `voice-call` 等），职责：
    - 对接具体通道或模型/工具。
    - 实现统一插件接口（配置 schema、能力声明、限流和错误处理等）。
  - 插件 SDK：
    - 根 `package.json` 中的 `"exports"` 映射到 `dist/plugin-sdk/*`。
    - 为第三方插件提供类型与运行时 API（如 `core`, `routing`, `telegram`, `slack`, `voice-call`, `memory-*` 等）。

---

### 2. 典型调用链（简要）

以“从聊天渠道到模型再回到用户”为例：

1. 用户在某个渠道（如 Telegram）发送消息。
2. 对应插件（位于 `extensions/*`）通过各自 SDK 收到更新，转换为统一的 channel 消息格式。
3. `src/channels/*` 层负责将该消息封装为标准 session/envelope，并交给 Gateway。
4. Gateway（`src/gateway/server*.ts`）根据配置与路由规则，将请求分发给相应 agent/工具（可能由插件提供）。
5. 插件通过 `plugin-sdk` 调用外部模型/服务，得到结果后，返回给 Gateway。
6. Gateway 将结果经 channel 抽象层与插件，发送回原始渠道对话。

CLI、Web UI 与桌面/移动 App 本质上也是这一流程的不同入口：它们通过 HTTP/WebSocket/本地进程调用 Gateway，复用同一套路由与插件逻辑。

---

### 3. 如何进一步阅读代码

- 想了解 **CLI 命令结构**：从 `src/cli/run-main.ts` 和 `src/cli/program/*` 看起。
- 想了解 **Gateway 协议与会话管理**：看 `src/gateway/server.ts`、`src/gateway/server.impl.ts` 以及 `session-*` 相关文件。
- 想了解 **通道与消息抽象**：看 `src/channels/*`（特别是 `session.ts`, `registry.ts`, `plugins/*`）。
- 想了解 **插件是如何写的**：
  - 选一个简单插件（如 `extensions/openai` 或 `extensions/telegram`）从 `src/index.ts` 开始。
  - 结合 `dist/plugin-sdk/*` 的类型定义理解插件 API。

如果你在调研某个具体通道/插件/命令，可以从对应目录入口文件（例如 `src/channels/web/index.ts`, `extensions/whatsapp/src/index.ts`）顺着调用关系往下追。

