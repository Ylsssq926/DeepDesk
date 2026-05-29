# DeepDesk · 开发环境搭建指南

本文档帮助你从零搭建 DeepDesk 开发环境，5 步内启动完整桌面应用。

---

## 系统要求

### Windows

- **操作系统**：Windows 10 1809+ 或 Windows 11
- **WebView2 Runtime**：Win 11 已内置；Win 10 多数已预装，如缺失请从 [Microsoft 官网](https://developer.microsoft.com/microsoft-edge/webview2/) 下载
- **Visual Studio Build Tools**：安装"使用 C++ 的桌面开发"工作负载
- **Rust**：1.78+（通过 [rustup](https://rustup.rs/) 安装）
- **Node.js**：20+
- **pnpm**：9+

### macOS

- **操作系统**：macOS 12 Monterey+
- **Xcode Command Line Tools**：`xcode-select --install`
- **Rust**：1.78+
- **Node.js**：20+
- **pnpm**：9+

### Linux (Ubuntu / Debian)

- **系统依赖**（与 CI 一致）：

```bash
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl wget file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

- **Rust**：1.78+
- **Node.js**：20+
- **pnpm**：9+

### 通用工具安装

```bash
# 安装 Rust（所有平台）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 启用 pnpm（推荐方式）
corepack enable && corepack prepare pnpm@9.15.0 --activate

# 或者通过 npm 安装
npm install -g pnpm
```

> 💡 完整跨平台依赖清单见 [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)。

---

## 首次安装与启动

```bash
git clone https://github.com/Ylsssq926/DeepDesk.git
cd DeepDesk
pnpm install
pnpm tauri:dev
```

> ⚠️ 首次运行 `pnpm tauri:dev` 会编译整个 Rust 项目，耗时约 5-15 分钟（取决于 CPU）。后续增量编译约 5-30 秒。

**预期看到**：

- DeepDesk 主窗口打开，加载 chat.deepseek.com 登录页
- 任务栏 / Dock 出现 DeepDesk 图标
- 系统托盘出现 DeepDesk 图标（可右键打开菜单）
- 按 `Ctrl+Shift+K`（Windows/Linux）或 `Cmd+Shift+K`（macOS）切换窗口可见性

---

## 开发流程

| 命令 | 用途 |
|------|------|
| `pnpm tauri:dev` | 启动完整桌面应用（自动构建注入脚本 + Rust 后端 + React 前端） |
| `pnpm dev` | 仅启动 Vite 开发服务器（用于 React shell 独立预览，不含 Tauri） |
| `pnpm build:inject` | 单独构建注入脚本（输出到 `dist-injected/bundle.js`） |
| `pnpm build:inject:watch` | 监听模式构建注入脚本 |
| `pnpm lint` | ESLint 代码检查 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm format:check` | Prettier 格式检查 |

---

## 打包发布

```bash
pnpm tauri:build
```

输出位于 `src-tauri/target/release/bundle/`：

| 平台 | 产物 |
|------|------|
| Windows | `msi/*.msi` 与 `nsis/*.exe` 安装器 |
| macOS | `dmg/*.dmg` 与 `macos/*.app` |
| Linux | `deb/*.deb` / `appimage/*.AppImage` / `rpm/*.rpm` |

---

## 故障排查

### "WebView2 Runtime not found"（Windows）

Windows 10 部分版本未预装 WebView2。从 [Microsoft 官网](https://developer.microsoft.com/microsoft-edge/webview2/) 下载 Evergreen Bootstrapper 安装即可。

### "linker `cc` not found"（Linux）

缺少编译工具链：

```bash
sudo apt-get install build-essential
```

### "webkit2gtk not found"（Linux）

缺少 WebKitGTK 开发库：

```bash
sudo apt-get install libwebkit2gtk-4.1-dev
```

### 注入脚本不生效

检查 `dist-injected/bundle.js` 是否存在。如果不存在，手动运行：

```bash
pnpm build:inject
```

然后重启 `pnpm tauri:dev`。

### 图标显示为空白

`build.rs` 会自动从 `assets/brand/logo.svg` 渲染图标。如果渲染失败，检查编译输出中的 `cargo:warning` 信息。确保 `assets/brand/logo.svg` 文件存在且为有效 SVG。

### `pnpm tauri:dev` 卡在 "Compiling..." 很久

首次 Rust 编译确实需要 5-15 分钟。后续增量编译会快到 5-30 秒。如果非首次仍然很慢，尝试清理缓存：

```bash
cargo clean --manifest-path src-tauri/Cargo.toml
```

### macOS 报 "cannot be opened because it is from an unidentified developer"

开发版未签名会触发 Gatekeeper。临时方案：右键应用 → 打开。

### Linux 托盘图标不显示

GNOME 默认不带托盘支持，需安装 [AppIndicator 扩展](https://extensions.gnome.org/extension/615/appindicator-support/)。

### `pnpm install` 提示权限错误（Windows）

通常是 OneDrive 同步锁住了 `node_modules`。把项目移出 OneDrive 同步目录即可。

---

## 目录结构

```
DeepDesk/
├── src/                  → React 前端（增强 UI、设置窗口、路由）
├── src-injected/         → 注入脚本源码（enhancers、interceptors）
├── src-tauri/            → Rust 后端
│   ├── src/
│   │   ├── main.rs       → 入口
│   │   ├── lib.rs        → Tauri 应用配置（plugin / setup 链）
│   │   ├── windows.rs    → 窗口管理（主窗口加载 chat.deepseek.com）
│   │   ├── tray.rs       → 系统托盘菜单
│   │   ├── shortcuts.rs  → 全局快捷键
│   │   ├── injector.rs   → 注入脚本加载
│   │   ├── error_page.rs → 加载失败兜底页
│   │   ├── account.rs    → 账户数据目录隔离
│   │   ├── db.rs         → SQLite 数据层（骨架）
│   │   └── commands.rs   → IPC 命令
│   ├── build.rs          → 编译期从 logo.svg 渲染图标
│   └── Cargo.toml
├── assets/brand/         → 品牌资产（logo.svg）
├── scripts/              → 构建脚本（注入脚本打包等）
├── docs/                 → 项目文档（PRD、架构、UI 规范、ADR）
└── package.json
```

---

## 如何添加 enhancer / 扩展模块

注入脚本采用模块化 enhancer 架构。每个 enhancer 是一个独立模块，可单独启用/禁用。

详细的 enhancer 开发指南与 IPC 通信协议见 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)。

---

## 提交前检查清单

在提交 PR 前，请确保以下检查全部通过：

```bash
# 前端
pnpm lint
pnpm typecheck

# Rust
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings

# 注入脚本
pnpm build:inject
```

> 💡 CI 会在三个平台（Windows / macOS / Linux）上运行以上检查。本地通过不代表 CI 一定通过，但能覆盖绝大多数问题。

---

## 推荐 IDE 配置

VS Code 推荐扩展：

- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) — Rust 语言支持
- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) — Tauri 开发工具
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) — 样式提示
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) — 代码检查
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) — 格式化

---

## 有问题？

- 开 [GitHub Issue](https://github.com/Ylsssq926/DeepDesk/issues) 并标注 `[setup]`
- 安全问题请走 [SECURITY.md](./SECURITY.md) 的私密渠道
