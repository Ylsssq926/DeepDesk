# M-01 测试计划

- **Status**: Active
- **Date**: 2026-03
- **Milestone**: M-01 — 主窗口加载 chat.deepseek.com
- **References**: `docs/PRD.md` M-01, ADR-0001

## 功能验证清单

### 1. 主窗口加载

- [ ] 启动应用后，主窗口显示 chat.deepseek.com 登录页（而非 React 占位页）
- [ ] 页面完整加载，无 CSP 错误、无网络拦截错误
- [ ] 页面交互正常：可以输入用户名密码、点击按钮

### 2. Cookie 持久化（登录状态保持）

- [ ] 登录 chat.deepseek.com 后关闭应用
- [ ] 重新启动应用，仍保持登录状态（无需重新输入密码）
- [ ] Cookie 容器路径正确：
  - macOS: `~/Library/Application Support/app.deepdesk.unofficial/webview-data/default/`
  - Windows: `%APPDATA%\app.deepdesk.unofficial\webview-data\default\`
  - Linux: `~/.local/share/app.deepdesk.unofficial/webview-data/default/`

### 3. 全局快捷键

- [ ] `Cmd+Shift+K`（macOS）/ `Ctrl+Shift+K`（Windows/Linux）可切换主窗口显示/隐藏
- [ ] 窗口隐藏后再次按快捷键，窗口恢复并获得焦点
- [ ] 快捷键不与系统或常用应用冲突

### 4. 系统托盘

- [ ] 应用启动后系统托盘显示 DeepDesk 图标
- [ ] 左键点击托盘图标：切换主窗口显示/隐藏
- [ ] 右键点击托盘图标：显示菜单（显示/隐藏主窗口、退出）
- [ ] 点击"退出"菜单项：应用完全退出

### 5. Capabilities 安全验证

- [ ] `remote.urls` 配置生效：chat.deepseek.com 页面可正常调用 Tauri API（如有需要）
- [ ] 非授权域名（如 evil.com）无法调用 Tauri API
- [ ] `security.csp: null` 不阻止 chat.deepseek.com 的正常资源加载

### 6. 平台特定验证

#### macOS
- [ ] Traffic light 按钮（关闭/最小化/最大化）正常显示
- [ ] Title bar overlay 样式生效，内容延伸到标题栏区域
- [ ] Vibrancy 效果可见（半透明毛玻璃）

#### Windows
- [ ] 原生标题栏正常显示（最小化/最大化/关闭按钮）
- [ ] Mica 效果生效（如系统支持）
- [ ] 窗口可正常拖动、调整大小

#### Linux
- [ ] 原生窗口装饰正常显示
- [ ] 窗口可正常拖动、调整大小
- [ ] 系统托盘在 GNOME / KDE 下正常工作

### 7. 错误场景

- [ ] 无网络时启动：窗口显示 WebView 默认错误页（非崩溃）
- [ ] chat.deepseek.com 返回 5xx：WebView 显示错误页面（非崩溃）
- [ ] 注入脚本为空（未执行 `pnpm build:inject`）：应用正常启动，仅缺少增强功能

## 回归验证

- [ ] 现有 `commands::ping` 和 `commands::get_app_version` IPC 命令仍可用
- [ ] `tauri-plugin-window-state` 窗口状态恢复仍正常
- [ ] 应用图标、bundle 配置未受影响

## 自动化测试（后续）

- TODO: 添加 Rust 单元测试验证 `account::get_data_directory` 路径生成
- TODO: 添加集成测试验证窗口创建流程
- TODO: 添加 E2E 测试验证页面加载（需 WebDriver 支持）
