/**
 * 第二轮诊断：搞清楚 window.fetch 到底被什么时机、什么代码替换了。
 *
 * 思路：
 *   1) 用 Object.defineProperty 给 window.fetch 装 setter，捕获每次"赋值"动作及堆栈。
 *   2) 对比 prototype 链：检查页面是否通过 iframe.contentWindow.fetch 拿到干净 fetch。
 *   3) 验证 XMLHttpRequest.prototype.open / send 是否被页面同样替换；如果稳定，
 *      说明 XHR 路径就是合规拦截的最佳通道。
 *
 * 仅观察，不修改任何请求。
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROFILE_DIR = join(ROOT, '.pw-profile');
const OUT_JSON = join(__dirname, '.tmp-inspect-fetch-survival.json');

const SENTINEL = String.raw`
(() => {
  if (window.__DD_FETCH_SURV__) return;
  const S = {
    installedAt: Date.now(),
    fetchAssignments: [],   // 每次 window.fetch 被赋值
    fetchCalls: [],         // 我们的 patched fetch 实际被调用
    xhrOpenAssignments: [], // XHR.prototype.open 是否被替换
    xhrSendAssignments: [],
    xhrOpenCalls: [],
    iframeFetches: [],
  };
  window.__DD_FETCH_SURV__ = S;

  const origFetch = window.fetch;

  function patchedFetch(input, init) {
    try {
      let url = '';
      if (typeof input === 'string') url = input;
      else if (input instanceof URL) url = input.href;
      else if (input && typeof input === 'object') url = input.url || '';
      S.fetchCalls.push({ at: Date.now(), url });
    } catch {}
    return origFetch.apply(this, arguments);
  }
  Object.defineProperty(patchedFetch, '__dd_id__', { value: 'DD_PATCHED' });

  // 用 defineProperty 装 setter，捕获每次重赋值的堆栈
  let _slot = patchedFetch;
  try {
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      get() { return _slot; },
      set(v) {
        try {
          let id = '?';
          try { id = v && v.__dd_id__ ? v.__dd_id__ : (Function.prototype.toString.call(v) || '').slice(0, 100); } catch {}
          S.fetchAssignments.push({
            at: Date.now(),
            newSrcHead: id,
            stack: (new Error().stack || '').split('\n').slice(0, 8).join('\n'),
          });
        } catch {}
        _slot = v;
      },
    });
  } catch (e) {
    S.defineFetchError = String(e);
  }

  // XHR prototype - 装 setter 捕获 prototype 上 open/send 的替换
  try {
    const proto = XMLHttpRequest.prototype;
    const origOpen = proto.open;
    const origSend = proto.send;

    function ourOpen(method, url) {
      try { S.xhrOpenCalls.push({ at: Date.now(), url: typeof url === 'string' ? url : (url && url.href) || '', method: String(method).toUpperCase() }); } catch {}
      return origOpen.apply(this, arguments);
    }
    Object.defineProperty(ourOpen, '__dd_id__', { value: 'DD_XHR_OPEN' });

    let openSlot = ourOpen;
    Object.defineProperty(proto, 'open', {
      configurable: true,
      get() { return openSlot; },
      set(v) {
        try {
          let id = '?';
          try { id = v && v.__dd_id__ ? v.__dd_id__ : (Function.prototype.toString.call(v) || '').slice(0, 100); } catch {}
          S.xhrOpenAssignments.push({ at: Date.now(), newSrcHead: id, stack: (new Error().stack || '').split('\n').slice(0, 6).join('\n') });
        } catch {}
        openSlot = v;
      },
    });

    let sendSlot = origSend;
    Object.defineProperty(proto, 'send', {
      configurable: true,
      get() { return sendSlot; },
      set(v) {
        try {
          let id = '?';
          try { id = (Function.prototype.toString.call(v) || '').slice(0, 100); } catch {}
          S.xhrSendAssignments.push({ at: Date.now(), newSrcHead: id, stack: (new Error().stack || '').split('\n').slice(0, 6).join('\n') });
        } catch {}
        sendSlot = v;
      },
    });
  } catch (e) { S.defineXhrError = String(e); }

  // 监控是否有 iframe.contentWindow.fetch 被使用（DeepSeek 可能从干净 iframe 取 fetch）
  const observer = new MutationObserver(() => {
    for (const f of document.querySelectorAll('iframe')) {
      try {
        if (f.__dd_seen) continue;
        f.__dd_seen = true;
        S.iframeFetches.push({ at: Date.now(), src: f.src, hasContentWindowFetch: !!(f.contentWindow && f.contentWindow.fetch) });
      } catch (e) {
        S.iframeFetches.push({ at: Date.now(), error: String(e) });
      }
    }
  });
  if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });
})();
`;

async function main() {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: null,
    args: ['--start-maximized'],
  });
  await context.addInitScript({ content: SENTINEL });

  const page = context.pages()[0] ?? (await context.newPage());

  const networkLog = [];
  page.on('request', (r) => {
    const url = r.url();
    if (/\.(js|css|png|jpg|svg|woff2?|ico|webp|gif)(\?|$)/.test(url)) return;
    if (/gator\.volces/.test(url)) return;
    networkLog.push({
      method: r.method(),
      url,
      resourceType: r.resourceType(),
    });
  });

  console.log('→ 打开 https://chat.deepseek.com …');
  await page.goto('https://chat.deepseek.com', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  // 发消息
  const ta = await page.$('textarea');
  if (!ta) {
    console.error('✗ 找不到 textarea');
    await context.close();
    return;
  }
  await ta.click();
  await ta.type('一句话介绍你自己', { delay: 25 });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    let c = ta.parentElement;
    for (let i = 0; i < 6 && c; i++) {
      const btns = c.querySelectorAll('.ds-icon-button, [role=button]');
      if (btns.length) {
        btns[btns.length - 1].click();
        return;
      }
      c = c.parentElement;
    }
  });
  await page.waitForTimeout(15000);

  const data = await page.evaluate(() => window.__DD_FETCH_SURV__);
  const installedAt = data?.installedAt ?? 0;

  console.log('\n========== fetch 替换历史 ==========');
  console.log(`window.fetch 被赋值次数：${data?.fetchAssignments?.length ?? 0}`);
  for (const a of data?.fetchAssignments ?? []) {
    console.log(`  · t+${a.at - installedAt}ms`);
    console.log(`    新值：${a.newSrcHead}`);
    console.log(`    堆栈：\n${a.stack.split('\n').map((l) => '      ' + l).join('\n')}`);
  }

  console.log(`\n我们的 patchedFetch 被调用次数：${data?.fetchCalls?.length ?? 0}`);
  for (const c of data?.fetchCalls ?? []) {
    console.log(`  · ${c.url}`);
  }

  console.log('\n========== XHR.prototype.open 替换历史 ==========');
  console.log(`open 被赋值次数：${data?.xhrOpenAssignments?.length ?? 0}`);
  for (const a of data?.xhrOpenAssignments ?? []) {
    console.log(`  · t+${a.at - installedAt}ms 新值=${a.newSrcHead}`);
    console.log(`    堆栈：\n${a.stack.split('\n').map((l) => '      ' + l).join('\n')}`);
  }
  console.log(`\nsend 被赋值次数：${data?.xhrSendAssignments?.length ?? 0}`);
  for (const a of data?.xhrSendAssignments ?? []) {
    console.log(`  · t+${a.at - installedAt}ms 新值=${a.newSrcHead}`);
  }

  console.log(`\n我们的 ourOpen 被调用次数：${data?.xhrOpenCalls?.length ?? 0}`);
  const completionOpens = (data?.xhrOpenCalls ?? []).filter((c) => c.url.includes('/api/v0/chat/completion'));
  console.log(`  其中 completion：${completionOpens.length}`);
  for (const c of completionOpens) console.log(`    · ${c.method} ${c.url}`);

  console.log('\n========== iframe 监控 ==========');
  console.log(`iframe 数量：${data?.iframeFetches?.length ?? 0}`);
  for (const f of data?.iframeFetches ?? []) {
    console.log(`  · src=${f.src} hasContentWindowFetch=${f.hasContentWindowFetch} err=${f.error || ''}`);
  }

  console.log('\n========== 浏览器层 completion 请求 ==========');
  const completion = networkLog.filter((r) => r.url.includes('/api/v0/chat/completion'));
  for (const r of completion) console.log(`  ${r.method} [${r.resourceType}] ${r.url}`);

  writeFileSync(OUT_JSON, JSON.stringify({ data, networkLog, completion }, null, 2), 'utf8');
  console.log(`\n→ 已写入 ${OUT_JSON}`);

  await page.waitForTimeout(2000);
  await context.close();
}

main().catch((e) => {
  console.error('脚本异常：', e);
  process.exit(1);
});
