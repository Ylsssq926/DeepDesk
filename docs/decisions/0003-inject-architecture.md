# ADR 0003：注入脚本骨架架构

- 状态：Accepted
- 日期：2025-01
- 关联文档：
  - `docs/ARCHITECTURE.md` §3.3 注入脚本（src-injected/）
  - `docs/ARCHITECTURE.md` §4.2 注入脚本架构
  - `docs/ARCHITECTURE.md` §4.3 SSE 流拦截与对话存档
  - `docs/ARCHITECTURE.md` §10.1 chat.deepseek.com 改版导致注入失效
  - `docs/PRD.md` §1.6 合规底线

## 1. 背景与目标

DeepDesk 通过 Tauri 2.x 的 `initialization_script` 在 chat.deepseek.com WebView 创建时注入一段 IIFE bundle，提供 Mermaid 渲染（M-09）、Slash 命令（M-10）、截图与 OCR（M-11）、SSE 拦截缓存、自动重试（M-06）、Thinking 折叠（M-07）等增强能力。

骨架阶段的目标是把「房子」搭好：

1. 所有未来功能共用同一套生命周期、错误隔离、与 Tauri 后端通信的基础设施。
2. 任意单个 enhancer 崩溃，绝不连带其他 enhancer，更不连带宿主页。
3. 严格满足 PRD §1.6 合规底线：不抓 DOM 业务数据、不修改 DeepSeek 自身请求、不绕过 PoW、不模拟登录。
4. 骨架阶段 bundle gzip 大小预算 < 20KB，给后续业务库（Mermaid、Tesseract pre-process 等）留余量。

## 2. 决策摘要

骨架按 `core / interceptors / enhancers / utils / types` 五个子目录组织（见下方目录树）。所有 enhancer 实现统一的 `Enhancer` 接口；fetch / XHR 拦截作为「基础设施层」与 enhancer 区分；与 Tauri 主进程通信通过单例 `bridge` 完成；DOM 选择器维护一份多版本兜底清单；所有 DOM 变化订阅通过中央 `observer` 调度。

```
src-injected/
├── index.ts                 入口（防重 / 时序 / 启动 enhancer / emit ready）
├── core/
│   ├── runtime.ts           生命周期、错误聚合、enhancer 状态登记
│   ├── bridge.ts            Tauri event/listen + invoke 包装（含降级模式）
│   ├── selectors.ts         DOM 选择器多版本清单 + 命中率监控
│   ├── observer.ts          中央 MutationObserver 调度器
│   └── shadow-host.ts       Shadow DOM 容器工厂
├── interceptors/
│   ├── fetch.ts             fetch monkey-patch（仅注册响应钩子）
│   ├── xhr.ts               XHR monkey-patch 骨架（默认禁用）
│   └── sse.ts               SSE → AsyncIterable<SSEEvent> 解析
├── enhancers/
│   ├── immersive.ts         M-03 沉浸式（stub）
│   ├── mermaid.ts           M-09 Mermaid 渲染（stub）
│   ├── slash-menu.ts        M-10 Slash 命令（stub）
│   ├── thinking.ts          M-07 Thinking 折叠（stub）
│   └── auto-retry.ts        M-06 自动重试（stub）
├── utils/
│   ├── logger.ts            分级日志 + 受限上报
│   ├── safe-call.ts         同步/异步错误隔离包装
│   ├── feature-flag.ts      功能开关 store + 监听
│   └── debounce.ts          debounce / throttle / once / whenIdle
└── types/
    ├── feature.ts           Enhancer / Status / ErrorRecord
    ├── messages.ts          IPC 事件 / Command / payload
    └── deepseek.ts          SSE 字段（仅基于公开可观察的 chunk 协议）
```

## 3. 核心设计原则与取舍

### 3.1 分层动机

| 层 | 关注点 | 单元测试边界 |
|----|--------|-------------|
| `types/` | TypeScript 类型契约（与 Rust 端 IPC 对齐） | 静态检查 |
| `utils/` | 不依赖任何 chat.deepseek.com DOM 的纯工具 | 易于 vitest |
| `core/` | 与宿主页 DOM / Tauri 桥的接缝层 | 部分单测 + 浏览器集成测试 |
| `interceptors/` | 全局副作用（patch fetch / XHR / SSE） | mock 全局对象的单测 |
| `enhancers/` | 业务增强；通过 core/utils 组合实现 | 浏览器集成测试为主 |

把「副作用」（interceptors）与「业务呈现」（enhancers）分离的好处：

- Interceptor 必须在 page JS 之前运行，时机最严苛；它们只暴露 hook 注册接口，不强求当前阶段就有具体 enhancer 接入。
- Enhancer 可按 `when: 'immediate' | 'dom-ready' | 'load' | 'idle'` 自定义启动时机，避免互相阻塞。
- 后续若要 dynamic import 某个重型库（如 Mermaid），只需改对应 enhancer，不影响 core/utils。

### 3.2 错误隔离机制

每个 enhancer 在启动时被 `safeCallAsync` 兜底；失败仅把状态切到 `'failed'`，不抛错；fetch / XHR hook 内部用 try/catch 隔离，从 hook 抛出的错误不会让 fetch 调用方拿不到 response。

`logger.error` 默认会经 `runtime.report` 经 `bridge` 转发到主进程，但：

- 上报内容受 `LoggerPolicy.maxReportLen` 限制（1024 字符）防泄漏；
- 启动期 bridge 未就绪时错误进 in-memory ring buffer（最多 200 条），就绪后再 flush；
- 上报通道本身抛错被吞掉，绝不导致二次崩溃。

### 3.3 合规底线在代码层的体现

- `core/selectors.ts` 文件头明确声明「**仅用于 UI 增强目的，绝不用于抓取业务数据**」，并在 API 文档说明唯一允许的使用方式（在已识别的容器内挂载我们的 Shadow DOM）。
- `interceptors/fetch.ts` 强制透传：不修改 request、不在 hook 中改 response 后回填给页面。
- `types/deepseek.ts` 只描述「公开可观察的 SSE chunk 字段」，不为业务 DOM 抓取提供任何类型基础。
- `utils/logger.ts` 显式禁止上传任何「用户对话内容、prompt 内容」（注释强调，调用方须自查；level=error 才有上报通道）。

### 3.4 性能考量

- 中央 `observer` 强制所有 enhancer 共用一个 MutationObserver，节流间隔 50ms；避免 N 个 observer 同时跑导致主线程抖动。
- `feature-flag` 在内存中维护，命中 O(1)；选择器命中率统计采样上报（命中按 64 次一上报，未命中按 16 次一上报）。
- `bridge.waitForReady` 5s 超时即降级为本地 console，不阻塞 enhancer 启动。
- 默认仅 `mermaid` / `slash-menu` / `thinking` / `fetch-interceptor` 处于 `defaultEnabled = true`；`xhr-interceptor` / `auto-retry` / `immersive` 默认禁用，等具体功能落地再开启。

### 3.5 沙箱：Shadow DOM 隔离

所有未来的 React UI（Mermaid 渲染容器、Slash 菜单、Thinking 卡片）都通过 `core/shadow-host.ts` 创建独立 Shadow DOM。host 节点 `all: initial` + `pointer-events: none`，仅在内部具体 UI 显式开启交互；默认 `closed` 模式，避免页面脚本越界访问。

## 4. 与同类项目对比

| 项目 | 注入方式 | 错误隔离 | DOM 选择器策略 | 合规边界 |
|------|---------|---------|---------------|---------|
| **lencx/ChatGPT** | `WebviewBuilder::initialization_script` + 用户脚本目录（user_scripts） | 模块级 try/catch（参考 `core/setup.rs`） | 用户脚本自维护选择器 | 主要做 UI 包装；不强约束抓 DOM |
| **DeepDesk（本骨架）** | `initialization_script` IIFE bundle | runtime + safeCall + logger ring buffer 三层 | 中央化多版本清单 + 命中率监控 + 选择器 miss 上报 | 强约束：选择器仅用于 UI 增强，业务数据全部来自我们自己的请求/响应 |
| **典型油猴脚本** | `// @match` + `// @run-at=document-start` | 单脚本崩溃影响所有逻辑 | 单脚本作者维护 | 无统一约束 |

DeepDesk 比 lencx/ChatGPT 强约束的原因：DeepSeek 是「第三方网页 + 我们 wrapping」，我们必须主动避免被识别为反滥用对象，所以**接近 0% 的 DOM 业务数据采集**才是底线（见 PRD §1.6）。

## 5. chat.deepseek.com 改版时的演进路径

骨架已为「网页改版」预埋三条路径：

1. **选择器监控**：`core/selectors.ts` 命中率指标会经 `inject:selector-miss` 事件持续上报，主进程聚合后能在「连续 N 天某 selector 命中率 = 0」时自动开 issue（与 ARCHITECTURE §10.1 的回归 CI 协同）。
2. **远程下发新 bundle**：主进程已有 `safe_update_script`（ARCHITECTURE §7 安全清单），骨架 bundle 替换零代码风险——所有 enhancer 都通过 register 接入 runtime，不会留下游离监听器。
3. **enhancer 单独降级**：`feature-flag` 支持运行时切换；当主进程发现某 enhancer 报错率超阈值，可通过 `feature-flag:set` 事件远程关闭单个 enhancer 而无须更新整个 bundle。

## 6. tsconfig 是否需要为 src-injected 单独配置

**当前不需要**。根 `tsconfig.json` 的 `include` 已包含 `src-injected`，且 strict 选项满足注入脚本需求。

未来在以下条件全部满足时，建议拆分为 `tsconfig.inject.json`：

- 注入脚本需要一组与主 React UI 不一样的 lib（例如想用 `lib: ["ES2022", "DOM"]` 而 React 端要 `["ES2022", "DOM", "DOM.Iterable", "WebWorker"]`）；
- 或注入脚本需要禁用 `jsx` 处理（当前主 tsconfig 是 `react-jsx`，但因为注入脚本里没有 `.tsx`，无影响）；
- 或要为注入脚本启用更激进的检查（例如 `noPropertyAccessFromIndexSignature`）。

拆分方式：保留根 tsconfig 作为 `references`，新增 `tsconfig.inject.json` 用 `extends: ./tsconfig.json` + 覆盖 `include` / `lib` / `outDir` / 自定义 `compilerOptions`。本 ADR 不修改 tsconfig，仅记录决策。

## 7. 风险与未决问题

| 风险 | 处置 |
|------|------|
| 当前阶段 logger.error 默认上报到主进程，可能在某些极端 bug 中误带敏感文本 | logger 已强制 `maxReportLen = 1024`；后续 M-12 隐私 review 可考虑改为「设置中显式开启才上报」 |
| `bridge.waitForReady` 5s 超时是否过长 | 经验值取自 ARCHITECTURE §3.3（最多等 50 × 100ms = 5s）；后续可根据 Tauri 启动 P95 时延调整 |
| `xhr-interceptor` 当前默认禁用，未来若需要诊断指标需先评估隐私 | 启用前先发 ADR |
| esbuild 不修改前提下，是否真能控制 bundle < 20KB | 骨架不引入业务库，gzip 后实测预期 5–8KB；M-09 引入 mermaid 后会单独评估并按需拆分 chunk |

## 8. 不在本 ADR 范围内

- Mermaid / Slash / OCR 各功能的具体实现（属于各自 PRD 编号的迭代）
- 注入脚本远程热更新的下载/校验流程（已在 ARCHITECTURE §7.3 / §10.1 决策）
- 主进程侧 Tauri command 实现细节（属于 src-tauri/ 范畴）
