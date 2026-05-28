# DeepDesk · 开发环境搭建

> 当前你已经看到的项目骨架是只用 Node 工具链就完成的部分。
> 要真正 `pnpm tauri:dev` 跑起来，还需要装 **Rust + Tauri CLI**（首次安装约 10-30 分钟）。
> 本文档列出从 0 到能 `tauri dev` 启动的完整步骤。

---

## 一、依赖清单

| 工具 | 最低版本 | 安装方式 | 你当前的状态 |
|------|---------|---------|-------------|
| Git | 2.x | [git-scm.com](https://git-scm.com/) | ✅ 已装（v2.50.1）|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org/) | ✅ 已装（v24.12）|
| pnpm | ≥ 9 | `npm i -g pnpm` | ❌ 未装 |
| Rust toolchain | ≥ 1.78 stable | [rustup.rs](https://rustup.rs/) | ❌ 未装 |
| Tauri CLI 2.x | latest | `cargo install tauri-cli --version "^2.0.0"` | ❌ 未装 |
| 平台依赖 | — | 见下方 §2 | — |

---

## 二、Windows 开发环境一键安装

打开 **PowerShell（管理员）** 跑：

```powershell
# 1. pnpm
npm install -g pnpm

# 2. Rust（rustup-init 会装 Visual Studio Build Tools 提示）
Invoke-WebRequest https://win.rustup.rs/x86_64 -OutFile rustup-init.exe
.\rustup-init.exe -y --default-toolchain stable
# 安装完成后重启 PowerShell 让 PATH 生效

# 3. WebView2（Win11 自带；Win10 需检查）
# https://developer.microsoft.com/microsoft-edge/webview2/
# 多数 Win10 已经预装，命令行检查：
Get-AppxPackage *WebView*
```

如果 rustup 提示需要 Visual Studio Build Tools，按提示安装"使用 C++ 的桌面开发"工作负载即可。

---

## 三、macOS / Linux 开发环境

### macOS

```bash
# 1. Xcode Command Line Tools（约 1GB）
xcode-select --install

# 2. Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 3. pnpm
npm install -g pnpm
```

### Linux (Ubuntu / Debian)

```bash
# Tauri 系统依赖
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# pnpm
npm install -g pnpm
```

完整跨平台依赖见 [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)。

---

## 四、首次启动 DeepDesk

```bash
# 1. 安装前端依赖（约 2-5 分钟）
pnpm install

# 2. 编译注入脚本（监听模式）
pnpm build:inject:watch &

# 3. 启动 Tauri 开发模式（首次会编译 Rust，5-15 分钟）
pnpm tauri:dev
```

**预期看到**：
- 一个无边框窗口弹出
- 标题栏显示 "DeepDesk · Unofficial"
- 主区域居中显示 "DeepDesk" 文字与版本说明
- 系统托盘出现一个 DeepDesk 图标（可右键菜单）
- 按 `Cmd/Ctrl+Shift+K` 可以隐藏 / 显示窗口

> 这是当前骨架版本能验证的所有能力。下一阶段会接入 chat.deepseek.com WebView。

---

## 五、生产构建

```bash
pnpm tauri:build
```

输出：
- Windows: `src-tauri/target/release/bundle/msi/*.msi` 与 `nsis/*.exe`
- macOS: `src-tauri/target/release/bundle/dmg/*.dmg`
- Linux: `src-tauri/target/release/bundle/{deb,rpm,appimage}/*`

---

## 六、常见问题

### 1. `pnpm install` 提示 ENOSPC / 权限错误（Windows）

通常是 OneDrive 同步把 `node_modules` 锁住了。把项目移出 OneDrive 目录即可。

### 2. `pnpm tauri:dev` 卡在 "Compiling..." 很久

首次 Rust 编译确实需要 5-15 分钟（依赖你的 CPU）。后续增量编译会快到 5-30 秒。

### 3. macOS 报 "DeepDesk.app cannot be opened because it is from an unidentified developer"

未签名的开发版会触发，临时方案：右键 → 打开。生产版需要 Apple Developer 签名（详见 `docs/LICENSE-STRATEGY.md` §7.2）。

### 4. Linux 上托盘图标不显示

GNOME 默认不带托盘支持，需安装 [AppIndicator 扩展](https://extensions.gnome.org/extension/615/appindicator-support/)。

### 5. 希望用 fnm/Volta 等 Node 版本管理器

完全 OK，用你顺手的工具即可。`package.json` 中 `engines.node` 是 `>=20`，任何符合的版本都行。

---

## 七、推荐的 IDE 配置

VS Code：
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

---

## 八、有问题？

- 看 [CONTRIBUTING.md](./CONTRIBUTING.md) 中的 Development setup 章节
- 开 GitHub Issue 标 `[setup]`
- 安全问题走 [SECURITY.md](./SECURITY.md) 的私密渠道
