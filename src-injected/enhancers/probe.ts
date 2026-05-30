/**
 * 注入能力探针（Probe）—— 一次性完整诊断工具。
 *
 * @module src-injected/enhancers/probe
 * @see docs/ARCHITECTURE.md §4.2 注入脚本架构
 *
 * 用途（仅供开发/验证，不是面向用户的功能）：
 *   在实现「意图芯片 / 回答导出 / 划词提问 / 本地存档」等依赖页面操作的功能
 *   之前，一次性验证注入脚本对 chat.deepseek.com 真实登录页面的全部关键能力，
 *   并产出一份可一键复制的诊断报告，避免反复返工式人工测试。
 *
 * 诊断维度：
 *   【DOM 锚点】定位后续功能所需的全部锚点：
 *     - 输入框（写入提问 / 意图芯片宿主）
 *     - 发送按钮（自动发送）
 *     - 消息列表容器（回答区叠加 UI）
 *     - 单条消息（消息定位）
 *     - AI 回答块（导出 / 转文件 / 追问芯片）
 *     - 代码块（代码落地）
 *     - 思考链块（折叠 / 导出）
 *   【交互能力】
 *     - 在页面插入 Shadow DOM UI（意图芯片 / 浮层前提）
 *     - 写入输入框并被框架感知（仅在用户点"写入测试"按钮时执行，3 秒后自动清空）
 *     - 自动发送测试（写入 + 点击发送按钮）
 *   【网络侦察】同时观察三种通道，记录 URL（绝不读响应正文）：
 *     - fetch
 *     - XMLHttpRequest
 *     - EventSource（SSE 标准通道，DeepSeek 对话很可能走这里）
 *
 * 合规约束：
 *   - 全程**只读探测 / 定位**；写入输入框仅在用户显式点击"写入测试"时发生，且不发送
 *   - 网络侦察只记录请求 URL 与方法，**绝不读取或转存响应正文**
 *   - PoW 相关接口绝不碰（不读、不改、不绕过），命中时显式标注并跳过
 *   - 默认禁用；仅 alpha 验证期强制开启（见 PROBE_FORCE_ON）
 *   - 通过 Shadow DOM 隔离，不污染宿主页样式
 *
 * 不变量：
 *   - init() 幂等：重复调用不重复插入面板 / 不重复 patch 网络
 *   - dispose() 完整移除面板、还原网络 patch
 */

import type { Enhancer } from '../types/feature';
import { createLogger } from '../utils/logger';
import { registerFlag, setFlag } from '../utils/feature-flag';
import { createShadowHost, getShadowHost } from '../core/shadow-host';
import { findFirst } from '../core/selectors';
import type { SelectorName } from '../core/selectors';
import { isChatCompletion, isPowForbidden } from '../core/endpoints';

const NAME = 'probe' as const;
const SHADOW_ID = 'probe';
const log = createLogger(`enhancer:${NAME}`);
registerFlag(NAME, false);

// ⚠️ alpha 验证期强制开启（主窗口 URL 写死、release 关 devtools，用户无入口设置
// ?deepdesk-probe=1）。注入能力验证完成后改回默认禁用 + 仅 shouldActivate。
const PROBE_FORCE_ON = true;

// ====================================================================
// DOM 锚点定义：复用 core/selectors.ts 的语义名
// ====================================================================

interface AnchorSpec {
  name: SelectorName;
  label: string;
  /** 是否为后续功能的"必需"锚点（影响报告里的严重度标记）。 */
  required: boolean;
}

const ANCHORS: readonly AnchorSpec[] = [
  { name: 'chatInput', label: '输入框', required: true },
  { name: 'messageList', label: '消息列表容器', required: true },
  { name: 'messageItem', label: '单条消息', required: false },
  { name: 'answerContent', label: 'AI 回答正文', required: true },
  { name: 'sendButton', label: '发送按钮', required: true },
  { name: 'codeBlock', label: '代码块', required: false },
  { name: 'thinkingBlock', label: '思考链块', required: false },
];

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

if (PROBE_FORCE_ON || shouldActivate()) {
  setFlag(NAME, true);
}

// ====================================================================
// 网络侦察：fetch + XHR + EventSource，仅记录 URL/method，不读正文
// ====================================================================

interface NetHit {
  channel: 'fetch' | 'xhr' | 'eventsource';
  method: string;
  url: string;
  at: number;
  /** 是否为对话主接口。 */
  isChat: boolean;
}

const net = {
  hits: [] as NetHit[],
  installed: false,
  /** 还原各通道 patch 的句柄。 */
  restorers: [] as (() => void)[],
};

function record(channel: NetHit['channel'], method: string, url: string): void {
  // ⛔ PoW 红线：绝不记录任何细节
  if (isPowForbidden(url)) {
    // eslint-disable-next-line no-console
    console.log(
      '%c[DeepDesk 探针] ⛔已跳过(PoW红线)',
      'color:#ef4444',
    );
    return;
  }

  // 去重：同 channel+url 只记一次，避免轮询刷屏
  if (net.hits.some((h) => h.channel === channel && h.url === url)) return;

  const isChat = isChatCompletion(url);
  net.hits.push({ channel, method: method.toUpperCase(), url, at: Date.now(), isChat });
  // eslint-disable-next-line no-console
  console.log(
    `%c[DeepDesk 探针] ${channel} ${method} ${isChat ? '(对话接口) ' : ''}${url}`,
    'color:#0a84ff',
  );
}

function installNetworkRecon(): void {
  if (net.installed) return;
  net.installed = true;

  // --- fetch ---
  try {
    const origFetch = window.fetch.bind(window);
    const patched: typeof window.fetch = (input, init) => {
      try {
        let url = '';
        let method = 'GET';
        if (typeof input === 'string') url = input;
        else if (input instanceof URL) url = input.href;
        else if (input instanceof Request) {
          url = input.url;
          method = input.method;
        }
        if (init?.method) method = init.method;
        if (url) record('fetch', method, url);
      } catch {
        /* 记录失败不影响真实请求 */
      }
      return origFetch(input, init);
    };
    window.fetch = patched;
    net.restorers.push(() => {
      window.fetch = origFetch;
    });
  } catch (err) {
    log.warn('patch fetch failed:', err);
  }

  // --- XMLHttpRequest ---
  try {
    const OrigOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function patchedOpen(
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      ...rest: unknown[]
    ) {
      try {
        record('xhr', method, typeof url === 'string' ? url : url.href);
      } catch {
        /* ignore */
      }
      return (OrigOpen as (...a: unknown[]) => void).call(this, method, url, ...rest);
    } as typeof XMLHttpRequest.prototype.open;
    net.restorers.push(() => {
      XMLHttpRequest.prototype.open = OrigOpen;
    });
  } catch (err) {
    log.warn('patch XHR failed:', err);
  }

  // --- EventSource（SSE）---
  try {
    if (typeof window.EventSource === 'function') {
      const OrigES = window.EventSource;
      const PatchedES = function (this: unknown, url: string | URL, init?: EventSourceInit) {
        try {
          record('eventsource', 'GET', typeof url === 'string' ? url : url.href);
        } catch {
          /* ignore */
        }
        return new OrigES(url as string, init);
      } as unknown as { prototype: unknown };
      // 继承原型链；CONNECTING/OPEN/CLOSED 是只读静态常量，无需（也不能）复制。
      PatchedES.prototype = OrigES.prototype;
      window.EventSource = PatchedES as unknown as typeof EventSource;
      net.restorers.push(() => {
        window.EventSource = OrigES;
      });
    }
  } catch (err) {
    log.warn('patch EventSource failed:', err);
  }

  log.info('network recon installed (fetch + xhr + eventsource)');
}

// ====================================================================
// DOM 工具
// ====================================================================

function describeEl(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const aria = el.getAttribute('aria-label') ?? '';
  const testid = el.getAttribute('data-testid') ?? '';
  const type = el.getAttribute('type') ?? '';
  const role = el.getAttribute('role') ?? '';
  const cls = (el.getAttribute('class') ?? '').slice(0, 48);
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

function writeIntoInput(el: Element, text: string): boolean {
  try {
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      const proto = Object.getPrototypeOf(el);
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, text);
      else el.value = text;
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

// ====================================================================
// 诊断执行 & 报告
// ====================================================================

interface CheckRow {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

function runDiagnostics(): { rows: CheckRow[]; report: string } {
  const rows: CheckRow[] = [];

  // 注入自身
  rows.push({
    id: 'INJECT',
    label: '注入运行',
    ok: true,
    detail: `bundle 已运行 · v${(window.__DEEPSEEK_DESKTOP__?.version ?? '?')}`,
  });

  // UI 注入能力
  rows.push({
    id: 'UI',
    label: '插入 Shadow DOM UI',
    ok: true,
    detail: '探针面板即证明',
  });

  // DOM 锚点（复用 core/selectors.ts）
  for (const spec of ANCHORS) {
    const el = findFirst(spec.name);
    rows.push({
      id: spec.name,
      label: spec.label,
      ok: !!el,
      detail: el
        ? `命中：${spec.name} → ${describeEl(el)}`
        : spec.required
          ? '未命中（必需锚点）'
          : '未命中（当前页可能无此元素）',
    });
  }

  // 网络侦察汇总
  const chatHits = net.hits.filter((h) => h.isChat);
  rows.push({
    id: 'net',
    label: '网络侦察',
    ok: net.hits.length > 0,
    detail:
      net.hits.length === 0
        ? '尚未观察到任何请求（发一条消息后点"重新检测"）'
        : `共 ${net.hits.length} 条 · 对话接口 ${chatHits.length} 条 · 通道 ${
            [...new Set(net.hits.map((h) => h.channel))].join('/')
          }`,
  });

  // 生成可复制的完整报告
  const lines: string[] = [];
  lines.push('===== DeepDesk 注入诊断报告 =====');
  lines.push(`时间：${new Date().toLocaleString()}`);
  lines.push(`页面：${location.href}`);
  lines.push(`UA：${navigator.userAgent}`);
  lines.push('');
  lines.push('— 检测项 —');
  for (const r of rows) {
    lines.push(`${r.ok ? '[OK]' : '[--]'} ${r.id} ${r.label}：${r.detail}`);
  }
  lines.push('');
  lines.push(`— 网络请求明细（${net.hits.length} 条，仅 URL）—`);
  if (net.hits.length === 0) {
    lines.push('（无。请发一条消息后再点"重新检测"）');
  } else {
    for (const h of net.hits) {
      lines.push(`${h.isChat ? '★' : ' '} [${h.channel}] ${h.method} ${h.url}`);
    }
  }
  lines.push('================================');
  const report = lines.join('\n');

  // eslint-disable-next-line no-console
  console.log(report);

  // 暴露给自动化测试脚本（Playwright）直接读取，免去人工截图。
  try {
    (window as unknown as { __DEEPDESK_PROBE_RESULT__?: unknown }).__DEEPDESK_PROBE_RESULT__ = {
      at: Date.now(),
      rows,
      report,
      net: net.hits.slice(),
    };
  } catch {
    /* ignore */
  }

  return { rows, report };
}

// ====================================================================
// 面板 UI
// ====================================================================

let lastReport = '';

const PANEL_STYLE = `
  :host { all: initial; }
  .panel {
    position: fixed; right: 16px; bottom: 16px; width: 360px;
    pointer-events: auto; z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    background: #fff; color: #1a1a1a; border: 1px solid #d0d7de;
    border-radius: 12px; box-shadow: 0 8px 28px rgba(0,0,0,0.18); overflow: hidden;
  }
  @media (prefers-color-scheme: dark) {
    .panel { background:#1c1f24; color:#e6e6e6; border-color:#30363d; }
    .row { border-color:#30363d !important; }
  }
  .hd { display:flex; align-items:center; gap:8px; padding:10px 12px;
    background:linear-gradient(90deg,#1f7fd6,#25b3c0); color:#fff; font-weight:600; font-size:13px; }
  .hd .grow { flex:1; }
  .hd button { all:unset; cursor:pointer; font-size:14px; padding:2px 8px; border-radius:6px; background:rgba(255,255,255,0.2); }
  .results { padding:6px 0; max-height:300px; overflow-y:auto; }
  .row { display:grid; grid-template-columns:24px auto; column-gap:6px; align-items:start;
    padding:6px 12px; font-size:12px; border-top:1px solid #eaeef2; }
  .row:first-child { border-top:none; }
  .ricon { grid-column:1; }
  .rmain { grid-column:2; }
  .rlabel { font-weight:600; }
  .rdetail { color:#6b7280; font-size:11px; line-height:1.4; word-break:break-all; margin-top:2px; }
  .ft { padding:8px 12px; display:flex; gap:8px; border-top:1px solid #eaeef2; flex-wrap:wrap; }
  .ft button { all:unset; cursor:pointer; flex:1; min-width:70px; text-align:center;
    padding:7px 0; border-radius:8px; font-size:12px; font-weight:600; }
  .recheck { background:#1f7fd6; color:#fff; }
  .copy { background:#16a34a; color:#fff; }
  .writein { background:#eaeef2; color:#1a1a1a; }
  .autosend { background:#f59e0b; color:#1a1a1a; }
  @media (prefers-color-scheme: dark) {
    .writein { background:#30363d; color:#e6e6e6; }
    .autosend { background:#b45309; color:#fff; }
  }
  .toast { padding:0 12px 8px; font-size:11px; color:#16a34a; min-height:14px; }
`;

function renderRows(root: ShadowRoot, rows: CheckRow[]): void {
  const list = root.querySelector('.results');
  if (!list) return;
  list.innerHTML = '';
  for (const r of rows) {
    const row = document.createElement('div');
    row.className = 'row';
    const icon = document.createElement('div');
    icon.className = 'ricon';
    icon.textContent = r.ok ? '✅' : '❌';
    const main = document.createElement('div');
    main.className = 'rmain';
    const lab = document.createElement('div');
    lab.className = 'rlabel';
    lab.textContent = `${r.id} ${r.label}`;
    const det = document.createElement('div');
    det.className = 'rdetail';
    det.textContent = r.detail;
    main.appendChild(lab);
    main.appendChild(det);
    row.appendChild(icon);
    row.appendChild(main);
    list.appendChild(row);
  }
}

function setToast(root: ShadowRoot, msg: string): void {
  const t = root.querySelector('.toast');
  if (t) t.textContent = msg;
}

function buildPanel(root: ShadowRoot): void {
  const style = document.createElement('style');
  style.textContent = PANEL_STYLE;
  root.appendChild(style);

  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.innerHTML = `
    <div class="hd">
      <span>🔬 DeepDesk 注入诊断</span>
      <span class="grow"></span>
      <button class="close" type="button" title="关闭">×</button>
    </div>
    <div class="results"></div>
    <div class="toast"></div>
    <div class="ft">
      <button class="recheck" type="button">重新检测</button>
      <button class="copy" type="button">复制报告</button>
      <button class="writein" type="button">写入测试</button>
      <button class="autosend" type="button">自动发送测试</button>
    </div>
  `;
  root.appendChild(panel);

  const recheck = (): void => {
    const { rows, report } = runDiagnostics();
    lastReport = report;
    renderRows(root, rows);
    setToast(root, '已刷新检测');
  };

  panel.querySelector('.recheck')?.addEventListener('click', recheck);

  panel.querySelector('.copy')?.addEventListener('click', () => {
    const doCopy = async (): Promise<void> => {
      try {
        await navigator.clipboard.writeText(lastReport || '(报告为空，请先点"重新检测")');
        setToast(root, '✅ 报告已复制，可直接粘贴反馈');
      } catch {
        // 剪贴板 API 不可用时退化为可手动复制的弹层
        setToast(root, '复制失败，报告已打印到 console');
      }
    };
    void doCopy();
  });

  panel.querySelector('.writein')?.addEventListener('click', () => {
    const inputEl = findFirst('chatInput');
    if (!inputEl) {
      setToast(root, '未找到输入框');
      return;
    }
    const text = '【DeepDesk 写入测试】3 秒后自动清空，不会自动发送。';
    const ok = writeIntoInput(inputEl, text);
    setToast(root, ok ? '已写入，3 秒后清空…' : '写入失败');
    if (ok) {
      setTimeout(() => {
        writeIntoInput(inputEl, '');
        setToast(root, '已清空测试文字');
      }, 3000);
    }
  });

  // 「自动发送测试」按钮：写入测试文本 + 点击发送按钮
  panel.querySelector('.autosend')?.addEventListener('click', () => {
    const inputEl = findFirst('chatInput');
    if (!inputEl) {
      setToast(root, '未找到输入框，无法自动发送');
      return;
    }
    const sendBtn = findFirst('sendButton');
    if (!sendBtn) {
      setToast(root, '未找到发送按钮，无法自动发送');
      return;
    }
    const text = 'DeepDesk自动测试';
    const writeOk = writeIntoInput(inputEl, text);
    if (!writeOk) {
      setToast(root, '写入输入框失败');
      return;
    }
    // 短暂延迟确保框架感知到输入变化后再点击发送
    setTimeout(() => {
      try {
        (sendBtn as HTMLElement).click();
        setToast(root, '✅ 已写入并点击发送按钮');
      } catch {
        setToast(root, '点击发送按钮失败');
      }
    }, 100);
  });

  panel.querySelector('.close')?.addEventListener('click', () => {
    getShadowHost(SHADOW_ID)?.dispose();
  });
}

// ====================================================================
// Enhancer 定义
// ====================================================================

export const probeEnhancer: Enhancer = {
  name: NAME,
  // immediate：网络侦察必须尽早 patch，越早越能抓到首批请求
  when: 'immediate',
  defaultEnabled: false,
  init() {
    // 1) 立刻安装网络侦察（fetch/xhr/eventsource），不依赖 DOM
    installNetworkRecon();

    // 暴露给自动化测试（Playwright）主动触发重新诊断并取回最新结果。
    try {
      (window as unknown as { __DEEPDESK_PROBE_RUN__?: () => unknown }).__DEEPDESK_PROBE_RUN__ =
        () => {
          const { rows, report } = runDiagnostics();
          const handle = getShadowHost(SHADOW_ID);
          if (handle) renderRows(handle.root, rows);
          return { rows, report, net: net.hits.slice() };
        };
    } catch {
      /* ignore */
    }

    // 2) DOM 就绪后挂面板
    const mountPanel = (): void => {
      if (!document.body) return;
      if (getShadowHost(SHADOW_ID)) return;
      const handle = createShadowHost(SHADOW_ID, 'open');
      handle.host.style.pointerEvents = 'none';
      buildPanel(handle.root);
      // 首次延迟跑一次诊断，给 SPA 渲染时间
      setTimeout(() => {
        const { rows, report } = runDiagnostics();
        lastReport = report;
        renderRows(handle.root, rows);
      }, 1200);
      log.info('probe panel mounted');
    };

    if (document.body) mountPanel();
    else document.addEventListener('DOMContentLoaded', mountPanel, { once: true });
  },
  dispose() {
    for (const restore of net.restorers.splice(0)) {
      try {
        restore();
      } catch {
        /* ignore */
      }
    }
    net.installed = false;
    getShadowHost(SHADOW_ID)?.dispose();
  },
};
