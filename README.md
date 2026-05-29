<p align="center">
  <img src="assets/brand/logo.svg" width="120" alt="DeepDesk Logo" />
</p>

<h1 align="center">DeepDesk</h1>

<p align="center">
  <strong>chat.deepseek.com 的非官方桌面客户端</strong><br>
  Unofficial desktop client for chat.deepseek.com
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue" alt="License: AGPL-3.0" /></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Platform" />
  <img src="https://img.shields.io/badge/status-Alpha-orange" alt="Status: Alpha" />
  <a href="https://github.com/Ylsssq926/DeepDesk/actions/workflows/ci.yml"><img src="https://github.com/Ylsssq926/DeepDesk/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
</p>

---

## 简介

DeepDesk 是一个为 [DeepSeek](https://chat.deepseek.com) 网页版重度用户打造的桌面增强外壳。它通过系统级 WebView 直接加载 chat.deepseek.com，在不修改任何请求的前提下，补齐浏览器做不到的桌面体验——全局快捷键、系统托盘、沉浸模式等。

DeepDesk is an unofficial desktop wrapper for chat.deepseek.com, built with Tauri 2 + React. It loads the official web app in a native WebView and adds desktop-level enhancements (global shortcuts, system tray, immersive mode) without modifying any requests to DeepSeek servers.

---

## 重要声明

> ⚠️ **DeepDesk 是社区驱动的非官方项目，与杭州深度求索人工智能有限公司（DeepSeek AI）无任何隶属、授权、合作或赞助关系。**
>
> - 登录与数据完全走 DeepSeek 官方系统，本应用不代理、不修改、不拦截任何请求
> - 本应用**不收集任何用户数据**，所有增强功能均在本地运行
> - "DeepSeek" 为其所有者的商标，本项目仅在指示性合理使用范围内使用该名称以表明兼容性

---

## 当前能做什么 / 不能做什么

> 版本：v0.1.0-alpha（M-01 里程碑已完成）

| 状态 | 能力 |
|:----:|------|
| ✅ 已实现 | 主窗口加载 chat.deepseek.com |
| ✅ 已实现 | 全局快捷键唤起/隐藏窗口（Ctrl+Shift+K / Cmd+Shift+K） |
| ✅ 已实现 | 系统托盘常驻 + 右键菜单 |
| ✅ 已实现 | 跨平台支持（Windows / macOS / Linux） |
| ✅ 已实现 | 注入脚本骨架（enhancer 架构就位） |
| 🚧 计划中 | 沉浸式深度模式（隐藏 DeepSeek 侧栏/导航） |
| 🚧 计划中 | Mermaid / 流程图实时渲染 |
| 🚧 计划中 | Prompt 模板库 + Slash 命令 |
| 🚧 计划中 | 对话导出（Markdown / PDF） |
| 🚧 计划中 | 本地对话存档 + 全文搜索（SQLite + FTS5） |
| 🚧 计划中 | 截图 → OCR / 视觉提问 |
| 🚧 计划中 | 多账号切换 |
| 🚧 计划中 | 自动更新 |

完整功能规划（50+ 项）见 [`docs/PRD.md`](./docs/PRD.md)。

---

## 截图

<!-- TODO: 首个正式版发布后补充截图 -->
<!-- ![主窗口](docs/screenshots/main-window.png) -->
<!-- ![托盘菜单](docs/screenshots/tray-menu.png) -->
<!-- ![沉浸模式](docs/screenshots/immersive-mode.png) -->

> 💡 截图将在首个正式 release 后补充。

---

## 快速开始 — 用户

> 首个 release 即将发布，敬请关注 [Releases 页面](https://github.com/Ylsssq926/DeepDesk/releases)。

发布后，你可以直接下载对应平台的安装包：
- **Windows**：`.msi` 或 `.exe` 安装器
- **macOS**：`.dmg`（支持 Intel 与 Apple Silicon）
- **Linux**：`.deb` / `.AppImage` / `.rpm`

---

## 快速开始 — 开发者

```bash
git clone https://github.com/Ylsssq926/DeepDesk.git
cd DeepDesk
pnpm install
pnpm tauri:dev
```

> 首次编译 Rust 需要 5-15 分钟，后续增量编译约 5-30 秒。

详细的环境搭建、平台依赖、故障排查见 [`SETUP.md`](./SETUP.md)。

---

## 项目结构概览

```
src/              → React 前端（增强 UI shell、设置窗口等）
src-injected/     → 注入脚本（在 WebView 中运行，增强 chat.deepseek.com 体验）
src-tauri/        → Rust 后端（窗口管理、托盘、快捷键、数据库、IPC）
```

---

## 路线图

- [x] **M-01** — WebView 主窗口 + 全局快捷键 + 系统托盘 + 跨平台 CI ✅
- [ ] **M-02** — 沉浸式深度模式（隐藏 DeepSeek 侧栏，专注对话）
- [ ] **M-03** — 设置窗口 + 多窗口管理
- [ ] **M-05** — 本地对话存档（SQLite + FTS5 全文搜索）
- [ ] **M-09** — Mermaid / 流程图实时渲染
- [ ] **V1** — 多账号切换 / 知识库 / IDE 集成 / 自动更新

详细里程碑见 [`docs/PRD.md`](./docs/PRD.md)。

---

## 贡献

欢迎 Issue 和 Pull Request！

- 开发环境搭建：[`SETUP.md`](./SETUP.md)
- 产品需求与设计：[`docs/PRD.md`](./docs/PRD.md)
- 技术架构：[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- UI 设计规范：[`docs/UI-SKILL.md`](./docs/UI-SKILL.md)

---

## 协议

本项目代码采用 [GNU AGPL-3.0-only](./LICENSE) 协议。这意味着：

- 你可以自由使用、修改和分发本项目
- 任何基于本项目的衍生作品（包括网络服务）也必须以相同协议开源
- 品牌资产（名称、Logo）不在 AGPL 范围内

---

## 致谢

- [Tauri](https://tauri.app/) — 轻量跨平台桌面框架
- [React](https://react.dev/) — 用户界面库
- [shadcn/ui](https://ui.shadcn.com/) — 组件设计系统
- [DeepSeek](https://chat.deepseek.com) — 提供优秀的 AI 对话服务

---

> Made with care for DeepSeek users — by the community, for the community.
