import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILE_DIR = join(__dirname, '..', '.pw-profile');
const ctx = await chromium.launchPersistentContext(PROFILE_DIR, { channel: 'chrome', headless: false, viewport: null, args: ['--start-maximized'] });
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto('https://chat.deepseek.com', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
// 点"深度思考"开关
const toggled = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('.ds-toggle-button, [role="button"]'));
  const t = btns.find((b) => (b.textContent||'').includes('深度思考'));
  if (t) { t.click(); return 'toggled'; }
  return 'no-toggle';
});
console.log('深度思考开关:', toggled);
await page.waitForTimeout(800);
await page.evaluate(() => {
  const ta = document.querySelector('textarea');
  if (ta) {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ta), 'value')?.set;
    setter?.call(ta, '17乘以23等于多少');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
});
await page.waitForTimeout(500);
await page.evaluate(() => {
  const ta = document.querySelector('textarea');
  let c = ta?.parentElement;
  for (let i = 0; i < 6 && c; i++) {
    const btns = c.querySelectorAll('.ds-icon-button, [role="button"]');
    if (btns.length) { btns[btns.length-1].click(); break; }
    c = c.parentElement;
  }
});
console.log('已发送，等思考块…');
await page.waitForTimeout(14000);
const info = await page.evaluate(() => {
  const out = { thinkClass: [], byText: [] };
  document.querySelectorAll('[class*="think"],[class*="reason"],[class*="Think"],[class*="cot"]').forEach((el) => {
    out.thinkClass.push((el.getAttribute('class')||'').slice(0,90));
  });
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let n;
  while ((n = walker.nextNode())) {
    const t = (n.textContent||'').trim();
    if (/^已(深度)?思考[（(]/.test(t) && t.length < 25) {
      out.byText.push({
        text: t.slice(0,15),
        self: (n.getAttribute('class')||'').slice(0,90),
        parent: (n.parentElement?.getAttribute('class')||'').slice(0,90),
        grand: (n.parentElement?.parentElement?.getAttribute('class')||'').slice(0,90),
      });
    }
  }
  return out;
});
console.log(JSON.stringify(info, null, 2));
await page.waitForTimeout(1500);
await ctx.close();
