# 注入脚本骨架 — 代码审查报告

> 审查者：Claude Opus 4.6  
> 审查时间：2026-03

## 总评

**PASS**（附 0 个阻塞问题、6 个改进建议）

骨架整体质量优秀。合规底线全部满足，架构分层清晰，错误隔离机制完备，代码风格统一。以下为逐项详细核查。

---

## 合规底线核查（最高优先级）

### A1 fetch 透传

**结论：PASS**

- `interceptors/fetch.ts:82` — `const response = await originalFetch(input, init);` 直接透传原始 `input` 和 `init`，未做任何修改。
- 没有 `Headers.set / append / delete` 调用（全局 grep 确认）。
- 没有修改 body 的代码。
- `fetch.ts:90` — `cloned = response.clone()` 克隆 response。
- `fetch.ts:100` — hook 拿到的是 `cloned!.clone()`（二次克隆），原始 response 在第 113 行 `return response` 直接返回给页面。
- hook 在 `queueMicrotask` 中异步执行（第 97 行），不阻塞调用方。

### A2 xhr 透传

**结论：PASS**

- `interceptors/xhr.ts:84` — `originalOpen.apply(this, [method, url, ...rest])` 原样透传所有参数。
- `interceptors/xhr.ts:118` — `originalSend.call(this, body)` 原样透传 body。
- 没有 `setRequestHeader` 拦截（仅在注释中提及不修改）。
- hook 仅在 `loadend` 事件后读取 `XHRSnapshot`（url/method/status/时间戳），不读取 responseText 或 responseXML。

### A3 selectors 用途

**结论：PASS**

- `core/selectors.ts:8-11` 文件头明确声明「仅用于 UI 增强目的」「绝不用于读取 chat.deepseek.com 业务数据」。
- 仅暴露 `findFirst`、`findAll`、`getMetrics` 三个公共函数。
- **无** `getMessageText`、`extractContent` 或任何读取 `.textContent` / `.innerText` / `.value` 的辅助函数（grep 确认）。
- 命中率上报 payload（`InjectSelectorMissPayload`，`types/messages.ts:74-84`）仅含 `name`、`hit`、`totalHits`、`totalMisses`，不含任何 DOM 内容。

### A4 logger 上传范围

**结论：PASS**

- `utils/logger.ts:21` — `MAX_REPORT_MESSAGE_LEN = 1024`，显式限制上报长度。
- `utils/logger.ts:7-9` 文件头注释明确「严禁通过日志通道上传任何用户对话内容、prompt 内容、剪贴板内容、截图 OCR 文本」。
- `utils/logger.ts:104` — 仅 `error` 级别在 `policy.reportErrorsToHost === true` 时上报。
- `utils/logger.ts:93` — `warn` 级别默认 `reportWarnsToHost: false`，不上报。
- `debug` 和 `info` 仅落本地 console，无上报路径。

### A5 enhancers 纯占位

**结论：PASS**

5 个 enhancer 逐一检查：

| 文件 | init 内容 | 是否纯 stub |
|------|-----------|-------------|
| `enhancers/immersive.ts:33` | `log.info('ready (stub)')` | ✅ |
| `enhancers/mermaid.ts:37` | `log.info('ready (stub)')` | ✅ |
| `enhancers/slash-menu.ts:37` | `log.info('ready (stub)')` | ✅ |
| `enhancers/thinking.ts:34` | `log.info('ready (stub)')` | ✅ |
| `enhancers/auto-retry.ts:38` | `log.info('ready (stub)')` | ✅ |

所有 enhancer 均实现 `Enhancer` 接口（`types/feature.ts:38-64`），含 `name`、`when`、`defaultEnabled`、`init()`、`dispose?()`。

### A6 错误隔离

**结论：PASS**

- `index.ts:157-165` — 每个 enhancer 的 `init()` 在独立的 `async IIFE + try/catch` 中执行，失败仅设 `runtime.setStatus(name, 'failed')`，不影响其他 enhancer。
- `index.ts:88-89` — fetch/XHR 安装通过 `safeCall` 包裹，抛错返回 `undefined`。
- `interceptors/fetch.ts:97-111` — hook 在 `queueMicrotask` 中执行，每个 hook 独立 try/catch，不影响 fetch 调用方。
- `core/observer.ts:107-109` — predicate 和 handler 均通过 `wrapSafe` 包裹。
- 整个 bootstrap 主流程在 `safeCallAsync` 中（`index.ts:98-125`），即使整体崩溃也不阻塞页面。

---

## 架构契约核查

### B1 window.__DEEPSEEK_DESKTOP__ 命名空间

**结论：PASS**

- `index.ts:72-77` — 防重复加载：检测 `window.__DEEPSEEK_DESKTOP__` 存在则 skip。
- `index.ts:80-85` — 立即创建命名空间对象（在 fetch/XHR 安装之前），防止 enhancer 提前访问 undefined。
- 防重复逻辑健壮：使用 truthy 检测，重复加载时仅 console.warn 不抛错。

### B2 bridge.ts 与 Tauri 集成

**结论：PASS**

- `core/bridge.ts:76-79` — 检测 `window.__TAURI__` 存在性，不存在时所有方法降级。
- 类型化 `emit` / `listen` / `invoke` API 完整（含重载签名）。
- 事件命名使用 `inject:xxx` / `webview://xxx` / `message:xxx` 等命名空间，与 ARCHITECTURE §5 一致。
- `waitForReady` 5s 超时后进入 degraded 模式（`bridge.ts:101-103`）。
- `invoke` 在降级模式下抛出可识别错误（`bridge.ts:193`）。

### B3 observer.ts 单例模式

**结论：PASS**

- `core/observer.ts:61` — `if (observer) return;` 强制单例。
- 提供 `observe(predicate, handler)` API，返回 `ObserveHandle`，支持 `cancel()` 取消。
- 节流 50ms（`FLUSH_INTERVAL_MS`），单次 flush 处理所有排队节点。
- 订阅者 handler 通过 `wrapSafe` 包裹，单个抛错不影响其他。

### B4 shadow-host.ts

**结论：PASS**

- `core/shadow-host.ts:49` — 默认 `mode: 'closed'`，隔离样式且外部无法访问。
- 工厂方法 `createShadowHost(id, mode)` 合理，返回 `ShadowHostHandle`（含 `appendStyle`、`dispose`）。
- 幂等：同名 host 重复创建返回已有实例（第 52-54 行）。
- host 节点 `all: initial` + `pointer-events: none`（第 64-73 行），不影响宿主页布局。

### B5 types/ 设计

**结论：PASS（附 1 个改进建议）**

- `types/feature.ts:17-21` — `EnhancerStatus` 使用 string literal union type（非 enum）。✅
- `types/feature.ts:24-31` — `EnhancerName` 使用 string literal union type。✅
- `types/deepseek.ts:8` — 文件头标注「基于用户自身发起的 chat completion 请求所返回的 SSE 流」。✅
- `types/deepseek.ts:54` — `DeepSeekDelta` 注释「基于公开可观察的 SSE 字段，可能随官方升级而变化」。✅
- `types/messages.ts` — 覆盖了 ARCHITECTURE §5 中注入脚本相关的全部事件和 command。

**改进建议**：`TauriCommand` 类型（`messages.ts:40-52`）缺少 ARCHITECTURE §5.2 中的部分 command（如 `export_conversation`、`list_conversations`、`delete_conversation`、`toggle_quick_window`、`take_screenshot`、`run_ocr`、`cache_sse_chunks` 等）。虽然骨架阶段不需要全部，但类型定义应与架构文档保持同步。

---

## 质量与维护性

### C1 TypeScript 严格模式

**结论：PASS**

- 全局 grep 确认无 `as any` 使用。
- 所有函数参数和返回值均有显式类型标注。
- `bridge.ts:198` 使用 `as unknown` 进行安全类型转换（有合理理由：Tauri API 的 this 绑定）。
- 预期能通过 `strictNullChecks`（所有可空值均用 `?` 或 `| null` 标注）。

### C2 文件头注释规范

**结论：PASS**

所有 21 个 TS 文件均有 module-level JSDoc 注释，包含：
- `@module` 标签
- `@see` 引用相关架构文档
- 「合规约束」段落（涉及合规的文件）
- 「不变量」段落

### C3 bundle 体积

**结论：PASS**

- 无任何第三方运行时依赖（无 React、lodash、moment 等）。
- `scripts/build-inject.ts` 配置 `bundle: true`、`format: 'iife'`、`platform: 'browser'`。
- 所有代码均为纯 TypeScript 工具函数，预期 gzip < 10KB。

### C4 ADR 质量

**结论：PASS**

- `0003-inject-architecture.md` 回答了：
  - 为什么这样分层（§3.1 分层动机表格）
  - 与 lencx/ChatGPT 对比（§4 对比表）
  - 性能考量（§3.4）
  - 改版演进路径（§5）
- `0003-inject-test-plan.md` 提供了 10 个可人工 walk through 的测试场景，含具体代码片段和期望结果。

---

## 被审查者声明的 3 个关注点的核查结果

### 关注点 1：fetch 零修改 + clone

**结论：完全符合**

```typescript
// fetch.ts:82 — 原样透传，零修改
const response = await originalFetch(input, init);

// fetch.ts:90 — 第一次 clone
cloned = response.clone();

// fetch.ts:100 — 给 hook 的是 clone 的 clone（双重隔离）
const ret = hook.handler(req, cloned!.clone());

// fetch.ts:113 — 原始 response 直接返回给页面
return response;
```

页面拿到的是未被触碰的原始 `response`；hook 拿到的是 `response.clone().clone()`，即使 hook 消费了 body 也不影响页面。

### 关注点 2：selectors 仅暴露 findFirst/findAll

**结论：完全符合**

- 公共导出仅 3 个函数：`findFirst`（第 99 行）、`findAll`（第 130 行）、`getMetrics`（第 151 行）。
- 无任何读取 `.textContent` / `.innerText` / `.value` 的代码（grep 确认）。
- 命中率上报 payload（`emitMetric` 第 155-162 行）仅含 `name`（string）、`hit`（boolean）、`totalHits`（number）、`totalMisses`（number）。

### 关注点 3：index.ts 启动时序

**结论：完全符合**

```typescript
// index.ts:88-89 — 步骤 3：同步安装 fetch/XHR（在 bridge.waitForReady 之前）
safeCall('inject:bootstrap:fetch', () => installFetchInterceptor(), undefined);
safeCall('inject:bootstrap:xhr', () => installXHRInterceptor(), undefined);

// index.ts:98-101 — 步骤 5：异步等待 bridge
void safeCallAsync('inject:bootstrap:main', async () => {
  const tauriReady = await bridge.waitForReady();
  // ...
});
```

时序正确：fetch/XHR monkey-patch 是同步安装的（步骤 3），在 `bridge.waitForReady()` 的异步等待（步骤 5）之前完成。这确保了即使 Tauri bridge 需要 5s 才就绪，页面发出的第一个 fetch 请求也已经被我们的 patch 覆盖。

---

## 问题分类汇总

### 🔴 阻塞问题

无。

### 🟡 改进建议

| # | 文件:行 | 问题 | 建议 |
|---|---------|------|------|
| 1 | `types/messages.ts:40-52` | `TauriCommand` 类型未覆盖 ARCHITECTURE §5.2 中的全部 command（缺少 `export_conversation`、`list_conversations`、`delete_conversation`、`toggle_quick_window`、`take_screenshot`、`run_ocr` 等） | 补全或添加注释说明「骨架阶段仅列出注入脚本直接使用的 command」 |
| 2 | `interceptors/sse.ts:78-79` | `parseLine` 函数在 `done=true` 时被调用处理 buffer 残余，但它只处理 `data:` 前缀行，忽略了可能的 `event:` / `id:` 行 | 建议复用 `applyLine` + `dispatch` 逻辑处理 trailing buffer |
| 3 | `core/bridge.ts:57` | `EmitPayloads` 中 `'webview://message-completed'` 使用 `Record<string, unknown>` 作为占位类型 | 建议改为 `MessagePayload`（已在 messages.ts 定义）或添加 TODO 注释标明后续需细化 |
| 4 | `index.ts:94-95` | `runtime.register(enh.name, () => enh.init())` 注册了 init 引用，但 `scheduleEnhancers` 中又直接调用 `enh.init()`，register 中的 init 引用从未被使用 | 建议统一：要么 scheduleEnhancers 通过 runtime 调度 init，要么 register 不保存 init 引用 |
| 5 | `docs/decisions/0003-inject-architecture.md:5` | ADR 日期写的是 `2025-01`，应为 `2026-03` | 修正日期 |
| 6 | `interceptors/sse.ts:162-164` | `findLineEnd` 只查找 `\n`，对于 `\r\n` 的处理依赖上层 `buffer.slice(nlIdx + (buffer[nlIdx] === '\r' ? 2 : 1))`，但 `buffer[nlIdx]` 此时是 `\n` 而非 `\r`（`\r` 在 `nlIdx - 1` 位置） | 应改为 `buffer[nlIdx - 1] === '\r' ? 2 : 1` 或在 findLineEnd 中返回含 `\r` 的完整行尾信息 |

### 🟢 加分项

| # | 文件 | 亮点 |
|---|------|------|
| 1 | `interceptors/fetch.ts:84-86` | 仅在有 hook 命中时才 clone response，避免对所有请求做无意义 clone——性能意识优秀 |
| 2 | `core/observer.ts:107-109` | predicate 和 handler 均通过 `wrapSafe` 包裹，防止第三方回调污染中央调度器 |
| 3 | `utils/logger.ts:120-138` | `safeStringify` 处理循环引用、函数体屏蔽，防御性编程到位 |
| 4 | `core/bridge.ts:169-178` | unlisten 函数加了 `disposed` 标志实现幂等，细节考虑周到 |
| 5 | `index.ts:70-77` | 防重复加载使用 truthy 检测 + console.warn（不走 logger 避免双倍上报），设计精巧 |
| 6 | 全局 | 零 `as any`、零 `document.cookie`/`localStorage` 访问、零第三方依赖——合规与体积控制均优秀 |

---

## 推荐的下一步

1. 修复 `sse.ts` 的 `\r\n` 处理 bug（改进建议 #6），这是唯一可能影响运行时正确性的问题。
2. 补全 `TauriCommand` 类型或添加范围说明注释。
3. 修正 ADR 日期。
4. 后续功能实现阶段，建议为 `interceptors/sse.ts` 补充 vitest 单元测试（test plan §6 已规划）。
5. 考虑在 `bridge.ts` 的 `EmitPayloads` 中为占位事件添加 TODO 注释，标明何时细化类型。
