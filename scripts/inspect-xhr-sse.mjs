/**
 * 第三轮诊断：验证 XHR 路径能否在不修改请求的前提下，观察到 completion SSE 流的正文。
 *
 * 思路：
 *   1) addInitScript 装一个 XHR.prototype.open / send 包装，仅观察。
 *   2) 拿到 completion XHR 后，挂上 'progress' / 'readystatechange' / 'loadend' 监听，
 *      读取 xhr.responseText 的增量（不修改 responseText 内容）。
 *   3) 记录每次增量的长度变化与最终长度，证明正文可被拦截器读取。
 *
 * 合规：仅读不写。绝不重写 onreadystatechange / responseText。
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILE_DIR = join(__dirname, '..', '.pw-profile');
const OUT_JSON = join(__dirname, '.tmp-inspect-xhr-sse.json');

const SENTINEL = String.raw`
(() => {
  if (window.__DD_XHR_SSE__) return;
  const S = {
    completionTimeline: [],   // { phase, at, len, snippet }
    completionFinal: null,
  };
  window.__DD_XHR_SSE__ = S;

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    try {
      this.__dd_url = typeof url === 'string' ? url : (url && url.href) || '';
      this.__dd_method = String(method || 'GET').toUpperCase();
    } catch {}
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function() {
    try {
      const url = this.__dd_url || '';
      if (url.includes('/api/v0/chat/completion')) {
        const t0 = Date.now();
        const tag = (phase) => {
          let len = 0;
          let snippet = '';
          try {
            // 注意：SSE / 流式 XHR 必须 responseType='' 或 'text' 才能在 progress 中读 responseText
            // 这里只读，不改
            len = (this.responseText || '').length;
            snippet = (this.responseText || '').slice(-120);
          } catch (e) {
            snippet = 'READ_ERR:' + String(e);
          }
          S.completionTimeline.push({ phase, at: Date.now() - t0, readyState: this.readyState, len, snippet });
        };
        this.addEventListener('readystatechange', () => tag('rs:' + this.readyState));
        this.addEventListener('progress', () => tag('progress'));
        this.addEventListener('loadend', () => {
          tag('loadend');
          try {
            S.completionFinal = {
              status: this.status,
              len: (this.responseText || '').length,
              head: (this.responseText || '').slice(0, 400),
              tail: (this.responseText || '').slice(-400),
              contentType: this.getResponseHeader && this.getResponseHeader('content-type'),
              responseType: this.responseType,
            };
          } catch {}
        });
      }
    } catch {}
    return origSend.apply(this, arguments);
  };
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

  console.log('→ 打开 https://chat.deepseek.com …');
  await page.goto('https://chat.deepseek.com', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  const ta = await page.$('textarea');
  if (!ta) {
    console.error('✗ textarea 未找到');
    await context.close();
    return;
  }
  await ta.click();
  await ta.type('用一句话介绍你自己', { delay: 25 });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    let c = ta.parentElement;
    for (let i = 0; i < 6 && c; i++) {
      const btns = c.querySelectorAll('.ds-icon-button, [role=button]');
      if (btns.length) { btns[btns.length - 1].click(); return; }
      c = c.parentElement;
    }
  });

  // 等流式输出完成
  await page.waitForTimeout(20000);

  const data = await page.evaluate(() => window.__DD_XHR_SSE__);

  console.log('\n========== completion XHR 时间线（仅观察 responseText 长度增长） ==========');
  console.log(`时间线条目数：${data?.completionTimeline?.length ?? 0}`);
  // 抽样打印：每个 phase 的第一次和最后一次
  const tl = data?.completionTimeline ?? [];
  const phases = {};
  for (const e of tl) {
    if (!phases[e.phase]) phases[e.phase] = { first: e, last: e, count: 0 };
    phases[e.phase].last = e;
    phases[e.phase].count++;
  }
  for (const [p, info] of Object.entries(phases)) {
    console.log(`  phase=${p} 出现${info.count}次  首条 t+${info.first.at}ms len=${info.first.len}  末条 t+${info.last.at}ms len=${info.last.len}`);
  }

  // 抽样 progress 增长
  const progressEntries = tl.filter((e) => e.phase === 'progress');
  if (progressEntries.length > 0) {
    console.log('\n--- progress 事件增长样本（前 5 条 + 后 3 条） ---');
    for (const e of progressEntries.slice(0, 5)) console.log(`  t+${e.at}ms len=${e.len}  tail="${e.snippet.replace(/\n/g, '\\n').slice(-80)}"`);
    if (progressEntries.length > 5) console.log('  ...');
    for (const e of progressEntries.slice(-3)) console.log(`  t+${e.at}ms len=${e.len}  tail="${e.snippet.replace(/\n/g, '\\n').slice(-80)}"`);
  }

  console.log('\n========== completion 最终结果 ==========');
  if (data?.completionFinal) {
    const f = data.completionFinal;
    console.log(`  status=${f.status}`);
    console.log(`  content-type=${f.contentType}`);
    console.log(`  responseType="${f.responseType}"`);
    console.log(`  最终 responseText 长度=${f.len}`);
    console.log(`  head 400 字符:\n----\n${f.head}\n----`);
    console.log(`  tail 400 字符:\n----\n${f.tail}\n----`);
  } else {
    console.log('  ✗ 未拿到 completion 终态——可能未触发请求或哨兵失效');
  }

  writeFileSync(OUT_JSON, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n→ 已写入 ${OUT_JSON}`);

  await page.waitForTimeout(2000);
  await context.close();
}

main().catch((e) => {
  console.error('脚本异常：', e);
  process.exit(1);
});
