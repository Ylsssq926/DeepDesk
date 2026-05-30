import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILE_DIR = join(__dirname, '..', '.pw-profile');
const context = await chromium.launchPersistentContext(PROFILE_DIR, { channel: 'chrome', headless: false, viewport: null, args: ['--start-maximized'] });
const page = context.pages()[0] ?? (await context.newPage());
const reqs = [];
page.on('request', (r) => {
  const u = r.url();
  if (/\.(js|css|png|jpg|svg|woff2?|ico|webp)(\?|$)/.test(u)) return;
  if (/gator\.volces|\.gif/.test(u)) return;
  reqs.push(`${r.method()} ${u}`);
});
await page.goto('https://chat.deepseek.com', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
console.log('→ 输入并点真实发送按钮…');
const ta = await page.$('textarea');
await ta.click();
await ta.type('用一句话介绍你自己', { delay: 25 });
await page.waitForTimeout(600);
// 点输入框右侧最后一个 ds-icon-button（真实发送键）
const clicked = await page.evaluate(() => {
  const ta = document.querySelector('textarea');
  if (!ta) return 'no-textarea';
  let c = ta.parentElement;
  for (let i = 0; i < 6 && c; i++) {
    const btns = c.querySelectorAll('.ds-icon-button, [role=button]');
    if (btns.length) {
      const last = btns[btns.length - 1];
      last.click();
      return 'clicked:' + (last.getAttribute('class')||'').slice(0,40);
    }
    c = c.parentElement;
  }
  return 'no-button';
});
console.log('  发送结果:', clicked);
await page.waitForTimeout(9000);
const uniq = [...new Set(reqs)];
console.log('\n=== 发送后捕获的网络请求 ===');
uniq.forEach((r) => console.log(r));
console.log('\n=== 候选对话接口 ===');
uniq.filter((r) => /chat|completion|stream|message|generate|sse|api\/v0/i.test(r)).forEach((r) => console.log('  ★ ' + r));
await page.waitForTimeout(1500);
await context.close();
