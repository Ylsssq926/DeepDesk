/**
 * 意图芯片可视化验证（开发用）：注入含芯片的 bundle，截图芯片在真实页面的样子。
 * 复用 .pw-profile 登录态。输出截图到 scripts/.tmp-chips.png。
 * 用法：node scripts/shot-chips.mjs
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const bundle = readFileSync(join(ROOT, 'dist-injected', 'bundle.js'), 'utf8');
const PROFILE_DIR = join(ROOT, '.pw-profile');
const SHOT = join(__dirname, '.tmp-chips.png');

const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
  channel: 'chrome', headless: false, viewport: null, args: ['--start-maximized'],
});
await ctx.addInitScript({ content: bundle });
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto('https://chat.deepseek.com', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);

// 先在输入框写点内容，便于看 wrap 类芯片效果
await page.evaluate(() => {
  const ta = document.querySelector('textarea');
  if (ta) {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ta), 'value')?.set;
    if (setter) setter.call(ta, 'SQLite 和 PostgreSQL 的区别');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
});
await page.waitForTimeout(1500);

// 检查芯片是否挂载（shadow host id 约定）
const chipInfo = await page.evaluate(() => {
  const hosts = Array.from(document.querySelectorAll('[data-deepdesk-host]'))
    .map((h) => h.getAttribute('data-deepdesk-host'));
  return { hosts };
});
console.log('shadow hosts:', JSON.stringify(chipInfo));

await page.screenshot({ path: SHOT, fullPage: false });
console.log('截图已保存:', SHOT);
await page.waitForTimeout(1500);
await ctx.close();
