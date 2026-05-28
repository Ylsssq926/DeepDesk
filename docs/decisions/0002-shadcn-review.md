# shadcn/ui 组件集成 — 代码审查报告

> 审查者：Claude Opus 4.7
> 审查时间：2026-03
> 被审查任务：12 个 shadcn 核心组件集成（Opus 4.6 提交）

## 总评

**评级：NEEDS WORK**

整体方向正确：12 个组件全部交付、token 改造覆盖率高、ADR 与 Showcase 都按要求产出，禁改文件（tokens.css / global.css / TitleBar.tsx / motion.ts / utils.ts）确实未动，未私自加依赖，组件文件级注释 + 公开导出 JSDoc 都符合规范。但有 4 个**确凿的功能性 bug** 与 1 个**无障碍回退**必须修复才能合并：

1. `text-md` 字号在 Tailwind v4 中**未注册**，Dialog/Sheet 标题不会得到期望的 16px。
2. `Switch` 与 `TabsTrigger` 显式写了 `focus-visible:outline-none`，**抑制了全局键盘焦点环**，无障碍回退。
3. `animations.css` 的 keyframe 名（`fade-in / slide-in-from-*` 等）与未来若引入 `tw-animate-css` **必然冲突**，且无前缀。
4. `Tabs` 激活态使用 `bg-bg-base` 在暗模式下视觉方向**反转**（亮模式凸起→暗模式凹陷）。
5. `CommandDialog` 在 `DialogContent` 中复用了带 ✕ 关闭按钮的实现，命令面板里出现冗余 ✕。

修完上述 5 项后可以放行；其余多为加分级别的细化建议。

---

## 问题分类清单

### 🔴 阻塞问题（必须修复才能合并）

| # | 文件:行 | 问题描述 | 建议修复 |
|---|---------|----------|----------|
| R1 | `dialog.tsx:199`、`sheet.tsx:206`、`ComponentShowcase.tsx:389` | `text-md` 类在 Tailwind v4 中**不存在**——`global.css` 的 `@theme` 块只注册了 `--color-*` / `--radius-*` / `--font-*`，没有任何 `--text-*` 字号 token。这意味着 Dialog/Sheet 标题不会得到 16px，而是继承 14px。`text-2xs` 同理（Tailwind 默认无 `2xs`）。 | 任选一种：（a）补丁——把 `text-md` 改为内联 `text-[16px]` 或 `text-lg`；（b）治本——在 `global.css` 的 `@theme` 块追加 `--text-2xs/xs/sm/base/md/lg/xl/2xl` 映射。本任务被禁改 `global.css`，所以本次先用方案 (a)，并在 ADR 列出"待整顿"清单。 |
| R2 | `switch.tsx:51`、`tabs.tsx:86` | 显式写 `focus-visible:outline-none` 会**抑制全局 `:focus-visible` 焦点环**，导致键盘聚焦时**完全无视觉指示**——违反 UI-SKILL §"焦点环可见且 ≥ 2px"和 WCAG 2.1 SC 2.4.7。 | 删除该行；或用 `focus-visible:ring-2 focus-visible:ring-brand-soft` 显式提供焦点环。`command.tsx:123` 的 `outline-none` 同理需检查（这里 input 由外层包裹的 `cmdk-input-wrapper` 视觉边界化，可保留，但 Switch/Tabs 必改）。 |
| R3 | `animations.css:12-130` | keyframe 名 `fade-in / fade-out / dialog-in / tooltip-in / popover-in / slide-in-from-{top,bottom,left,right}` 都是 `tw-animate-css` 的**标准命名**。ADR 第 116 行已自承"如后续组件数量增多，可考虑引入此包"——届时整个文件**必然冲突**。 | 给所有 keyframe 加 `dd-` 前缀（`dd-dialog-in` 等），并在引用处一并替换。耗时约 5 分钟。 |
| R4 | `tabs.tsx:88` | `data-[state=active]:bg-bg-base` 在亮模式下：list `bg-hover`(0.96) → trigger active `bg-base`(0.99)——颜色变浅、有"凸起"感；暗模式下：list `bg-hover`(0.28) → trigger active `bg-base`(0.16)——颜色变更深、变成"凹陷"感。视觉方向反转，破坏一致性。 | 用 `bg-bg-overlay` 替换 `bg-bg-base`，让 list (0.96/0.28) → active (0.975/0.24) 在亮/暗模式都呈"覆盖"层级关系；或者改 list 用 `bg-bg-overlay`，trigger active 用 `bg-bg-elevated`。 |
| R5 | `command.tsx:78-100` | `CommandDialog` 复用了 `DialogContent`，但 `DialogContent` 内置渲染了 ✕ 关闭按钮（`dialog.tsx:119-130`）。命令面板用户预期是 ESC 关闭，多出一个 ✕ 在搜索框右上角既冗余又错位。 | 给 `DialogContent` 增加 `hideClose?: boolean` prop，默认 false；`CommandDialog` 传 `hideClose`。或在 `command.tsx` 中复制一份不带 Close 的内容容器。 |

### 🟡 改进建议（应当修，可不阻塞）

| # | 文件:行 | 建议 | 理由 |
|---|---------|------|------|
| Y1 | `sonner.tsx:62-87` | `Toaster` 缺 `theme` prop。Sonner 默认依据系统媒体查询切 light/dark，与 DeepDesk 的 `.dark` class 切换**不联动**。 | 加 `theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}`，或更稳——`useTheme` hook 监听后传入。 |
| Y2 | `input.tsx:56`、`textarea.tsx:56` | 用 `focus:` 而非 `focus-visible:`——鼠标 click 也激活粗 ring，视觉嘈杂、不符桌面感。 | 改成 `focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand-soft`。 |
| Y3 | `tooltip.tsx:82` | `text-[11px]` 硬编码，未走 token。规范是 `2xs`。 | 与 R1 一并解决（@theme 补 fontSize 后改回 `text-2xs`）。 |
| Y4 | `button.tsx:54、62` | `hover:bg-danger/90`、`active:bg-danger/80`——`/90`、`/80` alpha 不在 token 体系内，hover/active 颜色会随 base 变化飘移；理想应有 `--color-danger-hover` token。 | 现阶段可保留（项目尚无 danger-hover token），但记入 design tokens TODO。 |
| Y5 | `dropdown-menu.tsx:180` | danger 项 `focus:bg-danger/10` 同上 alpha 硬编码问题。 | 同 Y4。 |
| Y6 | `switch.tsx:53` | unchecked 用 `bg-bg-active`(亮 0.93)，与 `bg-base`(0.99) 对比度仅 0.06，亮模式下非常微弱，几乎看不到关闭态边界。 | 改用 `data-[state=unchecked]:bg-border-strong`（亮 0.85，暗 0.40），对比更稳。 |
| Y7 | `dialog.tsx:120`、`sheet.tsx:127` | DialogClose / SheetClose 用 `rounded-sm`(6px)——而按钮规范是 `rounded-md`。 | 改为 `rounded-md` 与全局按钮一致。 |
| Y8 | `command.tsx:91` | `[&_[cmdk-input]]:h-10` 给输入区固定 40px，但内部 `CommandInput` 已有 `h-10`，写两遍冗余。 | 删除 `[&_[cmdk-input]]:h-10`。 |
| Y9 | `dropdown-menu.tsx:65` | DropdownMenuSubTrigger 用 `hover:bg-bg-hover focus:bg-bg-hover`，但同行没有 `data-[disabled]` 处理，禁用 sub trigger 时仍可 hover 高亮。 | 追加 `data-[disabled]:pointer-events-none data-[disabled]:opacity-50`。 |
| Y10 | `tabs.tsx:88` | TabsTrigger 高度未显式约束，依赖外层 `h-9` 撑满；按规范应明确 trigger 高度。 | 加 `h-7`（28px）让其在 `h-9` 容器中有 4px 内边距气场。 |
| Y11 | `button.tsx:35` | `font-[520]` 用任意值。规范定义了 `--weight-medium: 520`，但 `@theme` 没有注册 `--font-weight-medium`，所以无法用 `font-medium`。 | 暂保留任意值；记入 token 待补 TODO。 |
| Y12 | `sheet.tsx:62-66` | sheetVariants base class 缺 `data-[state=open]/closed]:` 通用动画名前缀注释；左/右/上/下四方向都嵌入了一长串 className，可读性差。 | 把每个方向的 className 抽出为局部常量。 |
| Y13 | `command.tsx:87-93` | `CommandDialog` 用 `[&_[cmdk-...]]:` 一连串 child selector 覆盖默认样式——和顶部 Command/CommandInput 单独导出后样式有重复。 | 把通用 cmdk slot styling 上提到 `Command` 自身，`CommandDialog` 只负责 Dialog 包裹与 padding 重置。 |

### 🟢 加分项

- `data-slot` 属性全部规范填写，便于后续 `:has()` / 测试选择器定位。
- 所有组件成功移除 forwardRef，使用 React 19 props.ref 习惯。
- `Tooltip` 延迟 350ms / skipDelay 80ms 严格匹配 UI-SKILL §3.6。
- `cursor-default` 用法正确——桌面感而非 web 感（即被审查者声明的关注点 #2 是合规的，见末段）。
- `DropdownMenuItem` 提供了 `variant: 'default' | 'danger'`——这是 shadcn 原版没有的，符合 UI-SKILL §3.5。
- `Toaster` 用 `group-[.toaster]:` 风格覆盖 sonner 默认，避免改 sonner 源码。
- ADR 提供了清晰的 token 对照表，未来 `shadcn add` 后的迁移可直接 grep 替换。
- ComponentShowcase 完整覆盖 12 个组件且配了亮/暗切换；**未挂到 App.tsx 主路由**，仅作开发期工具，合规。
- `package.json` 未改动，所有依赖在原 d33ca72 commit 已就位。

---

## 详细审查（按文件）

### button.tsx ✅

- A1 token：`bg-brand`、`bg-bg-elevated`、`border-border`、`bg-danger` 全部走 token，✓。
- A4 变体：6 种齐全；primary 真的是 `bg-brand text-white`、secondary 真的是 `bg-bg-elevated + border`、ghost 真的是 透明 + hover、outline 真的是 透明 + 描边、danger 真的是 实心、link 真的是 文字 + brand + 下划线。✓
- A4 高度：sm `h-7`(28)、md `h-8`(32)、lg `h-10`(40)、icon `h-8 w-8`。✓
- A5 焦点环：未叠加自己的 ring，靠全局 :focus-visible，**无 double ring**。✓
- B1 类型：`ButtonProps = ComponentProps<'button'> & VariantProps<...> & { asChild?: boolean }`，✓。
- B3 JSDoc：完整，含中文 + example。✓
- 唯一小瑕疵：Y4 / Y11（详见上）。

### input.tsx 🟡

- A1 token：✓
- A5 焦点环：使用 `focus:` 而非 `focus-visible:`——见 Y2，建议改。
- 其他：✓

### textarea.tsx 🟡

- 同 input 的 Y2 问题。
- `field-sizing-content` 用得对（自适应高度）。
- 无 ARIA 缺失（用法侧应在使用处加 aria-label，组件本身合规）。

### dialog.tsx 🔴

- R1：标题 `text-md` 不生效，需修。
- Y7：`DialogClose` 用 `rounded-sm` 与按钮规范不一致。
- 动效用 `var(--duration-base) var(--easing-spring)` 引用 token——✓ 优于硬编码。
- 出现/退出 keyframe 名 `dialog-in` / `dialog-out` 受 R3 影响。
- Overlay `bg-black/40 backdrop-blur-sm` 严格匹配 UI-SKILL §3.4。✓
- ESC 关闭、点 backdrop 关闭由 Radix Dialog 提供。✓

### dropdown-menu.tsx 🟡

- 圆角 `rounded-lg`(12px) ✓
- bg-overlay + border-border + shadow-lg ✓
- 项目 padding `px-2.5 py-1.5` ✓
- selected 状态使用 `data-[selected=true]` / `[state=checked]` 处理——但 **shadcn 标准的"选中态 bg-brand-soft + text-brand"在 Item 里没体现**——只在 CheckboxItem/RadioItem 用 ItemIndicator，普通 Item 没有"已选"概念。这是 shadcn 标准行为，OK。
- danger variant 提供，✓
- 分隔线用 `bg-border` 1px ✓
- Sub menu 缺 disabled 状态（Y9）。

### tooltip.tsx 🟡

- 延迟 350/80ms ✓
- bg-overlay + border-border + shadow-md + rounded-sm ✓
- text-[11px] 硬编码（Y3）。

### sheet.tsx 🟡

- 4 方向变体 ✓
- 滑入/滑出动画用 `var(--duration-slow) var(--easing-spring)` ——但请注意：
  - UI-SKILL §5 标准 sheet timing 是 `{ duration: 0.5, bounce: 0.15 }`(spring)。
  - 这里用 CSS animation 模拟 spring，结果差异较大（CSS animation 没有 spring 物理）。
  - 算合规但不达 motion.ts 标准。建议未来迁移到 `motion` 库的 `<AnimatePresence>` 包装。
- R1 影响 SheetTitle。
- Y7 SheetClose 圆角。

### tabs.tsx 🔴

- R4：active 态色阶反向（暗模式凹陷感）。
- R2：`focus-visible:outline-none` 抑制焦点环。
- Y10：trigger 高度。

### scroll-area.tsx ✅

- 滚动条宽 1.5（6px）+ rounded-full ✓
- bg-border-strong ✓
- hover 显示（`opacity-0 hover:opacity-100`）✓ 与全局 CSS 一致
- 唯一小问题：与全局 `::-webkit-scrollbar` 规则**会同时存在**——使用 `<ScrollArea>` 包裹的区域内部 viewport 仍有原生滚动条样式潜在冲突（实践中 Radix 通过 viewport overflow 隐藏原生条，无害）。

### switch.tsx 🔴

- R2：`focus-visible:outline-none`。
- Y6：unchecked 颜色对比度。
- thumb size-4 + translate-x-4，配合 w-9（36px）容器 + border-2，距离对齐 OK。
- 动画用 `transition-transform duration-[var(--duration-fast)]` ✓

### sonner.tsx 🟡

- Y1：缺 `theme` prop——暗模式切换不生效。
- 类名覆盖完整（toast / description / actionButton / cancelButton / 4 种语义边色）✓
- bg-elevated + border-border + rounded-lg ✓

### command.tsx 🔴

- R5：DialogClose 冗余 ✕。
- Y8、Y13。
- selected 态正确用 `data-[selected=true]:bg-brand-soft data-[selected=true]:text-brand`——这是规范的核心要求，✓
- CommandInput 用 Search 图标 + border-b ✓

### index.ts ✅

- barrel 完整，类型导出齐全。
- 没有循环引用风险。

### ComponentShowcase.tsx ✅

- 覆盖 12 个组件 ✓
- 提供亮/暗切换 ✓
- 未挂载到 App.tsx 主路由 ✓
- 注释明确"未挂载到生产路由" ✓
- `Toaster` 在 Showcase 内挂载——若同时在 App 也挂会重复，但当前 App 未挂，OK。
- 一个轻微问题：Showcase 内 `Sheet` 的 `toggleTheme` 与外部主题切换共享，演示时点击 Sheet 内 Switch 会同时关掉 Sheet 周围的暗模式状态，体验略乱——可接受。

### App.tsx / main.tsx ✅

- App.tsx 仅引入 TitleBar，未引入 ComponentShowcase ✓
- main.tsx 添加了 `import './styles/animations.css'`——任务允许（禁改清单是 tokens.css/global.css/TitleBar/motion/utils，未含 main.tsx），**合规**。
- main.tsx 改动是必要的，否则 animations.css 无法被加载。

### components.json ✅

- style: new-york ✓
- rsc: false ✓（Tauri 桌面端不用 RSC）
- tsx: true ✓
- tailwind.config: ""（v4 不需要 JS config，✓）
- baseColor: zinc——OK，cssVariables 模式下 baseColor 主要影响 CLI 生成的初始 token，我们后续会全量替换。
- aliases 完整 ✓
- 后续 `npx shadcn add <component>` 不会因配置错误失败。

---

## 关于 animations.css 新文件的判断

**结论：保留，但必须加前缀**（见 R3）。

理由：
1. **不能合并到 global.css**：被禁改。
2. **不能用 motion.ts 替代**：motion.ts 是 JS 侧 spring 参数，Radix Primitive 的 `data-[state=open/closed]` 触发的是 CSS 动画，必须有 keyframe 定义。除非把所有 Dialog/Sheet/Tooltip 改用 `<AnimatePresence>` 包装（一笔大改造）。
3. **保留必要性**：12 个组件中有 4 个（Dialog/Sheet/Tooltip/DropdownMenu/Command）依赖这些 keyframes，若删除会导致打开/关闭无动画，体验断崖式下跌。
4. **必须加前缀**：当前命名与 `tw-animate-css`（shadcn 官方推荐动画包）的标准名 100% 重合，未来一旦引入将冲突。改成 `dd-fade-in / dd-dialog-in / dd-slide-in-from-right` 等是 5 分钟成本、长期收益。
5. **建议**：在文件头部加一段注释说明"前缀 `dd-` 是 DeepDesk 命名空间，避免与 tw-animate-css 冲突；如未来引入 tw-animate-css，删除此文件并改用其类名"。

---

## ADR 0002 评价

四个核心问题**全部回答**了：

| 问题 | 回答位置 | 评价 |
|------|----------|------|
| 为什么选 new-york | "选择 shadcn/ui new-york style" 节 | ✓ 4 条理由具体（克制审美、官方废弃 default、桌面端高度合适、圆角更精致） |
| shadcn CLI 是否启用 | "shadcn CLI 启用策略" 节 | ✓ 启用、原因、注意事项都有 |
| 12 个之外的何时引入 | "后续组件引入计划" 节 | ✓ 10 个候选 + 引入时机表格 |
| 升级 shadcn 时如何 diff | "维护策略 → 升级 shadcn 时如何 diff" 节 | ✓ 5 步流程清晰 |

**额外加分**：附带 token 对照表（shadcn 默认 → DeepDesk）极有价值。

**链接核查**：
- https://ui.shadcn.com/docs/tailwind-v4 ✓ 真实存在
- https://ui.shadcn.com/docs/components-json ✓ 真实存在
- https://tailwindcss.com/docs/upgrade-guide ✓ 真实存在
- 内部链接 `docs/UI-SKILL.md §3` ✓

**小瑕疵**：
- 第 42 行说"使用 `@theme inline` 指令"，实际 `global.css` 用的是 `@theme`（无 `inline`）。轻微不一致。
- 第 116 行 "通过 `src/styles/animations.css` 自定义 keyframes 实现等效动画" ——应补充"keyframe 名带 `dd-` 前缀避免冲突"（修完 R3 后）。
- 没有提及"已知 token 漏洞"——`@theme` 缺 `--text-*` 注册等，应在 ADR 列一节"已知遗留问题待整顿"。

---

## ComponentShowcase 评价

✅ 总体优秀。

- 12 个组件全覆盖。
- 亮/暗切换通过 `document.documentElement.classList.toggle('dark')`，与 `tokens.css` 的 `.dark` 选择器对齐。✓
- 没挂到 App.tsx——文件头注释清楚"未挂载到生产路由"，App.tsx 也确实未引入。✓
- 用 `Section` 子组件抽出标题/描述/容器，结构清晰。
- 每个组件展示了多种状态（Button 6 变体 + 4 尺寸 + disabled，Dialog 完整流程，DropdownMenu 含 danger 项，Tabs 含三个标签等）。

**轻微改进**：
- Sheet 演示中嵌的 Switch onCheckedChange 用了 `toggleTheme`，演示时主题会被 Sheet 关闭联动切换，有点诡异。建议拆开。
- 缺 `<TooltipProvider>` 包裹整个 Showcase——实际有，看到 line 97 已包，✓。
- 没有展示 `Switch` 的暗模式 brand 色——但靠顶部"主题切换"覆盖，可接受。

---

## 推荐的下一步动作

按优先级：

1. **修 R1**（30 分钟）：把 `text-md` 改为 `text-[16px]` 或 `text-lg`；把 `text-2xs` 改为 `text-[11px]`。给 ADR 加"待整顿"段落，记录 `@theme` 需补 fontSize/fontWeight 注册（下次允许改 global.css 时一并解决）。
2. **修 R2**（10 分钟）：删除 `switch.tsx:51`、`tabs.tsx:86` 的 `focus-visible:outline-none`；如视觉上冲突，改为 `focus-visible:ring-2 focus-visible:ring-brand-soft focus-visible:ring-offset-2`。
3. **修 R3**（5 分钟）：`animations.css` 全部 keyframe 加 `dd-` 前缀，引用处同步替换。
4. **修 R4**（5 分钟）：`tabs.tsx:88` 把 `bg-bg-base` 改为 `bg-bg-overlay`。
5. **修 R5**（15 分钟）：给 `DialogContent` 加 `hideClose?: boolean`（默认 false），`CommandDialog` 传 true；保持向后兼容。
6. **修 Y1**（10 分钟）：Toaster 加 theme 检测，与 .dark class 联动。
7. **修 Y2**（5 分钟）：Input/Textarea `focus:` → `focus-visible:`。
8. **修 Y6、Y7、Y8、Y9、Y10**（合计 15 分钟）。
9. 跑 `pnpm typecheck` + 启动 Showcase 视觉回归。
10. 提交修复 commit。

总修复时间约 1.5 小时。修完即可标记 PASS。

---

## 附：被审查者声明的"3 个特别关注点"的核查结果

被审查者要求审查者特别关注三处：

### 1. `animations.css` 新增文件

**核查结论**：保留是合理的，但**必须加前缀**避免与 `tw-animate-css` 冲突（详见 R3 与"关于 animations.css 新文件的判断"小节）。当前命名是潜在地雷。

### 2. Button 的 `cursor-default`

**核查结论**：✅ **合规且推荐**。

- UI-SKILL §0 三条不可妥协原则之一是"桌面感 ≠ 网页感"。
- shadcn 默认用 `cursor-pointer` 是 web 习惯；macOS / Windows 原生按钮**不显示手型光标**——只有 hover 链接时才出现。
- 用 `cursor-default` 让整个 UI 摆脱 web 感，与 TitleBarButton 等已有组件一致（虽然 TitleBarButton 没显式写，但默认 button 在 Tauri 中也是 default）。
- DropdownMenu / Command 项目同样用 `cursor-default select-none`——风格一致。

### 3. Tooltip / DropdownMenu / Dialog 动画 syntax 兼容性

**核查结论**：syntax 在 Tailwind v4 + 现代浏览器（Tauri 2.x WebView 基线 ≥ Chromium 110）下**可工作**，但有以下细节：

- `data-[state=open]:animate-[<keyframe>_<duration>_<easing>]` 是 Tailwind v4 任意值动画语法，编译为 `animation: <keyframe> <duration> <easing>`，✓。
- `var(--duration-base)` / `var(--easing-spring)` 在 keyframe 调用时**会被正常展开**（Tailwind v4 任意值支持 var() 透传），✓。
- **小瑕疵**：CSS animation 没有 spring 物理，`var(--easing-spring)`（`cubic-bezier(0.16, 1, 0.3, 1)`）只是带过冲弹性的 Bezier 近似，不等同于 motion.ts 的 spring。在视觉上"够用"，但若想完全对齐 motion.ts，需要用 `<AnimatePresence>` 包装。当前妥协可接受。
- **真正风险**：keyframe 名冲突（R3）和 `text-md` 失效（R1）。
- 这三个组件在 ComponentShowcase 中**实际渲染都正常触发动画**（视觉上能看到 fade / slide / scale），所以不存在"动画完全不触发"的 bug。

---

> 报告完。期待修复后的 PR。
