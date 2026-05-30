/**
 * 意图芯片（Intent Chips）增强。
 *
 * @module src-injected/enhancers/intent-chips
 * @see docs/PRD.md §1.6 合规底线 / docs/ARCHITECTURE.md §4.10 Prompt 模板库
 *
 * 设计目标（产品层）：
 *   借鉴千问 / 豆包：在输入框上方放一排「意图芯片」（表格 / 文档 / 翻译 / 流程
 *   图 / 解释）。用户点击芯片，**仅在用户输入框中追加或包装一段「塑形指令」**，
 *   引导 AI 产出规整、可后续稳定处理的输出（Markdown 表格、Mermaid 流程图等）。
 *
 *   核心理念：从「被动解析 AI 随机输出」→「主动塑形」。
 *
 * 合规约束（PRD §1.6，绝对不可触碰）：
 *   - 写入的文本完全等价于「用户自己敲到输入框的提问」，对用户可见、可改、可删
 *   - 不修改任何 chat.deepseek.com 的网络请求 / headers / token / PoW
 *   - 不读取或上传任何对话业务数据（消息列表、回答正文等）
 *   - 不自动发送，仅塑形 + 聚焦输入框，发送动作完全留给用户
 *
 * 不变量：
 *   - 同一输入框元素只挂一次芯片栏（用 WeakSet 标记，幂等）
 *   - 输入框消失（SPA 路由切换 / 重渲染）后，下次中央 observer 命中新输入框时
 *     重新挂载，并在追踪函数中检测旧 input 失效后自动 dispose 旧 host
 *   - 所有 UI 渲染在独立 Shadow DOM 内，样式与宿主页完全隔离
 *   - dispose() 清理 host、observer 句柄、事件监听
 */

import type { Enhancer } from '../types/feature';
import { createLogger } from '../utils/logger';
import { registerFlag } from '../utils/feature-flag';
import { createShadowHost, getShadowHost, type ShadowHostHandle } from '../core/shadow-host';
import { findFirst } from '../core/selectors';
import { observe, type ObserveHandle } from '../core/observer';

const NAME = 'intent-chips' as const;
const SHADOW_ID = 'intent-chips';
const log = createLogger(`enhancer:${NAME}`);

// alpha 阶段默认启用：让用户与开发者立刻看到效果，便于打磨。
registerFlag(NAME, true);

// ====================================================================
// 芯片定义
// ====================================================================

/**
 * 单个意图芯片的塑形动作。
 *
 * - `append`：把模板追加到当前输入内容**之后**，用换行分隔。适合「我想要表格 /
 *   流程图 / 文档结构」这类对输出形式的偏好声明。
 * - `wrap`：把当前输入内容塞进 `template` 中的 `{content}` 占位符。适合「翻译
 *   这段 / 解释这段」这类把已有内容作为操作对象的场景；输入为空时给出明确提
 *   示，避免误产出空指令。
 */
type ShapeAction =
  | { kind: 'append'; template: string }
  | { kind: 'wrap'; template: string; emptyHint: string };

interface IntentChip {
  id: string;
  /** 显示文案（含 emoji 图标）。 */
  label: string;
  /** 鼠标悬停提示。 */
  title: string;
  /** 塑形动作。 */
  action: ShapeAction;
}

const CHIPS: readonly IntentChip[] = [
  {
    id: 'table',
    label: '📊 表格',
    title: '让 AI 用规整的 Markdown 表格输出结果',
    action: {
      kind: 'append',
      template:
        '\n\n请用规整的 Markdown 表格输出结果，确保每列对齐、表头清晰；如内容较多可适度拆成多张表，并在表前用一句话点题。',
    },
  },
  {
    id: 'doc',
    label: '📝 文档',
    title: '让 AI 输出结构化 Markdown 文档（含层级标题、要点列表）',
    action: {
      kind: 'append',
      template:
        '\n\n请用结构化的 Markdown 文档格式输出，包含层级标题（##/###）、要点列表与必要的代码 / 引用块，便于直接导出阅读。',
    },
  },
  {
    id: 'translate',
    label: '🌐 翻译',
    title: '把当前输入框中的内容翻译成中文（保留专业术语）',
    action: {
      kind: 'wrap',
      template:
        '请将以下内容翻译成中文（保留专业术语，必要处加简短注释，整体保持原文语气）：\n\n{content}',
      emptyHint: '请先在输入框里粘贴要翻译的内容，再点「翻译」',
    },
  },
  {
    id: 'flowchart',
    label: '📈 流程图',
    title: '让 AI 用 Mermaid 流程图语法输出可渲染的图',
    action: {
      kind: 'append',
      template:
        '\n\n请用 Mermaid 流程图语法描述（用 ```mermaid 代码块包裹），确保语法正确可被标准 mermaid 解析器渲染；节点命名简洁，逻辑分支清晰。',
    },
  },
  {
    id: 'explain',
    label: '💡 解释',
    title: '让 AI 用通俗语言 + 例子详细解释当前输入框中的内容',
    action: {
      kind: 'wrap',
      template:
        '请详细解释以下内容，使用通俗易懂的语言，并配上 1-2 个具体的例子或类比，必要时点明常见误区：\n\n{content}',
      emptyHint: '请先在输入框里写下要解释的内容，再点「解释」',
    },
  },
];

// ====================================================================
// React 受控 input 写入（实测有效，与 probe.ts 保持一致）
// ====================================================================

/**
 * 把文本写入输入框，触发 React 受控组件正确感知。
 *
 * 关键点：直接 `el.value = text` 会被 React 内部的 _valueTracker 跳过 onChange，
 * 必须从原型链拿到 nativeInputValueSetter 调用，再派发 input 事件。
 */
function writeIntoInput(el: HTMLTextAreaElement | HTMLInputElement, text: string): boolean {
  try {
    const proto = Object.getPrototypeOf(el) as object;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, text);
    else el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  } catch (err) {
    log.warn('writeIntoInput failed:', err);
    return false;
  }
}

/** 把光标移动到末尾，方便用户继续追加 / 编辑。 */
function moveCaretToEnd(el: HTMLTextAreaElement | HTMLInputElement): void {
  try {
    const len = el.value.length;
    el.setSelectionRange(len, len);
  } catch {
    /* 某些浏览器对 type 不支持 setSelectionRange，忽略即可 */
  }
}

// ====================================================================
// 样式（Shadow DOM 内，所有定义都基于 :host）
// ====================================================================

const CHIPS_STYLE = `
  :host { all: initial; }
  .bar {
    position: fixed;
    pointer-events: auto;
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: rgba(31,127,214,0.3) transparent;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    font-size: 12px;
    line-height: 1;
    z-index: 2147483640;
    /* 隐藏直到 reposition 计算完毕，避免左上角闪一下 */
    visibility: hidden;
    transition: opacity 120ms ease-out;
    opacity: 0;
  }
  .bar.ready { visibility: visible; opacity: 1; }
  .bar::-webkit-scrollbar { height: 4px; }
  .bar::-webkit-scrollbar-thumb { background: rgba(31,127,214,0.3); border-radius: 2px; }
  .bar::-webkit-scrollbar-track { background: transparent; }

  .chip {
    all: unset;
    box-sizing: border-box;
    flex: 0 0 auto;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    padding: 5px 11px;
    border-radius: 999px;
    background: rgba(245,247,250,0.95);
    color: #1f2937;
    border: 1px solid rgba(31,127,214,0.18);
    font-weight: 500;
    white-space: nowrap;
    transition: background 120ms ease, color 120ms ease, border-color 120ms ease,
                transform 80ms ease, box-shadow 120ms ease;
    box-shadow: 0 1px 0 rgba(0,0,0,0.02);
  }
  .chip:hover {
    background: linear-gradient(90deg, rgba(31,127,214,0.10), rgba(37,179,192,0.10));
    color: #1f7fd6;
    border-color: rgba(31,127,214,0.45);
    box-shadow: 0 2px 6px rgba(31,127,214,0.12);
  }
  .chip:active {
    transform: scale(0.97);
    background: linear-gradient(90deg, rgba(31,127,214,0.18), rgba(37,179,192,0.18));
  }
  .chip:focus-visible {
    outline: 2px solid rgba(31,127,214,0.55);
    outline-offset: 2px;
  }

  .toast {
    flex: 0 0 auto;
    margin-left: 4px;
    padding: 4px 8px;
    border-radius: 6px;
    background: rgba(245,158,11,0.12);
    color: #b45309;
    font-size: 11px;
    opacity: 0;
    transform: translateY(-2px);
    transition: opacity 160ms ease, transform 160ms ease;
    pointer-events: none;
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .toast.show { opacity: 1; transform: translateY(0); }

  @media (prefers-color-scheme: dark) {
    .bar { scrollbar-color: rgba(37,179,192,0.4) transparent; }
    .bar::-webkit-scrollbar-thumb { background: rgba(37,179,192,0.4); }
    .chip {
      background: rgba(35,40,48,0.92);
      color: #d6dbe2;
      border-color: rgba(37,179,192,0.25);
      box-shadow: 0 1px 0 rgba(0,0,0,0.2);
    }
    .chip:hover {
      background: linear-gradient(90deg, rgba(31,127,214,0.22), rgba(37,179,192,0.22));
      color: #7dd3fc;
      border-color: rgba(37,179,192,0.55);
      box-shadow: 0 2px 8px rgba(37,179,192,0.18);
    }
    .chip:active {
      background: linear-gradient(90deg, rgba(31,127,214,0.32), rgba(37,179,192,0.32));
    }
    .toast {
      background: rgba(245,158,11,0.18);
      color: #fbbf24;
    }
  }
`;

// ====================================================================
// 挂载状态：每个输入框对应一组 host + 跟踪上下文
// ====================================================================

const mountedInputs = new WeakSet<HTMLElement>();

interface MountContext {
  input: HTMLTextAreaElement | HTMLInputElement;
  handle: ShadowHostHandle;
  bar: HTMLElement;
  toast: HTMLElement;
  toastTimer: ReturnType<typeof setTimeout> | null;
  rafId: number | null;
  resizeObs: ResizeObserver | null;
  cleanups: Array<() => void>;
  disposed: boolean;
}

let currentMount: MountContext | null = null;

// ====================================================================
// 位置跟踪：让芯片栏始终贴在输入框上方
// ====================================================================

function reposition(ctx: MountContext): void {
  if (ctx.disposed) return;
  const { input, bar } = ctx;

  // 输入框被卸载（SPA 路由切换或重渲染） → 整体 dispose，等下次 observer 重挂
  if (!input.isConnected) {
    log.info('input detached; tearing down chip bar');
    teardown(ctx);
    return;
  }

  const rect = input.getBoundingClientRect();
  // 输入框暂时不可见（折叠 / display:none） → 隐藏芯片栏，但不 dispose
  if (rect.width === 0 || rect.height === 0) {
    bar.classList.remove('ready');
    return;
  }

  // 芯片栏宽度跟输入框对齐；高度由内容决定。垂直贴在输入框上沿之上 8px。
  // top 值用 fixed 坐标系（视口左上角为原点）。
  const GAP = 8;
  // 提前测一次 bar 高度（首帧可能为 0，用最小值兜底）
  const barHeight = bar.offsetHeight || 32;
  const top = Math.max(0, rect.top - barHeight - GAP);
  const left = rect.left;
  const width = rect.width;

  bar.style.top = `${top}px`;
  bar.style.left = `${left}px`;
  bar.style.width = `${width}px`;

  if (!bar.classList.contains('ready')) {
    bar.classList.add('ready');
  }
}

/**
 * 启动跟踪循环。
 *
 * DeepSeek 是 SPA 且输入框区域可能随消息发送 / 上传文件等动态变高。
 * 我们组合三种触发源：
 *   1. ResizeObserver 监听输入框尺寸变化（最高频且精准）
 *   2. window resize / scroll 监听视口变化
 *   3. 低频 rAF 兜底（每 ~250ms 一次），防止某些奇怪场景下 ResizeObserver 不触发
 */
function startTracking(ctx: MountContext): void {
  // 1. ResizeObserver
  try {
    const ro = new ResizeObserver(() => reposition(ctx));
    ro.observe(ctx.input);
    ctx.resizeObs = ro;
    ctx.cleanups.push(() => ro.disconnect());
  } catch (err) {
    log.warn('ResizeObserver init failed:', err);
  }

  // 2. window 事件
  const onWin = (): void => reposition(ctx);
  window.addEventListener('resize', onWin, { passive: true });
  window.addEventListener('scroll', onWin, { passive: true, capture: true });
  ctx.cleanups.push(() => {
    window.removeEventListener('resize', onWin);
    window.removeEventListener('scroll', onWin, { capture: true } as EventListenerOptions);
  });

  // 3. rAF 兜底（节流：每 ~250ms 才真正校准一次）
  let lastTick = 0;
  const tick = (now: number): void => {
    if (ctx.disposed) return;
    if (now - lastTick > 250) {
      lastTick = now;
      reposition(ctx);
    }
    ctx.rafId = requestAnimationFrame(tick);
  };
  ctx.rafId = requestAnimationFrame(tick);
  ctx.cleanups.push(() => {
    if (ctx.rafId !== null) cancelAnimationFrame(ctx.rafId);
  });

  // 立即跑一次定位
  reposition(ctx);
}

// ====================================================================
// 芯片点击：把塑形指令写入输入框
// ====================================================================

function showToast(ctx: MountContext, msg: string): void {
  ctx.toast.textContent = msg;
  ctx.toast.classList.add('show');
  if (ctx.toastTimer) clearTimeout(ctx.toastTimer);
  ctx.toastTimer = setTimeout(() => {
    ctx.toast.classList.remove('show');
  }, 2400);
}

function applyChip(ctx: MountContext, chip: IntentChip): void {
  const { input } = ctx;
  const current = input.value ?? '';

  let next = '';
  if (chip.action.kind === 'append') {
    // 若用户尚未输入任何内容，给一段引导前缀，使指令独立可读
    next =
      current.trim().length === 0
        ? `（请在此填写你的具体问题）${chip.action.template}`
        : current + chip.action.template;
  } else {
    // wrap：必须有内容
    if (current.trim().length === 0) {
      showToast(ctx, chip.action.emptyHint);
      input.focus();
      return;
    }
    next = chip.action.template.replace('{content}', current);
  }

  const ok = writeIntoInput(input, next);
  if (!ok) {
    showToast(ctx, '写入输入框失败');
    return;
  }

  // 聚焦 + 光标到末尾，让用户可以立刻继续编辑
  input.focus();
  moveCaretToEnd(input);
  log.debug(`applied chip: ${chip.id}`);
}

// ====================================================================
// 渲染 & 挂载
// ====================================================================

function buildBar(ctx: MountContext): void {
  const { handle } = ctx;
  handle.appendStyle(CHIPS_STYLE);

  const bar = document.createElement('div');
  bar.className = 'bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'DeepDesk 意图芯片');

  for (const chip of CHIPS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = chip.label;
    btn.title = chip.title;
    btn.setAttribute('aria-label', chip.title);
    btn.setAttribute('data-chip-id', chip.id);
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      applyChip(ctx, chip);
    });
    // 防止点击芯片时输入框失焦闪烁（mousedown 阻止默认即可）
    btn.addEventListener('mousedown', (ev) => ev.preventDefault());
    bar.appendChild(btn);
  }

  const toast = document.createElement('span');
  toast.className = 'toast';
  toast.setAttribute('aria-live', 'polite');
  bar.appendChild(toast);
  ctx.toast = toast;

  ctx.bar = bar;
  handle.root.appendChild(bar);
  // host 自身默认是 fixed 0,0 size 0；让其内容能显示出来
  handle.host.style.pointerEvents = 'none';
}

function teardown(ctx: MountContext): void {
  if (ctx.disposed) return;
  ctx.disposed = true;
  for (const fn of ctx.cleanups.splice(0)) {
    try {
      fn();
    } catch (err) {
      log.warn('teardown cleanup failed:', err);
    }
  }
  if (ctx.toastTimer) {
    clearTimeout(ctx.toastTimer);
    ctx.toastTimer = null;
  }
  try {
    ctx.handle.dispose();
  } catch (err) {
    log.warn('shadow host dispose failed:', err);
  }
  if (currentMount === ctx) currentMount = null;
}

function mountChipsFor(input: HTMLTextAreaElement | HTMLInputElement): void {
  if (mountedInputs.has(input)) return;
  // 先清掉旧上下文（如果它指向已失效的输入框）
  if (currentMount && currentMount.input !== input) {
    teardown(currentMount);
  }

  // 同名 host 幂等：若已有则复用，否则新建
  const existed = getShadowHost(SHADOW_ID);
  if (existed) existed.dispose();
  const handle = createShadowHost(SHADOW_ID, 'open');

  const ctx: MountContext = {
    input,
    handle,
    bar: null as unknown as HTMLElement,
    toast: null as unknown as HTMLElement,
    toastTimer: null,
    rafId: null,
    resizeObs: null,
    cleanups: [],
    disposed: false,
  };

  buildBar(ctx);
  startTracking(ctx);

  mountedInputs.add(input);
  currentMount = ctx;
  log.info('intent chips mounted');
}

// ====================================================================
// SPA 重建感知：通过中央 observer 与一次性主动扫描结合
// ====================================================================

let observeHandle: ObserveHandle | null = null;

function tryMountFromDocument(): void {
  const el = findFirst('chatInput');
  if (
    el &&
    (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) &&
    !mountedInputs.has(el)
  ) {
    mountChipsFor(el);
  }
}

function installObserver(): void {
  if (observeHandle) return;
  observeHandle = observe(
    // predicate：感兴趣的「批次根节点」是任意 Element；重新查 chatInput 走 selectors
    (node) => node instanceof Element,
    () => {
      // 每个批次只做一次扫描（findFirst 自带兜底版本，开销可接受）
      tryMountFromDocument();
    },
  );
}

// ====================================================================
// Enhancer 定义
// ====================================================================

export const intentChipsEnhancer: Enhancer = {
  name: NAME,
  // dom-ready：必须等 body 出现才能挂载 shadow host；输入框出现晚于 dom-ready
  // 由 observer 兜底
  when: 'dom-ready',
  defaultEnabled: true,
  init() {
    installObserver();
    // 首屏可能输入框已经渲染好了，直接尝试一次
    tryMountFromDocument();
    // 保险：稍后再扫一次（应对一些 SPA 框架延迟挂载首屏组件的情况）
    setTimeout(tryMountFromDocument, 600);
    setTimeout(tryMountFromDocument, 1500);
    log.info('intent-chips enhancer ready');
  },
  dispose() {
    if (observeHandle) {
      observeHandle.cancel();
      observeHandle = null;
    }
    if (currentMount) teardown(currentMount);
  },
};
