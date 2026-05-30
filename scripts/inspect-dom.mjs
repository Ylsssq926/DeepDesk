/**
 * 一次性 DOM/网络 深度探查（开发调试用，不进产物）。
 *
 * 不依赖注入 bundle 的预设选择器，而是直接 dump chat.deepseek.com 的真实结构：
 *   - 自动发一条消息，监听 page.on('request') 抓全部网络请求（找对话接口）
 *   - dump 输入框、发送按钮、消息容器、回答块的真实 DOM 路径与 class
 * 复用 .pw-profile 登录态。
 *
 * 用法：node scripts/inspect-dom.mjs
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROFILE_DIR = join(ROOT, '.pw-profile');
const TARGET = 'https://chat.deepseek.com';

async function main() {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: null,
    args: ['--start-maximized'],
  });
  const page = context.pages()[0] ?? (await context.newPage());

  // 监听所有网络请求（在浏览器网络层，绝不会漏，含 fetch/xhr/eventsource/ws）
  const reqs = [];
  page.on('request', (r) => {
    const u = r.url();
    // 过滤静态资源噪声
    if (/\.(js|css|png|jpg|svg|woff2?|ico|webp)(\?|$)/.test(u)) return;
    reqs.push(`${r.method()} ${u}`);
  });

  console.log(`→ 打开 ${TARGET}`);
  await page.goto(TARGET, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // 自动发消息
  console.log('→ 自动发送测试消息…');
  try {
    const input = await page.$('textarea');
    if (input) {
      await input.click();
      await input.type('用一句话介绍你自己', { delay: 20 });
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      console.log('  已按 Enter，等待对话流…');
      await page.waitForTimeout(8000);
    } else {
      console.log('  ✗ 未找到 textarea');
    }
  } catch (e) {
    console.log(`  发送异常：${e.message}`);
  }

  // dump 真实 DOM 结构
  const dom = await page.evaluate(() => {
    const out = {};
    const cssPath = (el) => {
      if (!el) return '(null)';
      const parts = [];
      let cur = el;
      for (let i = 0; i < 5 && cur && cur.nodeType === 1; i += 1) {
        let s = cur.tagName.toLowerCase();
        if (cur.id) s += `#${cur.id}`;
        const cls = (cur.getAttribute('class') || '').trim().split(/\s+/).slice(0, 3).join('.');
        if (cls) s += `.${cls}`;
        parts.unshift(s);
        cur = cur.parentElement;
      }
      return parts.join(' > ');
    };

    // 输入框
    const ta = document.querySelector('textarea');
    out.input = ta ? { path: cssPath(ta), placeholder: ta.getAttribute('placeholder') } : null;

    // 输入框祖先里的所有按钮（找发送键）
    out.buttonsNearInput = [];
    if (ta) {
      let c = ta.parentElement;
      for (let i = 0; i < 6 && c; i += 1) {
        const btns = c.querySelectorAll('button,[role="button"]');
        if (btns.length) {
          btns.forEach((b) =>
            out.buttonsNearInput.push({
              path: cssPath(b),
              aria: b.getAttribute('aria-label') || '',
              hasSvg: !!b.querySelector('svg'),
            }),
          );
          break;
        }
        c = c.parentElement;
      }
    }

    // AI 回答块（markdown）及其祖先链——找消息容器
    const md = document.querySelector('[class*="markdown"]');
    out.aiAnswer = md ? { path: cssPath(md) } : null;
    if (md) {
      // 向上找重复结构的容器：列出 markdown 往上 8 层的 class
      const chain = [];
      let c = md;
      for (let i = 0; i < 8 && c; i += 1) {
        chain.push({
          tag: c.tagName.toLowerCase(),
          cls: (c.getAttribute('class') || '').slice(0, 60),
          childCount: c.children.length,
        });
        c = c.parentElement;
      }
      out.aiAnswerAncestors = chain;
    }

    // 所有消息气泡候选：找页面上重复出现的、含文本的块
    out.dsClassSample = Array.from(document.querySelectorAll('[class*="_"]'))
      .slice(0, 0); // 占位，避免太多

    return out;
  });

  console.log('\n========== DOM 结构 ==========');
  console.log(JSON.stringify(dom, null, 2));
  console.log('\n========== 网络请求（非静态资源）==========');
  // 去重
  const uniq = [...new Set(reqs)];
  uniq.forEach((r) => console.log(r));
  console.log('\n候选对话接口（含 chat/completion/api 关键词）：');
  uniq
    .filter((r) => /chat|completion|api|stream|message|generate/i.test(r))
    .forEach((r) => console.log('  ★ ' + r));
  console.log('==============================\n');

  await page.waitForTimeout(2000);
  await context.close();
}

main().catch((e) => {
  console.error('异常：', e);
  process.exit(1);
});
