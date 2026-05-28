# ADR 0003 配套：注入脚本骨架手动测试清单

- 状态：Active
- 关联 ADR：[`0003-inject-architecture.md`](./0003-inject-architecture.md)
- 适用版本：注入骨架 v0.1.x（M-09 / M-10 / M-11 等业务功能尚未落地）

> 本清单用于在「不依赖完整 Tauri 应用」的前提下，验证注入脚本骨架的全部公共承诺。
> 所有步骤都可以在普通 Chrome DevTools / 一台没安装 Tauri 的机器上完成。
> 后续业务功能完成后，每个 enhancer 会有自己的功能性测试清单，本清单只覆盖骨架层。

## 0. 准备

```bash
# 1. 编译骨架 bundle
pnpm install
pnpm run build:inject

# 2. 确认产物存在且体积合理
ls -lh dist-injected/bundle.js
# 预期：未 minify 体积 < 80KB；minify 体积 < 30KB；gzip 体积 < 20KB
```

可选：用 `gzip -c dist-injected/bundle.js | wc -c` 验证 gzip 大小。

## 1. 验证防重复加载与命名空间

1. Chrome 打开 https://chat.deepseek.com（不要登录，访客状态足够）
2. 打开 DevTools → Console
3. 在 console 中粘贴 `dist-injected/bundle.js` 全文并回车
4. 检查：

   ```js
   window.__DEEPSEEK_DESKTOP__
   // 期望返回 { version, initialized, snapshot, flags } 对象
   window.__DEEPSEEK_DESKTOP__.initialized
   // 期望 true
   window.__DEEPSEEK_DESKTOP__.snapshot()
   // 期望返回 { version, startedAt, enhancerStatuses, errorCount }
   window.__DEEPSEEK_DESKTOP__.flags()
   // 期望返回所有已注册 flag 的快照对象
   ```

5. 再次粘贴同一段 bundle，确认控制台出现 `[DeepDesk:inject:bootstrap] script already loaded; skip` 警告，且 `__DEEPSEEK_DESKTOP__` 没有被覆盖。

## 2. 验证 enhancer ready 上报

```js
window.__DEEPSEEK_DESKTOP__.snapshot().enhancerStatuses
```

期望（默认 flag 状态）：

| name | 期望状态 |
|------|---------|
| `fetch-interceptor` | `ready` |
| `xhr-interceptor` | `disabled`（默认 flag false） |
| `immersive` | `disabled` |
| `mermaid` | `ready` |
| `slash-menu` | `ready` |
| `thinking` | `ready` |
| `auto-retry` | `disabled` |

每个 stub enhancer 在 console 中应输出 `[DeepDesk:enhancer:<name>] (info) ready (stub)`。

## 3. 验证 selectors 命中率监控（无业务数据采集）

1. 在 console 中执行：

   ```js
   const m = (await import('data:text/javascript,export const _=null')); // 占位
   // 直接用 bundle 内的全局名（esbuild config: globalName: '__deepdesk_inject__'）
   // 由于 bundle 是 IIFE 不挂全局，可改为通过 DevTools sources 断点；
   // 简化做法：在编译产物中临时把 selectors 暴露到 window.__DEEPSEEK_DESKTOP__.debug
   ```

2. 推荐做法：在 DevTools → Sources 中给 `core/selectors.ts:findFirst` 打断点，访问任意 chat 页，确认调用时 metrics 计数器递增。

3. 在浏览器普通模式（无登录）下，因为页面没有真正的 chat 容器，应能在断点中看到 `metrics.chatInput.misses` 不断累计。
   - 期望：连续 16 次未命中后触发一次 `bridge.emit('inject:selector-miss', ...)`，由于无 Tauri，仅落 console.debug；不应抛错。

4. 验证不变量：搜索全 bundle 源代码，确保 `selectors.ts` 的命中节点除 `findFirst` / `findAll` 返回外，**没有任何调用读取 `.textContent` / `.innerText` / `.value` 进行业务数据上报**（grep 自查）。

## 4. 验证 fetch 拦截不影响正常请求

1. 在 console：

   ```js
   const r1 = await fetch('https://chat.deepseek.com/');
   console.log(r1.status); // 期望 200 或正常 304
   ```

2. 拦截器应**透传**：响应状态码、headers、body 必须与 fetch 未被 patch 时一致。
3. 在 DevTools Network 面板，验证请求 URL / method / payload 与预期一致——拦截器**不应**改写任何字段。
4. 注册一个测试 hook：

   ```js
   // 用 sources 面板里的 onResponse 引用，或在 bundle 编译产物里临时 export
   window.__test_unhook = onResponse(
     (req) => req.url.includes('/api'),
     (req, cloned) => console.log('hook fired:', req.url, cloned.status),
   );
   ```

   随后访问任意 `/api/...` 请求，期望看到 hook 触发、且页面对该 response 的消费不受影响。
5. 解除 hook：`window.__test_unhook()`，确认后续请求不再触发。

## 5. 验证 XHR 拦截默认禁用

```js
window.__DEEPSEEK_DESKTOP__.flags()['xhr-interceptor'] === false
// 期望 true
window.__DEEPSEEK_DESKTOP__.snapshot().enhancerStatuses['xhr-interceptor']
// 期望 'disabled'
```

发起一个 XHR 请求，确认其行为完全等同未注入时（用 `Performance` 面板比对前后耗时无明显增加）。

## 6. 验证 SSE 解析器（单元测试）

不要在真实 chat.deepseek.com 上测，构造合成流：

```js
const { parseSSEStream } = window.__test_sse; // 调试用临时 export
const stream = new ReadableStream({
  start(c) {
    const enc = new TextEncoder();
    c.enqueue(enc.encode('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n'));
    c.enqueue(enc.encode('data: {"choices":[{"delta":{"content":" there"}}]}\n\n'));
    c.enqueue(enc.encode('data: [DONE]\n\n'));
    c.close();
  },
});
const out = [];
for await (const evt of parseSSEStream(stream)) out.push(evt);
console.log(out);
// 期望 3 个事件，最后一个 data === '[DONE]'
```

边界用例：

- 流中包含 `:keep-alive` 注释行 → 应被忽略（无 event 产出）
- `event: foo\n` 行 → 下一个事件 `event === 'foo'`
- reader.cancel() 后 → 迭代器正常结束，无未处理 promise rejection

## 7. 验证错误隔离

1. 临时修改 `enhancers/mermaid.ts` 的 `init` 改为 `throw new Error('boom')`，重编译。
2. 重复 §1–§2，确认：
   - `mermaid` 状态变 `failed`
   - 其他 enhancer 仍为 `ready`
   - `window.__DEEPSEEK_DESKTOP__.initialized === true`
   - bundle 不向 console 抛未捕获错误
   - DOM 与原页面无任何视觉差异
3. 测试完成后还原 stub。

## 8. 验证降级模式（无 Tauri）

普通 Chrome 中 `window.__TAURI__` 不存在，所以骨架应进入降级模式：

1. 在 console 应看到 `[DeepDesk:core:bridge] (warn) Tauri bridge timeout, running in degraded mode`（约 5s 后）
2. `bridge.invoke('save_message', {...})` 应抛 `Error('bridge.invoke(save_message) called in degraded mode')`
3. `bridge.emit('inject:ready', ...)` 应仅 `console.debug` 不抛错
4. selectors miss 上报、enhancer 状态报告等都仅落 console，不影响其他逻辑

## 9. 验证合规底线（代码审查项）

不是运行时验证，而是 PR review 必查：

- [ ] `core/selectors.ts` 文件头注释明确「仅用于 UI 增强」
- [ ] `interceptors/fetch.ts` 的 `patchedFetch` 不修改任何 request 字段（搜索 `init.method =` / `init.headers =` / `init.body =` 不应有赋值语句）
- [ ] hook 拿到的是 `response.clone()` 而非原 response，且原 response 在 hook 命中前已经返回给调用方
- [ ] `utils/logger.ts` 的 `report` 路径上不存在「读取 chat.deepseek.com DOM textContent / innerText 后写入 message」的逻辑
- [ ] 没有任何代码主动调用 `document.cookie`、`localStorage`、`sessionStorage`（如有，必须在文件头标注用途并说明合规依据）

## 10. 监控与回归

骨架阶段尚未上线 CI 真机回归（按路线图第 13 周引入）。本清单建议每次合并骨架相关 PR 时：

1. 跑 §1 / §2 / §4 / §5 / §7 / §8 六项核心场景；
2. 检查 bundle gzip 大小是否仍 < 20KB（若 ≥，需在 PR 中说明原因）；
3. 至少在 Windows + macOS 各跑一次（WebView2 与 WKWebView 的 ReadableStream / TextDecoder 行为一致性会在这里暴露）。
