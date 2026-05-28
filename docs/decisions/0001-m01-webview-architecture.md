# ADR-0001: M-01 WebView 架构 — 主窗口直接加载 chat.deepseek.com

- **Status**: Accepted
- **Date**: 2026-03
- **Deciders**: 项目核心团队
- **References**: `docs/ARCHITECTURE.md` §4.1, `docs/PRD.md` M-01

## Context

DeepDesk 的核心理念是用 Tauri 系统 WebView 加载 chat.deepseek.com，桌面壳层提供托盘、全局快捷键、本地存档等增强功能。项目骨架已搭好，但主窗口加载的是 React 占位页，需要改为加载 chat.deepseek.com。

关键约束：
- 必须保留已有的 tray + shortcuts + vibrancy 功能
- Cookie 需要持久化（登录状态跨重启保持）
- 未来需要支持多账号隔离
- 自定义 TitleBar 在 M-01 阶段先牺牲，后续通过注入脚本实现

## Decision

**Option A — 主窗口直接 Rust 程序化创建，加载 chat.deepseek.com**

具体实现：
1. 删除 `tauri.conf.json` 中静态定义的 main 窗口
2. 在 Rust `setup` 阶段通过 `WebviewWindowBuilder::new()` + `WebviewUrl::External(...)` 程序化创建主窗口
3. 通过 `data_directory()` 指定 Cookie 存储路径，按 account_id 隔离
4. 通过 `initialization_script()` 注入前端增强脚本
5. React 增强 UI（设置页、知识库等）走独立窗口路线

平台装饰策略：
- macOS: `TitleBarStyle::Overlay` + 透明 traffic light + vibrancy
- Windows: 原生装饰栏 + Mica 效果
- Linux: 原生装饰栏

## Considered Alternatives

### Option B: 嵌套 WebView

在 React 主窗口内嵌套一个 WebView 加载 chat.deepseek.com。

- 优点：可以在同一窗口内叠加自定义 UI
- 缺点：Tauri 2.x 不原生支持嵌套 WebView；需要 hack；性能开销大；Cookie 管理复杂

### Option C: iframe 嵌入

在 React 页面中用 `<iframe>` 加载 chat.deepseek.com。

- 优点：实现最简单
- 缺点：**已被排除** — chat.deepseek.com 设置了 CSP `frame-ancestors 'self'`，iframe 加载会被浏览器拦截

## Consequences

### 正面

- 架构清晰：主窗口 = chat.deepseek.com，增强 UI = 独立窗口
- 与 lencx/ChatGPT 等成熟项目架构一致，有参考价值
- 性能最优：无额外抽象层，WebView 直接渲染目标页面
- Cookie 持久化天然支持：`data_directory` 即可实现
- 多账号扩展路径清晰：每个 account_id 一个 data_directory

### 负面

- 自定义 TitleBar 需通过注入脚本叠加（V0.2 完成，见 ADR-0003）
- 主窗口内无法直接渲染 React 组件（需通过 IPC 或注入脚本桥接）
- 如果 chat.deepseek.com 改版导致注入脚本失效，需要及时更新

## Technical Notes

- Tauri 2.x `WebviewWindowBuilder` API 用于程序化创建窗口
- `WebviewUrl::External(url)` 加载远程 URL
- `capabilities/default.json` 中 `remote.urls` 字段授权远程域名访问 Tauri API
- `include_str!` 编译期嵌入注入脚本，`build.rs` 确保文件存在
- 具体字段名按 Tauri 2.x 实际版本调整（如 `remote.urls` schema 可能随版本变化）
