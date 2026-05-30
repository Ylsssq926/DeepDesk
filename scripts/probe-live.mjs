/**
 * DeepDesk 注入能力 · 实时自动化诊断脚本
 *
 * 用 Playwright 启动你系统已安装的 Chrome（channel: 'chrome'），用一个持久化
 * profile 目录保存 DeepSeek 登录态，把构建好的注入 bundle（dist-injected/bundle.js）
 * 通过 addInitScript 注入到 chat.deepseek.com（模拟 Tauri 的 initialization_script，
 * 在页面 JS 之前执行），然后自动读取探针写到 window.__DEEPDESK_PROBE_RESULT__ 的
 * 诊断报告并打印。
 *
 * 用法：
 *   首次（需扫码登录一次，登录态会存到 .pw-profile/）：
 *     node scripts/probe-live.mjs --login
 *   之后（已登录，自动诊断 + 自动发一条测试消息）：
 *     node scripts/probe-live.mjs
 *
 * 说明：
 *   - 仅本地开发诊断用，不进安装包、不影响最终用户。
 *   - 复用系统 Chrome；登录态隔离在项目下的 .pw-profile/（已 gitignore）。
 *   - --login 模式会停在页面等你扫码，登录后回车继续。
 */

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BUNDLE = join(ROOT, 'dist-injected', 'bundle.js');
const PROFILE_DIR = join(ROOT, '.pw-profile');
const TARGET = 'https://chat.deepseek.com';

const loginMode = process.argv.includes('--login');
const sendTest = !process.argv.includes('--no-send');

async function main() {
  let bundle;
  try {
    bundle = readFileSync(BUNDLE, 'utf8');
  } catch {
    console.error(`✗ 找不到注入 bundle：${BUNDLE}\n  请先运行：npm run build:inject`);
    process.exit(1);
  }
  console.log(`✓ 已读取注入 bundle（${bundle.length} 字节）`);

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: null,
    args: ['--start-maximized'],
  });

  // 在页面任何脚本之前注入 bundle（等价于 Tauri initialization_script）
  await context.addInitScript({ content: bundle });

  const page = context.pages()[0] ?? (await context.newPage());

  // 把页面 console 透传到终端，方便看探针日志
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('DeepDesk') || t.includes('探针') || t.includes('注入')) {
      console.log(`  [page] ${t}`);
    }
  });

  console.log(`→ 打开 ${TARGET} …`);
  await page.goto(TARGET, { waitUntil: 'domcontentloaded' });

  if (loginMode) {
    console.log('\n⚠️  登录模式：请在打开的 Chrome 窗口中扫码/登录 DeepSeek。');
    console.log('   脚本会自动检测登录状态（每 3 秒轮询，最多等 5 分钟）…');
    const deadline = Date.now() + 5 * 60 * 1000;
    let loggedIn = false;
    while (Date.now() < deadline) {
      // 登录成功的标志：出现可输入的对话框 textarea
      const hasInput = await page.evaluate(() => !!document.querySelector('textarea'));
      if (hasInput) {
        loggedIn = true;
        break;
      }
      await page.waitForTimeout(3000);
    }
    if (loggedIn) {
      console.log('   ✓ 检测到已登录（出现输入框），继续诊断。');
    } else {
      console.log('   ⚠️ 等待超时仍未检测到输入框，仍继续尝试诊断。');
    }
  }

  // 给 SPA 与探针留出渲染时间
  await page.waitForTimeout(2500);

  if (sendTest) {
    console.log('→ 自动发送测试消息（写入 + 点击真实发送按钮）…');
    try {
      const sent = await page.evaluate(() => {
        const ta = document.querySelector('textarea');
        if (!ta) return 'no-textarea';
        // 写入（触发 React onChange）
        const setter = Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(ta),
          'value',
        )?.set;
        if (setter) setter.call(ta, '你好（DeepDesk自动测试）');
        else ta.value = '你好（DeepDesk自动测试）';
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        return 'filled';
      });
      console.log(`  写入：${sent}`);
      await page.waitForTimeout(500);
      // 点真实发送按钮（实测 Enter 不可靠，必须点按钮）：输入框右侧最后一个 ds-icon-button
      const clicked = await page.evaluate(() => {
        const ta = document.querySelector('textarea');
        if (!ta) return 'no-textarea';
        let c = ta.parentElement;
        for (let i = 0; i < 6 && c; i += 1) {
          const btns = c.querySelectorAll('.ds-icon-button, [role="button"]');
          if (btns.length) {
            const last = btns[btns.length - 1];
            last.click();
            return 'clicked';
          }
          c = c.parentElement;
        }
        return 'no-button';
      });
      console.log(`  点击发送：${clicked}，等待对话流与网络捕获…`);
      await page.waitForTimeout(10000);
    } catch (e) {
      console.log(`  自动发送失败（不影响诊断）：${e.message}`);
    }
  }

  // 主动触发探针重新诊断（捕获发消息后的 DOM 与网络），并读取最新结果
  const result = await page.evaluate(() => {
    const run = window.__DEEPDESK_PROBE_RUN__;
    if (typeof run === 'function') return run();
    return window.__DEEPDESK_PROBE_RESULT__ ?? null;
  });

  console.log('\n========== 诊断结果 ==========');
  if (!result) {
    console.log('✗ 未读取到探针结果（window.__DEEPDESK_PROBE_RUN__/RESULT 均为空）。');
    console.log('  可能：bundle 未注入 / 探针未运行 / 页面未到目标域名。');
  } else {
    console.log(result.report);
    // 单独打印网络明细（最关键：要从中找出对话接口）
    if (Array.isArray(result.net) && result.net.length > 0) {
      console.log('\n--- 网络请求明细（含通道/方法/URL）---');
      for (const h of result.net) {
        console.log(`[${h.channel}] ${h.method} ${h.url}`);
      }
    }
  }
  console.log('==============================\n');

  console.log('诊断完成。浏览器将保持打开 30 秒供查看，然后自动关闭…');
  await page.waitForTimeout(30000);
  await context.close();
}

main().catch((e) => {
  console.error('脚本异常：', e);
  process.exit(1);
});
