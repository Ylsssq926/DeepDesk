# DeepDesk UI 设计 Skill（v1.0）

> 这是 DeepDesk 项目的**UI 设计权威指南**。所有 UI 实现必须以本文档为基准。
> 如有冲突：本文档 > 个人偏好 > 第三方组件库默认值。
> 调研出处：`docs/research/06-ui-trends.md`（本文档是它的浓缩可执行版本）。

---

## 0. 设计哲学（一句话）

**克制的现代感 + 蓝青白配色识别 + 桌面级精致**——做"很会聊天的瑞士军刀"，不做"AI 玩具"。审美光谱位于 **Linear（克制）⇄ Notion Calendar（桌面精致）** 之间，远离 LobeChat 的活泼和 Aceternity 的华丽。

**关于配色的取舍**：当前主流 AI 客户端（ChatGPT / Claude / DeepSeek 网页 / Gemini / Cursor 等）品牌色集中在蓝紫色系，已形成审美疲劳。DeepDesk 选用**蓝青白**——主色偏 cyan 的冷蓝（hue 215-220），强调色用更亮的青（hue 195-200），白底为基。既保留"深思冷静"的 AI 调性，又有清晰的视觉差异化。

### 三条不可妥协原则
1. **90/8/2 配色法则**：中性灰 90% / 蓝青品牌色 8% / 语义色（成功/警示/危险）2%
2. **Fast & 微弹**：所有交互 ≤ 200ms 完成，spring `bounce ≤ 0.2`
3. **桌面感 ≠ 网页感**：UI 区禁选中、自定义滚动条、选中色用品牌色 alpha、禁用浏览器右键菜单

---

## 1. 技术栈选型（已锁定）

| 类别 | 选择 | 备注 |
|------|------|------|
| 组件库 | **shadcn/ui new-york style** | Tailwind v4 + OKLCH，源码复制非依赖 |
| CSS 框架 | **Tailwind CSS v4** | OKLCH 默认 |
| 颜色系统 | **Radix Colors（slate + blue + cyan）** | light/dark 双套，零反色脚本，避开紫色 |
| 动效 | **Motion (前 Framer Motion)** | spring 物理动画 |
| 图标 | **Lucide** | 桌面侧栏可补 [Tabler](https://tabler.io/icons) |
| 代码高亮 | **Shiki**（推荐）/ CodeMirror（如需编辑） | 主题与全局色一致 |
| Markdown | **react-markdown + remark-gfm + rehype-katex** | 数学公式必备 |
| 列表虚拟化 | **@tanstack/react-virtual** | 长对话与历史搜索结果 |
| 字体（英文） | **Geist Variable** | + Inter 备选 |
| 字体（中文） | **HarmonyOS Sans SC** | + 思源黑体备选；霞鹜文楷仅引用块/长文模式 |
| 字体（等宽） | **Geist Mono** | 与 Geist 配对最干净 |
| 工具集 | **clsx + tailwind-merge**（cn helper） | shadcn 标准 |

---

## 2. Design Tokens（直接复制到代码）

### 2.1 全局 CSS 变量（`src/styles/tokens.css`）

```css
/* ============================================================
 * DeepDesk Design Tokens — Light Theme
 * 基于 Radix slate/blue + 蓝青白品牌色（避开 AI 蓝紫疲劳）
 * ============================================================ */

:root {
  /* —— 中性灰阶（背景与文字） —— */
  --bg-base:        oklch(0.99 0.002 264);   /* 应用底色 */
  --bg-elevated:    oklch(0.985 0.003 264);  /* 卡片、侧栏 */
  --bg-overlay:     oklch(0.975 0.004 264);  /* 弹窗、菜单 */
  --bg-hover:       oklch(0.96 0.005 264);   /* hover */
  --bg-active:      oklch(0.93 0.008 264);   /* active/pressed */

  --fg-primary:     oklch(0.20 0.005 264);   /* 主文字 ≈ #2A2C32 */
  --fg-secondary:   oklch(0.45 0.005 264);   /* 次要文字 */
  --fg-tertiary:    oklch(0.62 0.005 264);   /* placeholder、辅助 */
  --fg-disabled:    oklch(0.78 0.003 264);

  --border-default: oklch(0.92 0.003 264);   /* 默认描边 1px */
  --border-strong:  oklch(0.85 0.005 264);   /* 强描边 */
  --border-focus:   var(--brand-primary);    /* 焦点环 */

  /* —— 品牌主色（蓝青白） —— */
  /* 主色：偏 cyan 的冷蓝，hue 215，避开 AI 蓝紫疲劳 */
  --brand-primary:        oklch(0.55 0.15 215);  /* ≈ #3A7DBC 冷蓝 */
  --brand-primary-hover:  oklch(0.50 0.17 215);
  --brand-primary-active: oklch(0.45 0.19 215);
  --brand-primary-soft:   oklch(0.55 0.15 215 / 0.10);  /* 用于 selection、tag bg */

  /* 强调青：更亮的 cyan，hue 200，用于品牌渐变端点、AI 思考特效、流式光标 */
  --brand-accent:        oklch(0.72 0.13 200);  /* ≈ #4FB3D9 青 */
  --brand-accent-soft:   oklch(0.72 0.13 200 / 0.12);

  /* 品牌渐变（用于欢迎页、Logo 时刻、AI 思考边框） */
  --brand-gradient: linear-gradient(135deg,
    oklch(0.55 0.15 215),    /* 冷蓝起点 */
    oklch(0.72 0.13 200)     /* 青色端点 */
  );

  /* —— 语义色 —— */
  --color-success: oklch(0.65 0.18 145);
  --color-warning: oklch(0.78 0.16 75);
  --color-danger:  oklch(0.62 0.22 25);
  --color-info:    oklch(0.62 0.16 230);

  /* —— Radius —— */
  --radius-xs:  4px;     /* 小 chip、tag */
  --radius-sm:  6px;
  --radius-md:  8px;     /* 按钮、input 默认 */
  --radius-lg:  12px;    /* 卡片 */
  --radius-xl:  16px;    /* 大卡片、Dialog */
  --radius-2xl: 20px;    /* 特殊大容器 */
  --radius-full: 9999px;

  /* —— 间距 scale（4 倍数） —— */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;

  /* —— 字号 —— */
  --text-2xs: 11px;   /* metadata */
  --text-xs:  12px;   /* timestamp、caption */
  --text-sm:  13px;   /* 紧凑 UI 文字 */
  --text-base: 14px;  /* 正文（桌面端 14 而非 16） */
  --text-md:  16px;   /* 对话气泡正文 */
  --text-lg:  18px;
  --text-xl:  22px;
  --text-2xl: 28px;   /* 页面标题 */

  /* —— 行高 —— */
  --leading-tight: 1.3;
  --leading-base:  1.55;
  --leading-loose: 1.7;     /* 长文阅读 */

  /* —— 字重（基于 Variable Font） —— */
  --weight-regular: 400;
  --weight-medium:  520;    /* 不用 500，更"现代" */
  --weight-semibold: 620;
  --weight-bold:    700;

  /* —— 阴影 —— */
  --shadow-xs: 0 1px 2px rgba(0,0,0,.04);
  --shadow-sm: 0 1px 2px rgba(0,0,0,.05), 0 2px 4px rgba(0,0,0,.04);
  --shadow-md: 0 1px 2px rgba(0,0,0,.05), 0 4px 12px rgba(0,0,0,.06);
  --shadow-lg: 0 4px 8px rgba(0,0,0,.06), 0 16px 48px rgba(0,0,0,.12);
  --shadow-xl: 0 8px 16px rgba(0,0,0,.08), 0 32px 64px rgba(0,0,0,.16);

  /* —— 焦点环 —— */
  --ring-width:  2px;
  --ring-offset: 2px;

  /* —— 动效 timing —— */
  --duration-fast:    120ms;
  --duration-base:    200ms;
  --duration-slow:    320ms;
  --easing-spring:    cubic-bezier(0.16, 1, 0.3, 1);
  --easing-emphasized: cubic-bezier(0.2, 0, 0, 1);
}

/* ============================================================
 * Dark Theme
 * 不要纯黑——base #0E0E10，elevated 阶梯式提亮
 * ============================================================ */

.dark {
  --bg-base:     oklch(0.16 0.005 264);  /* ≈ #1A1A1D */
  --bg-elevated: oklch(0.20 0.005 264);  /* ≈ #1F1F23 */
  --bg-overlay:  oklch(0.24 0.005 264);  /* ≈ #2A2A2F */
  --bg-hover:    oklch(0.28 0.005 264);
  --bg-active:   oklch(0.32 0.005 264);

  --fg-primary:   oklch(0.95 0.003 264);  /* ≈ #F0F0F2 */
  --fg-secondary: oklch(0.70 0.003 264);
  --fg-tertiary:  oklch(0.55 0.005 264);
  --fg-disabled:  oklch(0.40 0.003 264);

  --border-default: oklch(0.30 0.005 264);
  --border-strong:  oklch(0.40 0.005 264);

  /* 暗模式品牌色：饱和度降 10-15%，亮度提 */
  --brand-primary:        oklch(0.70 0.13 215);  /* 冷蓝 */
  --brand-primary-hover:  oklch(0.76 0.11 215);
  --brand-primary-active: oklch(0.64 0.15 215);
  --brand-primary-soft:   oklch(0.70 0.13 215 / 0.16);

  --brand-accent:        oklch(0.78 0.11 200);  /* 青 */
  --brand-accent-soft:   oklch(0.78 0.11 200 / 0.18);

  --brand-gradient: linear-gradient(135deg,
    oklch(0.70 0.13 215),
    oklch(0.78 0.11 200)
  );

  /* 暗模式阴影减弱（用 1px 内描边代替） */
  --shadow-md: 0 1px 2px rgba(0,0,0,.30), 0 4px 12px rgba(0,0,0,.20),
               inset 0 0 0 1px oklch(1 0 0 / .04);
  --shadow-lg: 0 4px 8px rgba(0,0,0,.40), 0 16px 48px rgba(0,0,0,.40),
               inset 0 0 0 1px oklch(1 0 0 / .06);
}
```

### 2.2 Tailwind v4 配置（`tailwind.config.ts`）

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}', './src-injected/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          base:     'var(--bg-base)',
          elevated: 'var(--bg-elevated)',
          overlay:  'var(--bg-overlay)',
          hover:    'var(--bg-hover)',
          active:   'var(--bg-active)',
        },
        fg: {
          primary:   'var(--fg-primary)',
          secondary: 'var(--fg-secondary)',
          tertiary:  'var(--fg-tertiary)',
          disabled:  'var(--fg-disabled)',
        },
        border: {
          DEFAULT: 'var(--border-default)',
          strong:  'var(--border-strong)',
          focus:   'var(--border-focus)',
        },
        brand: {
          DEFAULT: 'var(--brand-primary)',
          hover:   'var(--brand-primary-hover)',
          active:  'var(--brand-primary-active)',
          soft:    'var(--brand-primary-soft)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger:  'var(--color-danger)',
        info:    'var(--color-info)',
      },
      borderRadius: {
        xs:    'var(--radius-xs)',
        sm:    'var(--radius-sm)',
        md:    'var(--radius-md)',
        lg:    'var(--radius-lg)',
        xl:    'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      fontSize: {
        '2xs': 'var(--text-2xs)',
        xs:    'var(--text-xs)',
        sm:    'var(--text-sm)',
        base:  'var(--text-base)',
        md:    'var(--text-md)',
        lg:    'var(--text-lg)',
        xl:    'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
      },
      fontFamily: {
        sans: ['Geist Variable', 'HarmonyOS Sans SC', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'monospace'],
        serif: ['LXGW WenKai', 'Source Han Serif SC', 'serif'],
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },
    },
  },
} satisfies Config;
```

---

## 3. 组件 Spec（核心组件统一规则）

### 3.1 Button

| 变体 | 视觉 | 用途 |
|------|------|------|
| `primary` | brand 实心填充 | 主要 CTA（每个视图最多 1 个） |
| `secondary` | bg-elevated + 1px 描边 | 次要操作 |
| `ghost` | 透明 + hover bg-hover | 工具栏、列表内操作 |
| `outline` | 透明 + 1px 描边 | "取消"等操作 |
| `danger` | danger 实心 | 删除等不可逆操作 |
| `link` | 文字 + 主色 + 下划线 hover | 链接式按钮 |

**通用规则**：
- 圆角 `md`（8px）；icon-only 按钮也是 `md`，**不要做完全圆角**（避免和 chip 混淆）
- 高度：sm=28px / md=32px / lg=40px（默认 md）
- 内边距：`px-3 py-1.5`（md）/ `px-4 py-2`（lg）
- 字重 `medium`（520）
- hover 在 120ms 内完成；press 时 `scale-[0.98]`
- 焦点环：`focus-visible:ring-2 ring-offset-2 ring-brand`

### 3.2 Input / Textarea

- 高度 32px（sm 28px），圆角 `md`
- 默认 `bg-bg-elevated` + 1px `border-default`
- focus 时 `border-brand` + `ring-2 ring-brand-soft`（不用 ring-offset，节省视觉空间）
- placeholder 用 `fg-tertiary`
- Textarea 自适应高度（auto-resize 直到 max-h），用 [@radix-ui/react-form](https://www.radix-ui.com/) 或自实现

### 3.3 Card / Panel

- 圆角 `lg`（12px）；大卡片 `xl`（16px）
- bg `bg-elevated` + 1px `border-default`
- 阴影 `sm`；浮起时 `md`
- 内边距：标准 `p-4`；紧凑 `p-3`；宽松 `p-6`

### 3.4 Dialog / Modal / Sheet

- 圆角 `xl`（16px）
- 阴影 `xl`
- backdrop：`bg-black/40` + `backdrop-blur-sm`
- 出现动画：`scale: 0.96 → 1` + `opacity: 0 → 1`，spring `{ duration: 0.3, bounce: 0.2 }`
- 关闭：`opacity: 1 → 0`, 200ms tween（不弹）
- ESC 关闭、点 backdrop 关闭、按 Tab 不溢出焦点

### 3.5 DropdownMenu / Popover / Command

- 圆角 `lg`（12px）
- bg `bg-overlay` + 1px `border-default` + 阴影 `lg`
- 项目高度 32px，padding `px-2.5 py-1.5`
- hover `bg-hover`，selected `bg-brand-soft + text-brand`
- 项目分组用 `1px border-default` 分隔，不用粗线

### 3.6 Tooltip

- bg `bg-overlay` + 1px `border-default` + 阴影 `md`
- 圆角 `sm`（6px）
- text `2xs`（11px）`fg-secondary`
- 出现延迟 350ms（避免误触发），消失延迟 80ms

### 3.7 Sidebar / 会话列表

- 宽度：240px 默认，可拖拽 200~360px
- bg `bg-elevated`（暗模式额外 macOS vibrancy `Sidebar` material）
- 项目高度 32px，圆角 `md`
- selected 状态：`bg-brand-soft + 左侧 2px brand 实色 indicator`
- 标题字号 `sm` `medium`，时间戳 `xs` `regular`

### 3.8 ChatInput

- 容器圆角 `xl`（16px）
- bg `bg-elevated` + 1px `border-default`，focus 时 `border-brand` + `shadow-md`
- 内边距 `px-4 py-3`
- 输入区无独立 border（容器边）；底部工具栏 36px，含 模型切换 / 文件附件 / 发送按钮
- 发送按钮默认 ghost，输入有内容时变 primary（用 motion 切换）

### 3.9 MessageBubble

- **不用气泡背景色**——直接放在主背景上，用左侧 2px 主色边或头像区分用户/AI
- 用户消息：右对齐，`bg-bg-elevated` + 圆角 `lg`，最大宽 `prose-md` (~70ch)
- AI 消息：左对齐，无背景，左侧 24px 是 logo / Thinking icon
- 段落间距 `space-y-3`
- markdown 内容用 [github 风格](https://github.com/sindresorhus/github-markdown-css) 调整

### 3.10 CodeBlock

工具条（顶部 32px）：
- 左侧：语言标签（`xs` `mono`）+ 文件名（如有）
- 右侧：复制按钮 / "在 VS Code 打开"按钮 / 折叠按钮
- bg `bg-overlay`，边角连接到代码区
- 代码区 bg `bg-base`（亮模式）/`oklch(0.10 0.003 264)`（暗模式更深）
- 行号 `fg-tertiary`，可关闭
- 超过 200 行自动折叠并显示"展开剩余 N 行"

### 3.11 Loading / Streaming

- **流式 token 末尾闪烁方块光标 `▍`**：1Hz 闪烁，`text-brand`
- 全屏加载：8px 圆点呼吸，居中
- 列表骨架屏：3 行 `bg-bg-hover` + animate-pulse

### 3.12 Empty State

- 中心对齐，垂直 `space-y-4`
- 插画 → 一句标题 → 描述 → 1~3 张"建议卡片"
- 插画用 [open-doodles](https://www.opendoodles.com/) 或自绘 SVG
- 建议卡片：图标 + 短标题 + 一行示例 prompt，hover 浮起

---

## 4. 全局 CSS（必做的桌面感处理）

放在 `src/styles/global.css`：

```css
/* 防止首帧白闪 */
html, body { background: var(--bg-base); color: var(--fg-primary); }

/* 字体平滑 */
html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* tabular numbers 默认开启 */
* { font-variant-numeric: tabular-nums; }

/* 选中色 */
::selection {
  background: var(--brand-primary-soft);
  color: var(--fg-primary);
}

/* 自定义滚动条（仅 hover 显示） */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 9999px;
  transition: background 200ms;
}
*:hover > ::-webkit-scrollbar-thumb,
*:hover::-webkit-scrollbar-thumb {
  background: var(--border-strong);
}

/* UI 区禁用文本选中 */
.ui-region {
  user-select: none;
  -webkit-user-select: none;
}

/* 内容区允许选中 */
.content-region {
  user-select: text;
  -webkit-user-select: text;
}

/* 禁用图片默认拖拽 */
img { -webkit-user-drag: none; user-drag: none; }

/* Tauri 拖拽区 */
[data-tauri-drag-region] {
  -webkit-app-region: drag;
}
[data-tauri-drag-region] button,
[data-tauri-drag-region] input,
[data-tauri-drag-region] a {
  -webkit-app-region: no-drag;
}

/* 焦点环 — 用 :focus-visible 而非 :focus */
:focus { outline: none; }
:focus-visible {
  outline: var(--ring-width) solid var(--ring-color, var(--brand-primary));
  outline-offset: var(--ring-offset);
  border-radius: inherit;
}

/* 减少动效（无障碍） */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 5. 动效规范（Motion 标准参数）

```ts
// src/lib/motion.ts
export const transitions = {
  // 按钮 hover/scale
  buttonHover: { type: 'spring', stiffness: 400, damping: 30, mass: 0.5 },
  buttonPress: { type: 'spring', stiffness: 600, damping: 35 },

  // 抽屉/Sheet 滑入
  sheet: { type: 'spring', duration: 0.5, bounce: 0.15 },

  // Modal/Dialog 出现
  modal: { type: 'spring', duration: 0.3, bounce: 0.2 },

  // 列表 stagger
  listItem: { type: 'spring', stiffness: 260, damping: 20 },
  listStagger: { staggerChildren: 0.04 },

  // 流式 token（重要：用 tween 不用 spring，避免抖）
  streamingToken: { duration: 0.12, ease: [0.16, 1, 0.3, 1] },

  // Tooltip / Popover 出现
  popover: { duration: 0.16, ease: [0.16, 1, 0.3, 1] },
} as const;
```

**禁忌列表**：
- ❌ 不要用 3D tilt / cursor-following spotlight / 磁吸按钮 / parallax
- ❌ 不要在主对话区用 conic gradient 背景（仅在"AI 思考中"特殊状态用）
- ❌ 不要给所有元素加 hover 浮起；只给真正可点击的卡片/按钮

---

## 6. 桌面端独有处理

### 6.1 标题栏（参考章节 6.1）

```ts
// macOS：保留 traffic light，用 tauri-plugin-decorum 内嵌
// Windows：tauri-controls 自绘
// Linux：默认装饰

// tauri.conf.json
{
  "app": {
    "windows": [
      {
        "title": "DeepDesk",
        "decorations": false,   // macOS/Windows 自绘 titlebar
        "transparent": true,    // 用于 vibrancy
        "minWidth": 720,
        "minHeight": 480,
        ...
      }
    ]
  }
}
```

```tsx
// src/components/TitleBar.tsx
<header
  data-tauri-drag-region
  className="ui-region h-9 flex items-center px-3 bg-bg-elevated border-b border-default"
>
  {platform === 'macos' && <div className="w-[68px]" />} {/* traffic light 占位 */}
  <span className="text-xs fg-secondary">DeepDesk</span>
  {platform === 'windows' && <WindowsControls />}
</header>
```

### 6.2 Vibrancy / Mica（侧栏毛玻璃）

```rust
// src-tauri/src/main.rs
use tauri_plugin_window_vibrancy::*;

#[cfg(target_os = "macos")]
apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar, None, None)?;

#[cfg(target_os = "windows")]
apply_mica(&window, Some(true))?;
```

### 6.3 系统托盘图标

- 单色 SVG，macOS 自动 invert
- 暗/亮模式各一套
- hover tooltip："DeepDesk (Unofficial)"

---

## 7. 国际化与中文优化

### 7.1 中英混排排版规则

```css
/* 中英文之间自动加 1/4 空格 */
.prose {
  text-spacing: ideograph-alpha ideograph-numeric;
  font-feature-settings: "halt" 1;  /* 标点压缩 */
}

/* 中文段落首行缩进可选（默认不缩进，更现代） */
.prose-cn-indent p:first-child {
  text-indent: 2em;
}
```

### 7.2 字体加载优先级

```css
:root {
  --font-sans-en: 'Geist Variable', 'Inter', system-ui;
  --font-sans-zh: 'HarmonyOS Sans SC', 'Source Han Sans SC', sans-serif;
}

body {
  font-family:
    var(--font-sans-en),
    var(--font-sans-zh),
    -apple-system, BlinkMacSystemFont, 'Segoe UI',
    system-ui, sans-serif;
}
```

### 7.3 中文字体加载策略

- **HarmonyOS Sans SC** 通过 [fontsource](https://fontsource.org/) 或直接打包 woff2 子集
- 仅打包 4 个字重（regular/medium/semibold/bold），节省 ~60% 体积
- 子集化只保留 GB 7589 + 常用标点（约 8000 字）

---

## 8. 检查清单（每次提交 PR 前）

### 视觉
- [ ] 所有颜色用 token，不出现硬编码 hex
- [ ] 圆角、间距、字号均用 scale 变量
- [ ] 暗模式覆盖（用 `dark:` 或 token 双套）
- [ ] 焦点环可见且 ≥ 2px
- [ ] 文本对比度 ≥ 4.5:1（用 [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)）

### 交互
- [ ] 所有可交互元素键盘可达
- [ ] hover/focus/active 三态都设计
- [ ] 动效 ≤ 200ms 且尊重 `prefers-reduced-motion`
- [ ] 流式 token 末尾有方块光标 `▍`
- [ ] 长列表用虚拟滚动

### 桌面感
- [ ] UI 区不可文本选中
- [ ] 滚动条自定义且 hover 显示
- [ ] 选中色用品牌色 alpha
- [ ] 图标用 SVG 不用 PNG
- [ ] 首帧无白闪

### 无障碍
- [ ] aria-label 完整（所有 icon-only 按钮）
- [ ] role 正确
- [ ] Tab 顺序合理
- [ ] 动效有 `prefers-reduced-motion` 降级

---

## 9. "灵感来源"对照表（搜不到怎么做时打开）

| 场景 | 参考产品 | 具体细节 |
|------|---------|---------|
| Cmd+K 命令面板 | Raycast | 紧凑列表、底部状态栏、键盘提示 |
| 键盘流密集 UI | Linear | 只有紫色一个强调色，其他全灰 |
| 会话渐变识别 | Arc Browser | 每个 Workspace 一抹渐变背景 |
| 流式光标 | Cursor / Claude Desktop | `▍` 方块闪烁 |
| 快捷键全览 | Superhuman | Cmd+/ 弹出全屏列表 |
| Bento 设置页 | Apple Settings + Notion | 卡片化分组 |
| 空状态卡片 | Claude.ai | 4 个示例 prompt 卡片 |
| 侧栏毛玻璃 | macOS / Raycast | vibrancy `Sidebar` material |
| AI 思考边框 | Apple Intelligence / Cursor | conic-gradient 旋转动画 |
| 代码块工具条 | shadcn/ui Block | 顶部固定 32px 工具栏 |

---

## 10. 资源索引（开发时打开）

### 调研全文
- [`docs/research/06-ui-trends.md`](./research/06-ui-trends.md) — 完整调研

### 在线工具
- 调色：[oklch.com](https://oklch.com/) | [Radix Colors](https://www.radix-ui.com/colors)
- 对比度：[WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- 焦点环测试：浏览器 Tab 键

### 字体下载
- [Geist Font](https://github.com/vercel/geist-font/releases)
- [HarmonyOS Sans](https://github.com/huawei-fonts/HarmonyOS-Sans/releases)
- [LXGW WenKai webfont](https://github.com/chawyehsu/lxgw-wenkai-webfont)

### 组件参考
- [shadcn/ui blocks](https://ui.shadcn.com/blocks)（完整布局示例）
- [Origin UI](https://originui.com/)（shadcn 扩展组件）
- [Magic UI](https://magicui.design/)（动效组件，仅欢迎页用）

### 图标
- [Lucide](https://lucide.dev/)（首选）
- [Tabler Icons](https://tabler.io/icons)（补充）

---

> **本文档是 DeepDesk UI 实现的最高准则**。新增组件 / 修改样式时必须先读本文件。
> 如发现新趋势或更优实践，应**先更新本 skill 再修改实现**，确保设计一致性可追溯。
