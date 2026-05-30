/**
 * 注入能力探针（Probe）。
 *
 * @module src-injected/enhancers/probe
 * @see docs/ARCHITECTURE.md §4.2 注入脚本架构
 *
 * 用途（仅供开发/验证，不是面向用户的功能）：
 *   在动手实现「意图芯片 / 回答导出 / 划词提问」等依赖页面操作的功能之前，
 *   先验证注入脚本到底能不能可靠地操作 chat.deepseek.com 真实登录页面。
 *   本探针把以下五项能力逐一实测并打印结果：
 *     P1 能否定位输入框（多套选择器兜底）
 *     P2 能否在输入框上方插入我们自己的 UI（意图芯片的前提）
 *     P3 能否往输入框写入文字并让页面“感知到”（input 事件 / React 受控组件）
 *     P4 能否定位发送按钮（仅定位，不自动点击）
 *     P5 能否通过 fetch 拦截器捕获到对话请求/响应（导出/存档的前提）
 *
 * 合规约束：
 *   - 全程**只读探测 + 在输入框写入一句测试文字**，绝不自动发送、不点击发送按钮
 *   - 不抓取任何 chat.deepseek.com 业务数据；P5 只统计“是否捕获到响应”，不读正文
 *   - 默认禁用，仅当 URL 含 `?deepdesk-probe=1` 或 localStorage
 *     `__DEEPDESK_PROBE__ === '1'` 时激活，普通用户完全无感
 *   - 通过 Shadow DOM 隔离，不污染宿主页样式
 *
 * 不变量：
 *   - 默认 disabled（feature flag）
 *   - init() 幂等：重复调用不重复插入面板
 *   - dispose() 完整移除面板与已注册的 fetch hook
 */

import type { Enhancer } from '../types/feature';
import { createLogger } from '../utils/logger';
import { registerFlag, setFlag } from '../utils/feature-flag';
import { createShadowHost, getShadowHost } from '../core/shadow-host';
import { onResponse } from '../interceptors/fetch';

const NAME = 'probe' as const;
const SHADOW_ID = 'probe';
const log = createLogger(`enhancer:${NAME}`);
registerFlag(NAME, false);

/** 输入框候选选择器（从新到旧、从精确到宽松）。 */
const INPUT_SELECTORS: readonly string[] = [
  '#chat-input',
  'textarea#chat-input',
  '[data-testid="chat-input"]',
  'textarea[placeholder*="给 DeepSeek"]',
  'textarea[placeholder*="发送消息"]',
  'textarea[placeholder*="Message"]',
  'textarea[placeholder*="Send"]',
  'div[contenteditable="true"]',
  'textarea',
];

/** 发送按钮候选选择器。 */
const SEND_SELECTORS: readonly string[] = [
  '[data-testid="send-button"]',
  'button[aria-label*="发送"]',
  'button[aria-label*="Send"]',
  'div[role="button"][aria-label*="发送"]',
];

/** 对话请求 URL 关键片段（仅用于 fetch hook 的 match，不读正文）。 */
const CHAT_URL_HINTS: readonly string[] = ['completion', 'chat', 'conversation'];

function shouldActivate(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('deepdesk-probe') === '1') return true;
  } catch {
    /* ignore */
  }
  try {
    if (window.localStorage?.getItem('__DEEPDESK_PROBE__') === '1') return true;
  } catch {
    /* ignore */
  }
  return false;
}

// 模块加载即评估：命中则把 flag 翻 true，让 index.ts 的 scheduleEnhancers 正常启动它。
//
// ⚠️ 临时（alpha 验证期）：本探针当前**默认激活**，因为主窗口 URL 写死为
// https://chat.deepseek.com 且 release 版关闭了 devtools，用户没有便捷入口
// 设置 ?deepdesk-probe=1 / localStorage。注入能力验证完成后，应改回
// 「仅 shouldActivate() 命中才激活」并默认禁用。
const PROBE_FORCE_ON = true;
if (PROBE_FORCE_ON || shouldActivate()) {
  setFlag(NAME, true);
}

/** 单项探测结果。 */
interface ProbeResult {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

/** 在所有候选选择器里找第一个命中的元素，返回元素与命中的选择器。 */
function findFirst(
  selectors: readonly string[],
): { el: Element; selector: string } | null {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el) return { el, selector: sel };
    } catch {
      /* 非法选择器跳过 */
    }
  }
  return null;
}

/** 生成一个元素的简短特征描述（用于诊断报告，不读业务文本）。 */
function describeEl(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const aria = el.getAttribute('aria-label') ?? '';
  const testid = el.getAttribute('data-testid') ?? '';
  const type = el.getAttribute('type') ?? '';
  const role = el.getAttribute('role') ?? '';
  const cls = (el.getAttribute('class') ?? '').slice(0, 40);
  const hasSvg = el.querySelector('svg') ? '+svg' : '';
  const parts = [tag];
  if (testid) parts.push(`testid=${testid}`);
  if (aria) parts.push(`aria=${aria}`);
  if (type) parts.push(`type=${type}`);
  if (role) parts.push(`role=${role}`);
  if (cls) parts.push(`class=${cls}`);
  if (hasSvg) parts.push(hasSvg);
  return parts.join(' ');
}

/**
 * 智能定位发送按钮：
 *   1) 先试显式选择器（aria/testid）
 *   2) 退化策略：从输入框向上找最近的、含按钮的容器，列出其中所有 button /
 *      [role=button]，挑「最后一个且含 svg 图标」的作为候选（DeepSeek 的发送键
 *      是输入框右下角的圆形箭头按钮）。
 *   全程把扫描到的所有按钮特征打印到 console，便于据此固化选择器。
 */
function findSendButton(input: Element | null): { el: Element; detail: string } | null {
  const explicit = findFirst(SEND_SELECTORS);
  if (explicit) {
    return { el: explicit.el, detail: `命中选择器：${explicit.selector}` };
  }
  if (!input) return null;

  // 向上最多 6 层找一个同时包含输入框与按钮的容器
  let container: Element | null = input.parentElement;
  let buttons: Element[] = [];
  for (let depth = 0; depth < 6 && container; depth += 1) {
    const found = Array.from(
      container.querySelectorAll('button, [role="button"]'),
    );
    if (found.length > 0) {
      buttons = found;
      break;
    }
    container = container.parentElement;
  }

  // 打印所有候选按钮特征，供固化选择器
  // eslint-disable-next-line no-console
  console.log(
    '%c[DeepDesk 探针] 输入框附近扫描到的按钮：',
    'color:#0a84ff;font-weight:600',
  );
  buttons.forEach((b, i) => {
    // eslint-disable-next-line no-console
    console.log(`  [${i}] ${describeEl(b)}`);
  });

  if (buttons.length === 0) return null;

  // 启发式：优先 type=submit；否则取最后一个含 svg 的按钮
  const submit = buttons.find((b) => b.getAttribute('type') === 'submit');
  const withSvg = [...buttons].reverse().find((b) => b.querySelector('svg'));
  const chosen = submit ?? withSvg ?? buttons[buttons.length - 1]!;
  return { el: chosen, detail: `启发式命中：${describeEl(chosen)}` };
}

/**
 * 往输入框写入文字，并尽量让 React 等受控框架“感知”到变化。
 *
 * chat.deepseek.com 多半是 React 受控 textarea：直接设 value 不会触发
 * onChange。这里用原生 value setter + 派发 input 事件的标准手法。
 */
function writeIntoInput(el: Element, text: string): boolean {
  try {
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      const proto = Object.getPrototypeOf(el);
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      const setter = desc?.set;
      if (setter) {
        setter.call(el, text);
      } else {
        el.value = text;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    if (el instanceof HTMLElement && el.isContentEditable) {
      el.focus();
      el.textContent = text;
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
      return true;
    }
  } catch (err) {
    log.warn('writeIntoInput failed:', err);
  }
  return false;
}

/** 探测状态：记录 fetch hook 是否捕获到对话响应。 */
const state = {
  capturedChatResponse: false,
  lastCapturedUrl: '',
  /** 记录所有观察到的 POST 请求 URL（去重），供诊断显示。 */
  seenPostUrls: new Set<string>(),
  removeHook: null as null | (() => void),
};

function installFetchProbe(): void {
  if (state.removeHook) return;
  // 放宽到「所有 POST 请求」：DeepSeek 的对话接口 URL 命名未知，先全量观察并
  // 打印 URL，据此固化精确匹配。仍然只记录 URL，不读响应正文（合规）。
  state.removeHook = onResponse(
    (req) => req.method === 'POST',
    (req) => {
      state.seenPostUrls.add(req.url);
      const u = req.url.toLowerCase();
      const looksChat = CHAT_URL_HINTS.some((h) => u.includes(h));
      if (looksChat) {
        state.capturedChatResponse = true;
        state.lastCapturedUrl = req.url;
      }
      // eslint-disable-next-line no-console
      console.log(`%c[DeepDesk 探针] 捕获 POST ${looksChat ? '(疑似对话)' : ''}: ${req.url}`,
        'color:#0a84ff');
      log.info(`P5 fetch hook captured POST: ${req.url}`);
    },
  );
}

/** 执行 P1~P4 同步探测（P5 依赖用户发送后异步更新）。 */
function runProbes(): ProbeResult[] {
  const results: ProbeResult[] = [];

  // P1 定位输入框
  const input = findFirst(INPUT_SELECTORS);
  results.push({
    id: 'P1',
    label: '定位输入框',
    ok: !!input,
    detail: input ? `命中：${input.selector}` : '所有候选选择器均未命中',
  });

  // P2：面板本身已经插入到页面（见 mountPanel），插入成功即证明
  results.push({
    id: 'P2',
    label: '在页面插入 UI',
    ok: true,
    detail: '探针面板已通过 Shadow DOM 注入',
  });

  // P3 往输入框写字（不发送）
  if (input) {
    const text = '【DeepDesk 探针测试】这行字是注入脚本自动填入的，未自动发送。';
    const ok = writeIntoInput(input.el, text);
    results.push({
      id: 'P3',
      label: '写入输入框',
      ok,
      detail: ok ? '已填入测试文字（请查看输入框）' : '写入失败',
    });
  } else {
    results.push({ id: 'P3', label: '写入输入框', ok: false, detail: '无输入框，跳过' });
  }

  // P4 定位发送按钮：先试显式选择器，再退化为「从输入框向上找容器内的按钮」。
  const send = findSendButton(input?.el ?? null);
  results.push({
    id: 'P4',
    label: '定位发送按钮',
    ok: !!send,
    detail: send ? send.detail : '未命中（已扫描输入框附近所有按钮，见 console）',
  });

  // P5 当前状态
  const postCount = state.seenPostUrls.size;
  results.push({
    id: 'P5',
    label: '捕获对话响应',
    ok: state.capturedChatResponse,
    detail: state.capturedChatResponse
      ? `已捕获疑似对话：${state.lastCapturedUrl}`
      : postCount > 0
        ? `已捕获 ${postCount} 个 POST（见 console），但未识别出对话接口`
        : '尚未捕获任何 POST（请手动发送一条消息后再点“重新检测”）',
  });

  return results;
}

function renderResults(root: ShadowRoot, results: ProbeResult[]): void {
  const list = root.querySelector('.results');
  if (!list) return;
  list.innerHTML = '';
  for (const r of results) {
    const row = document.createElement('div');
    row.className = 'row';
    const icon = r.ok ? '✅' : '❌';
    row.innerHTML = `<span class="rid">${r.id}</span><span class="ricon">${icon}</span><span class="rlabel">${r.label}</span><span class="rdetail"></span>`;
    const detailEl = row.querySelector('.rdetail');
    if (detailEl) detailEl.textContent = r.detail;
    list.appendChild(row);
  }
  // 同时打印到 console，方便用户复制反馈
  // eslint-disable-next-line no-console
  console.log(
    '%c[DeepDesk 探针] 检测结果',
    'background:#0a84ff;color:#fff;padding:2px 6px;border-radius:3px;font-weight:600',
  );
  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(`${r.ok ? '✅' : '❌'} ${r.id} ${r.label} — ${r.detail}`);
  }
}

const PANEL_STYLE = `
  :host { all: initial; }
  .panel {
    position: fixed;
    right: 16px;
    bottom: 16px;
    width: 320px;
    pointer-events: auto;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    background: #ffffff;
    color: #1a1a1a;
    border: 1px solid #d0d7de;
    border-radius: 12px;
    box-shadow: 0 8px 28px rgba(0,0,0,0.18);
    overflow: hidden;
  }
  @media (prefers-color-scheme: dark) {
    .panel { background: #1c1f24; color: #e6e6e6; border-color: #30363d; }
    .row { border-color: #30363d !important; }
  }
  .hd {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 12px;
    background: linear-gradient(90deg, #1f7fd6, #25b3c0);
    color: #fff; font-weight: 600; font-size: 13px;
  }
  .hd .grow { flex: 1; }
  .hd button {
    all: unset; cursor: pointer; font-size: 12px;
    padding: 2px 8px; border-radius: 6px; background: rgba(255,255,255,0.2);
  }
  .hd button:hover { background: rgba(255,255,255,0.35); }
  .results { padding: 6px 0; max-height: 280px; overflow-y: auto; }
  .row {
    display: grid; grid-template-columns: 28px 22px auto;
    grid-template-areas: "rid ricon rlabel" ". . rdetail";
    column-gap: 4px; align-items: center;
    padding: 6px 12px; font-size: 12px;
    border-top: 1px solid #eaeef2;
  }
  .row:first-child { border-top: none; }
  .rid { grid-area: rid; font-weight: 700; color: #6b7280; }
  .ricon { grid-area: ricon; }
  .rlabel { grid-area: rlabel; font-weight: 500; }
  .rdetail { grid-area: rdetail; color: #6b7280; font-size: 11px; line-height: 1.4; margin-top: 2px; }
  .ft { padding: 8px 12px; display: flex; gap: 8px; border-top: 1px solid #eaeef2; }
  .ft button {
    all: unset; cursor: pointer; flex: 1; text-align: center;
    padding: 6px 0; border-radius: 8px; font-size: 12px; font-weight: 600;
  }
  .ft .recheck { background: #1f7fd6; color: #fff; }
  .ft .recheck:hover { background: #1a6fbe; }
`;

function buildPanel(root: ShadowRoot): void {
  const style = document.createElement('style');
  style.textContent = PANEL_STYLE;
  root.appendChild(style);

  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.innerHTML = `
    <div class="hd">
      <span>🔬 DeepDesk 注入探针</span>
      <span class="grow"></span>
      <button class="close" type="button">×</button>
    </div>
    <div class="results"></div>
    <div class="ft">
      <button class="recheck" type="button">重新检测</button>
    </div>
  `;
  root.appendChild(panel);

  const recheck = panel.querySelector('.recheck');
  recheck?.addEventListener('click', () => renderResults(root, runProbes()));

  const close = panel.querySelector('.close');
  close?.addEventListener('click', () => {
    const handle = getShadowHost(SHADOW_ID);
    handle?.dispose();
  });
}

export const probeEnhancer: Enhancer = {
  name: NAME,
  when: 'load',
  defaultEnabled: false,
  init() {
    if (!document.body) {
      log.warn('document.body missing; skip mount');
      return;
    }
    // 先装 fetch 探针（P5），越早越能捕获后续对话请求。
    installFetchProbe();

    if (getShadowHost(SHADOW_ID)) {
      log.debug('probe panel already exists; skip remount');
      return;
    }
    const handle = createShadowHost(SHADOW_ID, 'open');
    handle.host.style.pointerEvents = 'none';
    buildPanel(handle.root);

    // 首次延迟一拍再跑，给页面 React 充分挂载时间。
    setTimeout(() => renderResults(handle.root, runProbes()), 800);
    log.info('probe panel mounted');
  },
  dispose() {
    if (state.removeHook) {
      state.removeHook();
      state.removeHook = null;
    }
    const handle = getShadowHost(SHADOW_ID);
    if (handle) handle.dispose();
  },
};
