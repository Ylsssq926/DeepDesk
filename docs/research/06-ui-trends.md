# DeepDesk UI/UX 设计趋势调研（2025 H2 – 2026 Q1）

> 调研时间：2026 年 3 月
> 目的：为 DeepDesk（DeepSeek 第三方桌面客户端，Tauri + React + TypeScript）建立视觉基准。
> 方法：聚焦"最近 6–12 个月真正在用、真正影响后续设计趋势"的产品、库与文章。

---

## 1. 桌面 AI 客户端 / 生产力工具 UI 标杆

### 1.1 Raycast v2（2025 年 9 月，macOS Tahoe 同步发布）
- 链接：[官网](https://www.raycast.com/) | [The New Raycast 介绍](https://www.raycast.com/blog/the-new-raycast) | [技术深度解读](https://www.raycast.com/blog/a-technical-deep-dive-into-the-new-raycast)
- 设计亮点：
  - "Liquid Glass 用得克制"——只在功能性层（命令列表的边框、滚动条遮罩）使用半透明
  - **Compact mode**：极简紧凑模式，扫一眼即可定位行；所有键盘流
  - 浮窗有"轻微浮起感"：阴影非常深但模糊扩散柔和（典型值约 `0 32px 64px rgba(0,0,0,.45)`）
  - Cmd Palette 范式被全行业借鉴
- 对 DeepDesk 启示：**Cmd+K 命令面板必做**。浮窗阴影要"软厚"。

### 1.2 Linear（2024 年大改版 + 2025 持续微调）
- 链接：[Linear 官网](https://linear.app/) | [设计博客 part II](https://linear.app/now/how-we-redesigned-the-linear-ui) | [calmer interface 2025](https://linear.app/blog/behind-the-latest-design-refresh)
- 设计亮点：
  - **极致键盘流 + 紧凑信息密度**，feels like an IDE
  - 单色聚焦：紫色 `#5E6AD2` 是唯一强调色，其余全是中性灰
  - 字体 Inter，行间距 1.4，数字用 tabular nums
  - "calmer interface"——按钮去掉边框，靠 hover 浮起
- 对 DeepDesk 启示：**单一强调色 + 纯中性灰**是最稳的克制路线。

### 1.3 Arc Browser / Dia（The Browser Company）
- 链接：[Arc 官网](https://arc.net/) | [Dia 设计策略](https://browsercompany.substack.com/p/the-strategy-behind-dias-design)
- 设计亮点：
  - **个性化彩色渐变**作为"窗口主题"——每个 space 独立配色
  - Cmd+S 一键收纳整个 UI，只剩内容
  - 图标动效活泼但克制
- 对 DeepDesk 启示：**渐变色用于"用户身份/会话身份"**而非装饰。

### 1.4 Cursor IDE
- 链接：[Cursor 官网](https://www.cursor.com/) | [styleseed 设计系统提取](https://github.com/bitjaru/styleseed)
- 设计亮点：极冷的中性色——白底+几乎不着色；Cursor 3 引入"Agents Window"作为独立浮窗
- 对 DeepDesk 启示：**对话面板和"工具调用面板"的分离**可参考。

### 1.5 Cherry Studio（国内开源 AI 客户端，46k+ stars）
- 链接：[GitHub](https://github.com/CherryHQ/cherry-studio)
- 设计亮点：三栏经典布局 + 轻度毛玻璃 + 圆角 12px 卡片；国内审美会话头像 emoji 多、色彩偏暖
- 对 DeepDesk 启示：**布局可借鉴但需做出"更克制更高级"的差异化**。

### 1.6 LobeChat
- 链接：[GitHub](https://github.com/lobehub/lobe-chat) | [@lobehub/ui](https://github.com/lobehub/lobe-ui)
- 设计亮点：用 antd-style + 自家设计语言，面板浮起感强，hover 动效较多
- 缺点：动效偏多，长时间使用会让人疲劳

### 1.7 Notion Calendar（前 Cron）
- 链接：[官网](https://www.notion.com/calendar)
- 设计亮点：
  - 桌面端"原生感最强"的电子产品之一
  - 极致键盘快捷键（J/K/E/Esc）
  - 阴影几乎不可见，靠"非常细的描边 + 微微浮起"分层
- 对 DeepDesk 启示：**用 1px 描边 + 1–2px 阴影分层**比厚阴影更显高级。

### 1.8 Superhuman
- 链接：[官网](https://superhuman.com/) | [Dribbble](https://dribbble.com/superhuman)
- 设计亮点：键盘快捷键面板（Cmd+/）是黑金教科书
- 对 DeepDesk 启示：**所有快捷键集中可视化**是高端工具的标配。

### 1.9 Wispr Flow（语音输入 AI 工具）
- 链接：[官网](https://wisprflow.ai/) | [品牌 rebrand 文章](http://www.wisprflow.ai/rebrand)
- 设计亮点："Cool palette: Icy blues and purples, with gradient overlays"——这种"冷蓝紫渐变"是 2025 AI 周边产品的高频选择
- 对 DeepDesk 启示：DeepSeek 品牌色就是冷蓝紫，刚好契合这一审美。

### 1.10 Vercel v0 / Bolt.new / Lovable（新一代 AI 工具）
- 链接：[v0](https://v0.app/) | [Bolt.new](https://bolt.new/) | [Lovable](https://lovable.dev/)
- 设计亮点：都用 shadcn/ui + Tailwind v4 + Geist 字体——已经成事实标准
- 对 DeepDesk 启示：**shadcn/ui + Geist 是最不会出错的现代 AI 工具技术选型**。

---

## 2. 2025–2026 主流 UI 趋势

### 2.1 Liquid Glass（Apple WWDC 2025-06）
- 链接：[Apple 官方](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/) | [Wikipedia](https://en.wikipedia.org/wiki/Liquid_Glass)
- 核心特征：半透明 + 实时折射 + specular highlights；适用于 iOS 26 / iPadOS 26 / macOS Tahoe 26 / visionOS 26
- 桌面端模拟做法：CSS `backdrop-filter: blur(20px) saturate(180%)` + 半透明描边 + 极薄内阴影
- **风险**：用得过满 = 廉价。Apple 自己也只在导航/控件层用，内容区仍是实色。

### 2.2 Bento Grid（信息密度卡片化）
- 链接：[Web Design Trends 2026](https://blocks.serp.co/blog/web-design-trends-2026) | [Bento Grid Dashboard](https://www.orbix.studio/blogs/bento-grid-aesthetics-dashboard-design)
- 适合：仪表盘、设置页、欢迎页；不适合：聊天主流（线性流）

### 2.3 大圆角 + 厚阴影 + 渐变描边
- 圆角：8px → 12-16px → 大卡片 20-24px
- 双层柔和阴影：
  ```css
  box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.10);
  ```
- 渐变描边："magic border"——`background-image` + `mask` 或 conic-gradient

### 2.4 Spring 物理动画
- 链接：[Motion 文档](https://motion.dev/docs/spring) | [Spring 教程](https://motion.dev/tutorials/js-spring)
- 主流参数：
  - 按钮 hover：`stiffness: 400, damping: 15`
  - 抽屉/侧栏：`stiffness: 200, damping: 25`
  - 列表 stagger：`stiffness: 260, damping: 20`，children delay 0.04s
- 趋势：**time-based spring** `{ duration: 0.5, bounce: 0.25 }` 比手算更可控

### 2.5 OKLCH 色彩空间替代 HSL
- 链接：[shadcn/ui Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)（2025-03 起 HSL 全部转 OKLCH）
- 优势：感知一致——把 lightness 从 50→60，视觉变化在所有 hue 上一致
- Tailwind v4 默认 OKLCH

### 2.6 单色聚焦 + 强调色
- Linear：紫 `#5E6AD2` | Cursor：几乎无强调色 | Vercel：纯黑白 | Arc：用户自定义渐变
- **核心：UI 90% 中性灰，10% 强调色**

### 2.7 可变字重 Variable Font
- Inter v4、Geist、HarmonyOS Sans 都有 wght variable axis
- 现代写法：`font-weight: 380;`（不再只用 400/500/600）
- 标题用 600–680，正文 400–440

### 2.8 反趋势观察
- **新拟态彻底退潮**
- **过度毛玻璃**正被反思（Apple 自己都收着用）
- **AI 渐变光晕**变成"AI 在思考"的视觉惯例

---

## 3. 优秀 UI 库与设计系统

### 3.1 shadcn/ui v4（2025）★推荐
- 链接：[ui.shadcn.com](https://ui.shadcn.com/) | [Tailwind v4 升级笔记](https://ui.shadcn.com/docs/tailwind-v4)
- 风格：极简、可控、所有源码"复制到自己仓库"
- **DeepDesk 推荐：基础组件全用 shadcn/ui**（Button / Input / Dialog / DropdownMenu / Tooltip / Sonner / Sidebar / Command）。Tailwind v4 + OKLCH + new-york style

### 3.2 HeroUI v3（前 NextUI）
- 链接：[heroui.com](https://www.heroui.com/) | [v3 介绍](https://heroui.pro/docs/react/releases/v3-0-0)
- 风格：圆润、生动、动效自带
- **适合 DeepDesk**？部分。可以借鉴 `Switch`、`Slider` 等单组件视觉

### 3.3 Aceternity UI / Magic UI / Inspira UI
- 链接：[Aceternity](https://ui.aceternity.com/) | [Magic UI](https://magicui.design/) | [Inspira UI](https://github.com/unovue/inspira-ui)
- 风格：动效极其华丽——3D tilt 卡片、cursor-following spotlight、磁吸按钮
- **适合 DeepDesk**？**只在欢迎页/品牌时刻用**
- 推荐组件：`Animated Beam`（连接线动画）、`Aurora Background`、`Number Ticker`

### 3.4 Tremor
- 链接：[tremor.so](https://tremor.so/)
- DeepDesk 用法：**Token 用量统计、对话历史可视化**

### 3.5 Mantine
- 链接：[mantine.dev](https://mantine.dev/)
- DeepDesk 用法：不推荐作为 base，但 `@mantine/hooks` 单独引很值

### 3.6 Catalyst（Tailwind 官方付费）
- 链接：[Catalyst](https://catalyst.tailwindui.com/)
- 不能直接用，但**审美参考**

### 3.7 Untitled UI
- 链接：[untitledui.com](https://www.untitledui.com/)
- 推荐参考：Spacing 体系、icon 选型

### 3.8 Origin UI / Cult UI / Eldora UI
- [Origin UI](https://originui.com/)：shadcn 扩展集，免费，特别推荐 input/select 变体
- [Cult UI](https://www.cult-ui.com/)：动效偏华丽
- [Eldora UI](https://www.eldoraui.site/)：动效新晋

### 3.9 国内：Arco / Semi / TDesign
- [Semi Design（字节）](https://semi.design/)：3000+ design tokens，**设计 token 中文文档最完整**
- [Arco Design（字节）](https://github.com/arco-design/arco-design)：偏企业级
- [TDesign（腾讯）](https://tdesign.tencent.com/)：跨端
- DeepDesk 用法：**不推荐作为组件库**，但**中文设计稿/排版规范**值得深读

### 3.10 LobeHub UI
- 链接：[@lobehub/ui](https://github.com/lobehub/lobe-ui)
- "AI 聊天专用组件"参考：Markdown、Code Block、Mention、Chat Bubble

---

## 4. 颜色与字体系统

### 4.1 颜色系统
- **首选 Radix Colors**：[radix-ui.com/colors](https://www.radix-ui.com/colors) | [Tailwind v4 集成](https://github.com/lilingxi01/radix-colors-tailwind)
  - 12 阶 scale（1=App Background → 12=High Contrast Text）
  - **天然适配暗色模式**——只要切 `class="dark"` 即可
  - 推荐套色：`gray + slate + blue + indigo + violet`（DeepSeek 蓝紫调）
- **OKLCH 调色板**：Tailwind v4 已默认。手动调色推荐 [oklch.com](https://oklch.com/) 调色器
- **暗色模式**：
  - **不要纯黑** `#000`——用 `#0E0E10`–`#121212` 作 base
  - 分层：base → elevated 1（+4% lightness）→ elevated 2（+8%）→ overlay（+12%）
  - 文字主色 `oklch(0.95 0 0)` ≈ `#F2F2F2`，次要 `oklch(0.65 0 0)`
  - 强调色：暗模式下饱和度降 10–15%

### 4.2 字体推荐

#### 英文 / 数字
- 正文：[Inter v4](https://rsms.me/inter/) 或 [Geist](https://github.com/vercel/geist-font)（首选）
- 等宽：[Geist Mono](https://www.serbyte.net/fonts/geist-mono)（与 Geist 配对最干净）| [JetBrains Mono](https://www.jetbrains.com/mono/) | [IBM Plex Mono](https://www.ibm.com/plex/)
- **Tabular Numbers**：所有数字开 `font-variant-numeric: tabular-nums`

#### 中文
- 链接：[免费中文字体清单](https://github.com/zenozeng/Free-Chinese-Fonts)
- **首选 [HarmonyOS Sans SC](https://github.com/huawei-fonts/HarmonyOS-Sans)**：华为出品，免费商用，多字重，无衬线
- 备选 [思源黑体](https://github.com/adobe-fonts/source-han-sans)：质量天花板，但体积大
- 个性场景 [LXGW WenKai 霞鹜文楷](https://github.com/lxgw/LxgwWenkai)：手写感，适合长文阅读、引用块
- 中英混排：`font-family: "Geist", "HarmonyOS Sans SC", system-ui, sans-serif;`

---

## 5. 动效与交互细节

### 5.1 Spring 标准参数

| 场景 | type | 参数 |
|---|---|---|
| Button hover/scale | spring | `stiffness: 400, damping: 30, mass: 0.5` |
| Button press | spring | `stiffness: 600, damping: 35` |
| 抽屉/Sheet 滑入 | spring | `duration: 0.5, bounce: 0.15` |
| Modal/Dialog | spring | `duration: 0.3, bounce: 0.2` + opacity tween |
| 列表 stagger | spring | `stiffness: 260, damping: 20`，`staggerChildren: 0.04` |
| 流式 token | tween | `duration: 0.15, ease: [0.16, 1, 0.3, 1]` |

### 5.2 桌面"窗口转场"
- Tauri WebView 内：`<motion.div layout>`
- 多窗口：[`window-vibrancy`](https://github.com/tauri-apps/window-vibrancy) 给次窗口加毛玻璃
- 窗口出现：`scale(0.96) → 1` + `opacity 0 → 1` 的 200ms spring

### 5.3 微交互范例
- **空状态**：插画 + "示例点击卡片"。推荐 [open-doodles](https://www.opendoodles.com/) 或 [Untitled UI illustrations](https://www.untitledui.com/)
- **加载状态**：流式 token 时**最后一个字符旁加 1 个闪烁的方块光标** `▍`
- **Hover**：100–150ms 内 background 变成 `bg-foreground/5`，press 时 scale 0.98

---

## 6. 暗色模式与无障碍

### 6.1 暗色模式分层（不是反色）
**核心原则：往上抬不是越来越亮，而是 elevation 越高 background 越浅**：
```css
--bg-base:      oklch(0.16 0.005 264);  /* 应用底色 ≈ #161618 */
--bg-elevated:  oklch(0.20 0.005 264);  /* 卡片、侧栏 */
--bg-overlay:   oklch(0.24 0.005 264);  /* 弹窗、菜单 */
--bg-hover:     oklch(0.28 0.005 264);  /* hover 态 */
```
**强调色暗模式降饱和**：DeepSeek 蓝紫从 `oklch(0.55 0.20 270)` → `oklch(0.65 0.16 270)`

### 6.2 WCAG AA 实操
- 链接：[WCAG 2025 完整指南](https://allaccessible.org/blog/color-contrast-accessibility-wcag-guide-2025)
- 正文 ≥ 4.5:1；大字 ≥ 3:1；非文字 UI ≥ 3:1
- **焦点环新规（WCAG 2.2，2.4.13）**：≥2px 厚 + ≥3:1 对比度
- 推荐：`focus-visible:ring-2 ring-offset-2 ring-primary`（用 `:focus-visible` 而非 `:focus`）

### 6.3 大字体 / 键盘 only
- 大字体模式（设置可切 1.0 / 1.125 / 1.25 倍 root font-size）
- 用 [@radix-ui/react-roving-focus](https://www.radix-ui.com/) 处理列表/菜单的 arrow 导航
- 提供"快捷键全览面板"（Cmd+/）

---

## 7. 桌面独有的设计要素

### 7.1 标题栏
- 链接：[Tauri Window Customization](https://tauri.app/learn/window-customization/) | [tauri-controls](https://github.com/agmmnn/tauri-controls) | [tauri-plugin-decorum](https://docs.rs/tauri-plugin-decorum) | [mac traffic light demo](https://github.com/aizcutei/tauri_mac_traffic_light_window_demo)
- **DeepDesk 推荐**：
  - macOS：保留原生 traffic light，用 Decorum 让它"内嵌"对齐
  - Windows：自绘按钮，与 Win11 Fluent 视觉协调
  - Linux：默认装饰即可
- 拖拽区：`<div data-tauri-drag-region>`

### 7.2 字体抗锯齿
- macOS：`-webkit-font-smoothing: antialiased` + `-moz-osx-font-smoothing: grayscale`
- Windows：让 ClearType 工作，**不要**强行加 antialiased

### 7.3 高 DPI
- Tauri 默认 1:1 device-pixel-ratio
- 所有图标用 SVG（[Lucide](https://lucide.dev/) 或 [Tabler](https://tabler.io/icons)）

### 7.4 "桌面 App 而非网页套壳"的关键
- 链接：[8 Tips for Native Look in Tauri](https://dev.to/akr/8-tips-for-creating-a-native-look-and-feel-in-tauri-applications-3loe)
- 检查清单：
  1. **移除浏览器选中蓝**：`::selection` 自定义颜色
  2. **禁用文本选中**（除内容区外）：UI 按钮、侧栏、titlebar 加 `user-select: none`
  3. **禁用 webkit 默认右键菜单**，提供应用内菜单
  4. **禁用图片默认拖拽**：`-webkit-user-drag: none`
  5. **滚动条自定义**：`::-webkit-scrollbar { width: 6px }`，hover 时显示
  6. **快捷键**用 [Tauri global shortcut](https://v2.tauri.app/plugin/global-shortcut/)
  7. **窗口 minimum size** 设合理值
  8. **加载首屏**：`<body>` 立即给 `bg-background`，否则首帧白闪

---

## 8. 给 DeepDesk 的视觉调性建议（10 条最终结论）

### ① 风格定义（一句话）
**「克制的现代感 + DeepSeek 冷蓝紫识别 + 桌面级精致」**——做一台"很会聊天的瑞士军刀"，而不是"AI 玩具"。审美光谱位于 Linear（克制）与 Notion Calendar（桌面精致）之间，远离 LobeChat 的活泼和 Aceternity 的华丽。

### ② 主色 / 中性色 / 强调色
- **主色（DeepSeek 蓝紫）**：`oklch(0.55 0.20 270)` ≈ `#5C6FFF`，暗模式 `oklch(0.68 0.16 270)`
- **中性色**：Radix `slate` scale 1–12（亮）/ `slateDark` 1–12（暗）
- **强调色**：success `oklch(0.65 0.18 145)` / warning `oklch(0.78 0.16 75)` / danger `oklch(0.62 0.22 25)`
- **禁忌**：不要再加第二个品牌色

### ③ 字体推荐
- 英文：**Geist Variable**（首选）/ Inter Variable（备选）
- 中文：**HarmonyOS Sans SC**（首选）/ 思源黑体（备选）
- 等宽：**Geist Mono**
- 数字：所有 `tabular-nums`
- 字号 scale：`12 / 13 / 14 / 16 / 18 / 22 / 28`

### ④ 圆角 / 间距 / 阴影 spec
- **圆角**：基础 8 / 卡片 12 / 大卡片/弹窗 16 / 完全圆 9999
- **间距 scale**：4 / 8 / 12 / 16 / 24 / 32 / 48
- **阴影**（双层）：
  ```css
  /* card */
  box-shadow: 0 1px 2px rgba(0,0,0,.05), 0 4px 12px rgba(0,0,0,.06);
  /* floating overlay */
  box-shadow: 0 4px 8px rgba(0,0,0,.06), 0 16px 48px rgba(0,0,0,.12);
  ```
- 暗模式阴影减弱，改用 1px 内描边 `inset 0 0 0 1px oklch(1 0 0 / .06)`

### ⑤ 动效偏好
- 基调：**fast + 微弹**。所有交互在 200ms 内完成，spring `bounce: 0.15–0.2`
- 流式 token：用 `duration: 0.12, ease: [0.16, 1, 0.3, 1]` tween（不要 spring）
- 默认尊重 `prefers-reduced-motion`

### ⑥ 暗色模式策略
- 暗模式是**一等公民**
- 不要纯黑——base `#0E0E10`，elevated 阶梯式提亮 4–8%
- 强调色暗模式版本独立调，饱和度降 10–15%
- **不要用反色脚本**，用 Radix Colors 的 light/dark 双套 + `.dark` 类

### ⑦ 关键交互的"灵感来源"
- **Cmd+K 命令面板** ← Raycast
- **键盘流 + 紧凑列表** ← Linear
- **会话/Workspace 渐变识别** ← Arc Browser
- **流式 token 的方块闪烁光标 ▍** ← Cursor / Claude Desktop
- **快捷键全览面板（Cmd+/）** ← Superhuman
- **设置页 Bento 卡片化** ← Apple Settings + Notion
- **空状态"建议卡片"** ← Claude.ai 首页
- **Tauri vibrancy 让侧栏/menu 半透明** ← Raycast / macOS 原生
- **AI 思考时的 conic gradient 边框** ← Apple Intelligence + Cursor agent panel
- **代码块顶部"复制 + 语言标签 + 行号"工具条** ← shadcn/ui Block

### ⑧ 必备组件清单（一期）
1. shadcn/ui：Button / Input / Textarea / DropdownMenu / Dialog / Sheet / Tooltip / Tabs / Sidebar / Sonner / Command / Popover / ScrollArea / Resizable / Switch / Slider / Avatar / Separator / Skeleton
2. 自研 / 改造：MessageBubble / CodeBlock / TokenCounter / ModelSelector / SessionList / ChatInput / Settings 页
3. 第三方：Motion (Framer Motion)、shiki/codemirror、react-markdown + remark-gfm + rehype-katex、@tanstack/react-virtual

### ⑨ 桌面感清单（必须做）
1. 自定义 titlebar，macOS 内嵌 traffic light，Windows 自绘按钮
2. 全局快捷键
3. UI 区禁用文本选中、图片拖拽、默认右键菜单
4. 自定义滚动条，hover 才显示
5. 选中颜色用主色 alpha：`::selection { background: oklch(0.55 0.20 270 / 0.25) }`
6. `prefers-color-scheme` 自动跟随系统
7. macOS 用 vibrancy `Sidebar` material 给侧栏加毛玻璃；Windows 用 mica；Linux 不做
8. 系统托盘图标 + 通知

### ⑩ 最该避免的 3 个设计陷阱
1. **过度毛玻璃**：满屏 `backdrop-filter: blur(40px)` 让 UI 看起来"廉价 PPT"
2. **彩虹强调色 + 多个品牌色**：避免"成功绿、危险红、链接蓝、品牌紫"四色乱用。中性灰占 90%，主色（蓝紫）占 8%，语义色仅在状态时出现，占 2%
3. **动效过度堆砌**：3D tilt、cursor spotlight、磁吸按钮、parallax——这些 Aceternity 风格的动效**全都不要**用在主聊天界面

---

## 附：核心参考链接索引

### 桌面 AI 客户端 / 工具
- [Raycast](https://www.raycast.com/) | [Raycast 技术解读](https://www.raycast.com/blog/a-technical-deep-dive-into-the-new-raycast)
- [Linear](https://linear.app/) | [Linear 设计博客](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Arc Browser](https://arc.net/) | [Dia 设计策略](https://browsercompany.substack.com/p/the-strategy-behind-dias-design)
- [Cursor](https://www.cursor.com/) | [styleseed 设计系统](https://github.com/bitjaru/styleseed)
- [Cherry Studio](https://github.com/CherryHQ/cherry-studio)
- [LobeChat](https://github.com/lobehub/lobe-chat) | [@lobehub/ui](https://github.com/lobehub/lobe-ui)
- [Notion Calendar](https://www.notion.com/calendar)
- [Superhuman](https://superhuman.com/)
- [Wispr Flow](https://wisprflow.ai/)
- [Vercel v0](https://v0.app/) | [Bolt.new](https://bolt.new/) | [Lovable](https://lovable.dev/)

### 趋势 / Liquid Glass
- [Apple Liquid Glass 官方](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/)
- [Liquid Glass Wikipedia](https://en.wikipedia.org/wiki/Liquid_Glass)
- [Web Design Trends 2026](https://blocks.serp.co/blog/web-design-trends-2026)

### UI 库
- [shadcn/ui](https://ui.shadcn.com/) | [Tailwind v4 升级](https://ui.shadcn.com/docs/tailwind-v4)
- [HeroUI v3](https://www.heroui.com/)
- [Aceternity UI](https://ui.aceternity.com/)
- [Magic UI](https://magicui.design/)
- [Origin UI](https://originui.com/) | [Cult UI](https://www.cult-ui.com/) | [Eldora UI](https://www.eldoraui.site/)
- [Mantine](https://mantine.dev/)
- [Tremor](https://tremor.so/)
- [Untitled UI](https://www.untitledui.com/)
- [Catalyst Tailwind UI](https://catalyst.tailwindui.com/)
- [Semi Design](https://semi.design/) | [TDesign](https://tdesign.tencent.com/)

### 颜色 / 字体
- [Radix Colors](https://www.radix-ui.com/colors) | [Radix Colors + Tailwind 集成](https://github.com/lilingxi01/radix-colors-tailwind)
- [oklch.com 调色器](https://oklch.com/)
- [Geist Font](https://github.com/vercel/geist-font)
- [Inter Font](https://rsms.me/inter/)
- [JetBrains Mono](https://www.jetbrains.com/mono/)
- [HarmonyOS Sans](https://github.com/huawei-fonts/HarmonyOS-Sans)
- [思源黑体 Source Han Sans](https://github.com/adobe-fonts/source-han-sans)
- [LXGW WenKai 霞鹜文楷](https://github.com/lxgw/LxgwWenkai)

### 动效
- [Motion (Framer Motion) 文档](https://motion.dev/docs/react)
- [Spring 物理动画指南](https://motion.dev/docs/spring)

### Tauri / 桌面
- [Tauri Window Customization](https://tauri.app/learn/window-customization/)
- [tauri-controls](https://github.com/agmmnn/tauri-controls)
- [tauri-plugin-decorum](https://docs.rs/tauri-plugin-decorum)
- [tauri-apps/window-vibrancy](https://github.com/tauri-apps/window-vibrancy)
- [Native Look in Tauri 8 tips](https://dev.to/akr/8-tips-for-creating-a-native-look-and-feel-in-tauri-applications-3loe)

### 暗色模式 / 无障碍
- [Dark UI 设计实战](https://nighteye.app/dark-ui-design/)
- [WCAG 2025 完整指南](https://allaccessible.org/blog/color-contrast-accessibility-wcag-guide-2025)
- [WCAG 2.4.13 Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance)

---

> 本文档作为 DeepDesk 视觉基准。如后续发现新的优秀样本或趋势变化，应在此文件追加而非另写新文档。
