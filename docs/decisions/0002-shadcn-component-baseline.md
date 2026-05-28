# ADR-0002: shadcn/ui 组件库基线

- **状态**：已采纳
- **日期**：2025-01-20
- **决策者**：DeepDesk 前端团队

## 背景

DeepDesk 需要一套高质量、可定制的 UI 组件库作为桌面客户端的基础构件。组件库需满足：
1. 与 Tailwind v4 + OKLCH 色彩系统完全兼容
2. 支持 DeepDesk 自定义 design tokens（蓝青白配色）
3. 无运行时依赖，源码级可控
4. 支持 React 19 新特性（无 forwardRef）
5. 完整的无障碍支持（ARIA、键盘导航）

## 决策

### 选择 shadcn/ui new-york style

**为什么选 new-york 而非 default style：**
- new-york style 视觉更克制、更紧凑，与 DeepDesk "克制的现代感"设计哲学一致
- shadcn 官方已废弃 default style，新项目统一使用 new-york
- new-york 的按钮、输入框等组件高度更适合桌面端（32px 默认高度）
- 圆角更小更精致，符合 Linear / Notion Calendar 审美光谱

### shadcn CLI 启用策略

**建议启用 CLI**，原因：
- `components.json` 已配置完毕，CLI 可直接添加新组件
- Tailwind v4 下 `tailwind.config` 字段留空（v4 不需要 JS 配置文件）
- `baseColor` 设为 `zinc`（最接近我们的中性灰阶）
- `cssVariables: true`（我们使用 CSS 变量方案）
- CLI 添加的组件仍需手动改造 token 名（从 shadcn 默认的 `bg-background` 改为 `bg-bg-base` 等）

**注意事项：**
- CLI 生成的组件使用 shadcn 默认 token 名，需逐行替换为 DeepDesk token
- 不要盲目运行 `shadcn add` 后直接使用，必须经过 token 改造
- `rsc: false`（Tauri 桌面端不使用 React Server Components）

### Tailwind v4 集成方式

- 使用 `@theme inline` 指令在 `global.css` 中注册 CSS 变量为 Tailwind 颜色
- 不使用 `tailwind.config.ts`（v4 推荐纯 CSS 配置）
- 动画使用 `tw-animate-css`（shadcn 已废弃 `tailwindcss-animate`）
- 颜色值直接使用 OKLCH（与 Tailwind v4 默认一致）

## 12 个核心组件

| 组件 | Radix 依赖 | 状态 |
|------|-----------|------|
| Button | @radix-ui/react-slot | ✅ 已实现 |
| Input | 无 | ✅ 已实现 |
| Textarea | 无 | ✅ 已实现 |
| Dialog | @radix-ui/react-dialog | ✅ 已实现 |
| DropdownMenu | @radix-ui/react-dropdown-menu | ✅ 已实现 |
| Tooltip | @radix-ui/react-tooltip | ✅ 已实现 |
| Sheet | @radix-ui/react-dialog | ✅ 已实现 |
| Tabs | @radix-ui/react-tabs | ✅ 已实现 |
| ScrollArea | @radix-ui/react-scroll-area | ✅ 已实现 |
| Switch | @radix-ui/react-switch | ✅ 已实现 |
| Sonner (Toast) | sonner | ✅ 已实现 |
| Command | cmdk | ✅ 已实现 |

## 后续组件引入计划

以下组件将在对应功能模块开发时按需引入：

| 组件 | 引入时机 | 用途 |
|------|---------|------|
| Popover | 聊天输入工具栏 | 模型选择、附件选择 |
| Avatar | 对话界面 | 用户/AI 头像 |
| Separator | 侧栏/设置页 | 视觉分隔 |
| Skeleton | 对话加载 | 骨架屏 |
| Select | 设置页 | 下拉选择 |
| Slider | 设置页 | 温度/top-p 调节 |
| Progress | 文件上传 | 进度条 |
| Badge | 侧栏 | 未读计数、模型标签 |
| Accordion | 设置页 | 折叠分组 |
| ContextMenu | 对话列表 | 右键菜单 |

## 维护策略

### 升级 shadcn 时如何 diff

1. **不要直接运行 `shadcn add --overwrite`**
2. 在临时分支运行 `shadcn add <component>` 获取最新版本
3. 使用 `git diff` 对比新版本与当前实现的差异
4. 重点关注：
   - Radix primitive API 变更
   - 新增的 `data-slot` 属性
   - 动画类名变更（tw-animate-css 更新）
   - 类型定义变更
5. 手动合并有价值的变更，保留 DeepDesk token 改造
6. 更新 ADR 记录升级日志

### Token 映射对照表

| shadcn 默认 | DeepDesk token |
|------------|---------------|
| `bg-background` | `bg-bg-base` |
| `bg-card` | `bg-bg-elevated` |
| `bg-popover` | `bg-bg-overlay` |
| `bg-muted` | `bg-bg-hover` |
| `bg-accent` | `bg-bg-hover` |
| `bg-primary` | `bg-brand` |
| `bg-destructive` | `bg-danger` |
| `text-foreground` | `text-fg-primary` |
| `text-muted-foreground` | `text-fg-secondary` |
| `text-primary` | `text-brand` |
| `border` | `border-border` |
| `ring` | `ring-brand` |

## 缺失依赖说明

当前 `package.json` 已包含所有必要依赖。额外说明：
- `tw-animate-css`：shadcn 官方推荐的动画库。当前我们通过 `src/styles/animations.css` 自定义 keyframes 实现等效动画，避免引入额外依赖。如后续组件数量增多，可考虑引入此包以减少维护成本。
- `@radix-ui/react-context-menu`：右键菜单功能开发时引入
- `@radix-ui/react-select`：设置页开发时引入

## 参考

- [shadcn/ui Tailwind v4 文档](https://ui.shadcn.com/docs/tailwind-v4)
- [shadcn/ui components.json 配置](https://ui.shadcn.com/docs/components-json)
- [Tailwind CSS v4 升级指南](https://tailwindcss.com/docs/upgrade-guide)
- DeepDesk UI-SKILL.md §3 组件 Spec
