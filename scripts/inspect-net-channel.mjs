/**
 * 诊断脚本：定位 chat.deepseek.com `/api/v0/chat/completion` 请求的真实通道，
 * 并验证我们注入的 window.fetch / XHR / EventSource patch 是否被命中。
 *
 * 仅观察，绝不修改任何请求。复用 .pw-profile/ 登录态。
 *
 * 输出到 console + scripts/.tmp-inspect-net-channel.json（最终摘要）。
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROFILE_DIR = join(ROOT, '.pw-profile');
const OUT_JSON = join(__dirname, '.tmp-inspect-net-channel.json');
const TARGET = 'https://chat.deepseek.com';

/**
 * 哨兵脚本：在页面任何脚本之前执行（addInitScript 的合约）。
 * 同时在主世界（main world）和（隐含）所有 frame。注意：addInitScript 不进 worker。
 */
const SENTINEL = String.raw`
(() => {
  if (window.__DD_SENTINEL__) return;
  const SENTINEL = {
    installedAt: Date.now(),
    fetchCalls: [],
    xhrCalls: [],
    esCalls: [],
    fetchIdentityChecks: [],
    workerCtorCalls: [],
    sharedWorkerCtorCalls: [],
    serviceWorkerRegistrations: [],
    perfEntries: [],
    initialFetchRef: null,
    initialFetchSource: '',
  };
  window.__DD_SENTINEL__ = SENTINEL;

  // ---- 捕获原始 fetch 引用（这是页面任何代码之前的真品） ----
  const origFetch = window.fetch;
  SENTINEL.initialFetchRef = origFetch;
  try { SENTINEL.initialFetchSource = Function.prototype.toString.call(origFetch); } catch {}

  // ---- patch fetch ----
  const patchedFetch = function patchedFetch(input, init) {
    try {
      let url = '';
      let method = 'GET';
      if (typeof input === 'string') url = input;
      else if (input instanceof URL) url = input.href;
      else if (input && typeof input === 'object') {
        url = input.url || '';
        method = input.method || 'GET';
      }
      if (init && init.method) method = init.method;
      // 拍一个堆栈快照，看 caller 是谁、是不是 worker
      const stack = new Error().stack || '';
      SENTINEL.fetchCalls.push({
        at: Date.now(),
        url,
        method: method.toUpperCase(),
        stackHead: stack.split('\n').slice(0, 5).join('\n'),
        global: typeof self !== 'undefined' && self === window ? 'window' : (typeof self !== 'undefined' ? String(self.constructor && self.constructor.name) : '?'),
      });
    } catch {}
    return origFetch.apply(this, arguments);
  };
  // 标记我们的 patched 版本
  Object.defineProperty(patchedFetch, '__dd_patched__', { value: true });
  try {
    window.fetch = patchedFetch;
  } catch (e) {
    SENTINEL.fetchPatchError = String(e);
  }

  // ---- patch XMLHttpRequest ----
  try {
    const OrigOpen = XMLHttpRequest.prototype.open;
    const OrigSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
      try {
        SENTINEL.xhrCalls.push({
          at: Date.now(),
          url: typeof url === 'string' ? url : (url && url.href) || '',
          method: String(method || 'GET').toUpperCase(),
          phase: 'open',
        });
      } catch {}
      return OrigOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function() {
      try {
        SENTINEL.xhrCalls.push({ at: Date.now(), phase: 'send' });
      } catch {}
      return OrigSend.apply(this, arguments);
    };
  } catch (e) { SENTINEL.xhrPatchError = String(e); }

  // ---- patch EventSource ----
  try {
    if (typeof EventSource === 'function') {
      const OrigES = EventSource;
      function PatchedES(url, init) {
        try {
          SENTINEL.esCalls.push({
            at: Date.now(),
            url: typeof url === 'string' ? url : (url && url.href) || '',
          });
        } catch {}
        return new OrigES(url, init);
      }
      PatchedES.prototype = OrigES.prototype;
      PatchedES.CONNECTING = OrigES.CONNECTING;
      PatchedES.OPEN = OrigES.OPEN;
      PatchedES.CLOSED = OrigES.CLOSED;
      window.EventSource = PatchedES;
    }
  } catch (e) { SENTINEL.esPatchError = String(e); }

  // ---- patch Worker / SharedWorker 构造函数（看是否页面会拉起 worker） ----
  try {
    const OrigWorker = window.Worker;
    if (OrigWorker) {
      function PatchedWorker(scriptURL, opts) {
        try {
          SENTINEL.workerCtorCalls.push({
            at: Date.now(),
            url: String(scriptURL),
            type: opts && opts.type,
          });
        } catch {}
        return new OrigWorker(scriptURL, opts);
      }
      PatchedWorker.prototype = OrigWorker.prototype;
      window.Worker = PatchedWorker;
    }
    const OrigSharedWorker = window.SharedWorker;
    if (OrigSharedWorker) {
      function PatchedSharedWorker(scriptURL, opts) {
        try {
          SENTINEL.sharedWorkerCtorCalls.push({
            at: Date.now(),
            url: String(scriptURL),
          });
        } catch {}
        return new OrigSharedWorker(scriptURL, opts);
      }
      PatchedSharedWorker.prototype = OrigSharedWorker.prototype;
      window.SharedWorker = PatchedSharedWorker;
    }
  } catch (e) { SENTINEL.workerPatchError = String(e); }

  // ---- 定时采样：检查 window.fetch 身份是否还是我们的 patched 版本 ----
  const sampleFetchIdentity = () => {
    try {
      const cur = window.fetch;
      SENTINEL.fetchIdentityChecks.push({
        at: Date.now(),
        isOurPatched: cur === patchedFetch,
        hasMark: !!(cur && cur.__dd_patched__),
        sourceHead: (() => {
          try { return Function.prototype.toString.call(cur).slice(0, 120); } catch { return '?'; }
        })(),
      });
    } catch {}
  };
  sampleFetchIdentity();
  setTimeout(sampleFetchIdentity, 500);
  setTimeout(sampleFetchIdentity, 2000);
  setTimeout(sampleFetchIdentity, 5000);
  setTimeout(sampleFetchIdentity, 12000);
  setTimeout(sampleFetchIdentity, 20000);

  // ---- PerformanceObserver：观察 fetch/xhr 资源时间，看是否能拿到 completion ----
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry || !entry.name) continue;
        if (/api\/v0\/chat\/(completion|create_pow_challenge)/.test(entry.name) ||
            /completion|stream/.test(entry.name)) {
          SENTINEL.perfEntries.push({
            at: Date.now(),
            name: entry.name,
            entryType: entry.entryType,
            initiatorType: entry.initiatorType,
            duration: entry.duration,
            transferSize: entry.transferSize,
            responseEnd: entry.responseEnd,
          });
        }
      }
    });
    po.observe({ type: 'resource', buffered: true });
  } catch (e) { SENTINEL.perfObserverError = String(e); }

  // ---- 列出已注册的 Service Worker（异步） ----
  try {
    if (navigator.serviceWorker && typeof navigator.serviceWorker.getRegistrations === 'function') {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        SENTINEL.serviceWorkerRegistrations = regs.map((r) => ({
          scope: r.scope,
          active: r.active && { scriptURL: r.active.scriptURL, state: r.active.state },
          installing: r.installing && { scriptURL: r.installing.scriptURL, state: r.installing.state },
          waiting: r.waiting && { scriptURL: r.waiting.scriptURL, state: r.waiting.state },
        }));
      }).catch((e) => { SENTINEL.serviceWorkerError = String(e); });
    }
  } catch (e) { SENTINEL.serviceWorkerError = String(e); }
})();
`;

const networkLog = []; // 浏览器层抓到的请求

async function main() {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: null,
    args: ['--start-maximized'],
  });
  await context.addInitScript({ content: SENTINEL });

  // 监听 service worker 事件
  context.on('serviceworker', (sw) => {
    console.log(`[SW] 检测到 ServiceWorker：url=${sw.url()}`);
    sw.on('close', () => console.log(`[SW] 关闭：${sw.url()}`));
  });

  const page = context.pages()[0] ?? (await context.newPage());

  // 监听所有请求 — 这是 ground truth
  page.on('request', (r) => {
    const url = r.url();
    if (/\.(js|css|png|jpg|svg|woff2?|ico|webp|gif)(\?|$)/.test(url)) return;
    if (/gator\.volces/.test(url)) return;
    let initiatorFrame = null;
    try { initiatorFrame = r.frame()?.url() ?? null; } catch {}
    let isFromServiceWorker = false;
    try {
      const sw = r.serviceWorker?.();
      if (sw) isFromServiceWorker = true;
    } catch {}
    networkLog.push({
      at: Date.now(),
      method: r.method(),
      url,
      resourceType: r.resourceType(),
      frame: initiatorFrame,
      isFromServiceWorker,
    });
  });

  // 监听 worker
  page.on('worker', (w) => {
    console.log(`[Worker] 出现：${w.url()}`);
  });

  // page console 透传
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('DeepDesk') || t.includes('探针')) {
      console.log(`  [page console] ${t}`);
    }
  });

  console.log(`→ 打开 ${TARGET} …`);
  await page.goto(TARGET, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  // 自动发一条消息触发 completion
  console.log('→ 写入并点击发送按钮…');
  const ta = await page.$('textarea');
  if (!ta) {
    console.error('✗ 找不到 textarea，可能未登录。退出');
    await context.close();
    return;
  }
  await ta.click();
  await ta.type('用一句话介绍你自己', { delay: 25 });
  await page.waitForTimeout(500);
  const clickResult = await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    if (!ta) return 'no-textarea';
    let c = ta.parentElement;
    for (let i = 0; i < 6 && c; i++) {
      const btns = c.querySelectorAll('.ds-icon-button, [role=button]');
      if (btns.length) {
        btns[btns.length - 1].click();
        return 'clicked';
      }
      c = c.parentElement;
    }
    return 'no-button';
  });
  console.log('  发送：', clickResult);

  // 等 SSE 流跑完
  await page.waitForTimeout(15000);

  // 收集 sentinel 数据
  const sentinel = await page.evaluate(() => {
    const s = window.__DD_SENTINEL__;
    if (!s) return null;
    return {
      installedAt: s.installedAt,
      fetchCalls: s.fetchCalls,
      xhrCalls: s.xhrCalls,
      esCalls: s.esCalls,
      fetchIdentityChecks: s.fetchIdentityChecks,
      workerCtorCalls: s.workerCtorCalls,
      sharedWorkerCtorCalls: s.sharedWorkerCtorCalls,
      serviceWorkerRegistrations: s.serviceWorkerRegistrations,
      perfEntries: s.perfEntries,
      initialFetchSource: s.initialFetchSource,
      fetchPatchError: s.fetchPatchError,
      xhrPatchError: s.xhrPatchError,
      esPatchError: s.esPatchError,
      workerPatchError: s.workerPatchError,
      perfObserverError: s.perfObserverError,
      serviceWorkerError: s.serviceWorkerError,
    };
  });

  // 收集页面上 service worker 状态（最终态）
  const swStatus = await page.evaluate(async () => {
    if (!navigator.serviceWorker) return { supported: false };
    const regs = await navigator.serviceWorker.getRegistrations();
    return {
      supported: true,
      controller: navigator.serviceWorker.controller && {
        scriptURL: navigator.serviceWorker.controller.scriptURL,
        state: navigator.serviceWorker.controller.state,
      },
      registrations: regs.map((r) => ({
        scope: r.scope,
        active: r.active && { scriptURL: r.active.scriptURL, state: r.active.state },
      })),
    };
  });

  const workers = page.context().backgroundPages?.() || [];
  const pageWorkers = page.workers().map((w) => w.url());
  const ctxSWs = context.serviceWorkers().map((sw) => sw.url());

  // ===== 分析 =====
  const completionRequests = networkLog.filter((r) => r.url.includes('/api/v0/chat/completion'));
  const fetchPatchSawCompletion = (sentinel?.fetchCalls ?? []).filter((c) =>
    c.url.includes('/api/v0/chat/completion'),
  );
  const xhrPatchSawCompletion = (sentinel?.xhrCalls ?? []).filter(
    (c) => c.url && c.url.includes('/api/v0/chat/completion'),
  );

  console.log('\n========== 诊断摘要 ==========');
  console.log(`浏览器层 page.on(request) 抓到的 completion：${completionRequests.length} 条`);
  for (const r of completionRequests) {
    console.log(`  · method=${r.method} resourceType=${r.resourceType} frame=${r.frame} fromSW=${r.isFromServiceWorker}`);
    console.log(`    url=${r.url}`);
  }
  console.log(`\n注入哨兵 fetch patch 抓到的 completion：${fetchPatchSawCompletion.length} 条`);
  for (const c of fetchPatchSawCompletion) console.log(`  · ${c.method} ${c.url} stack=${c.stackHead}`);
  console.log(`\n注入哨兵 xhr patch 抓到的 completion：${xhrPatchSawCompletion.length} 条`);

  console.log(`\nfetch 身份采样（页面是否替换了 window.fetch）：`);
  for (const s of sentinel?.fetchIdentityChecks ?? []) {
    console.log(`  · t+${s.at - sentinel.installedAt}ms isOurPatched=${s.isOurPatched} hasMark=${s.hasMark} src="${s.sourceHead}"`);
  }

  console.log(`\nWorker 构造调用：${(sentinel?.workerCtorCalls ?? []).length} 次`);
  for (const w of sentinel?.workerCtorCalls ?? []) console.log(`  · ${w.url}`);
  console.log(`SharedWorker 构造调用：${(sentinel?.sharedWorkerCtorCalls ?? []).length} 次`);

  console.log(`\nPlaywright page.workers()（运行中 web worker）：${pageWorkers.length}`);
  for (const u of pageWorkers) console.log(`  · ${u}`);

  console.log(`\nPlaywright context.serviceWorkers()：${ctxSWs.length}`);
  for (const u of ctxSWs) console.log(`  · ${u}`);

  console.log(`\nnavigator.serviceWorker 状态：`, JSON.stringify(swStatus, null, 2));

  console.log(`\nPerformanceObserver 抓到的资源条目：${(sentinel?.perfEntries ?? []).length}`);
  for (const e of sentinel?.perfEntries ?? []) {
    console.log(`  · ${e.name} initiatorType=${e.initiatorType} duration=${e.duration?.toFixed?.(0)}ms transferSize=${e.transferSize}`);
  }

  console.log(`\n所有非静态资源请求（${networkLog.length} 条），含 chat/api：`);
  for (const r of networkLog) {
    if (/api\/v0|chat|completion|stream|sse/i.test(r.url)) {
      console.log(`  ${r.method} [${r.resourceType}] ${r.url}`);
    }
  }

  // 写汇总 json
  const summary = {
    target: TARGET,
    completionRequests,
    fetchPatchSawCompletion,
    xhrPatchSawCompletion,
    fetchIdentityChecks: sentinel?.fetchIdentityChecks ?? [],
    workerCtorCalls: sentinel?.workerCtorCalls ?? [],
    sharedWorkerCtorCalls: sentinel?.sharedWorkerCtorCalls ?? [],
    pageWorkers,
    ctxServiceWorkers: ctxSWs,
    navigatorServiceWorker: swStatus,
    perfEntries: sentinel?.perfEntries ?? [],
    fetchPatchError: sentinel?.fetchPatchError,
    xhrPatchError: sentinel?.xhrPatchError,
    initialFetchSource: sentinel?.initialFetchSource?.slice(0, 200),
    networkLogTotal: networkLog.length,
  };
  writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`\n→ 摘要已写入 ${OUT_JSON}`);

  await page.waitForTimeout(2000);
  await context.close();
}

main().catch((e) => {
  console.error('脚本异常：', e);
  process.exit(1);
});
