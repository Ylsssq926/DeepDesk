# 技术选型调研报告

> 调研时间：2026 年 3 月  
> 目标：为 chat.deepseek.com 选择最佳"网页包壳"桌面方案

## 一、主流技术栈横向对比

### 1.1 基本信息

| 方案 | 最新版本 | 开发语言 | 渲染引擎 | 安装包大小(Win x64) | 内存占用(Win) | 首屏速度 | GitHub Stars |
|------|---------|----------|----------|---------------------|--------------|---------|-------------|
| **Electron** | v42.x (2026.5) | JS/TS + C++ | 自带 Chromium 148 | 安装包 ~60-90 MB（解压 ~365MB） | ~107 MB | ~280 ms | ~115K |
| **Tauri 2.x** | v2.11 (2026) | Rust + 任意前端 | 系统 WebView | ~3-8 MB | ~50-100 MB | 88-626 ms | ~90K |
| **WebView2 + .NET/C++** | Runtime 随 Edge 更新 | C#/C++ | WebView2 (Edge Chromium) | <5 MB（依赖系统 WebView2） | ~50-80 MB | ~200-400 ms | N/A |
| **Wails 2** | v2.10.2 (2025.7) | Go | WebView2/WKWebView/WebKitGTK | ~11 MB | ~70-187 MB | ~700 ms | ~26K |
| **NW.js** | v0.111.3 | JS + C++ | 自带 Chromium 148 + Node.js | ~540 MB | ~147 MB | ~658 ms | ~40K |
| **Pake** | 持续更新 | Rust（Tauri 封装） | 系统 WebView | ~5 MB | 同 Tauri | 同 Tauri | ~49K |

### 1.2 关键能力矩阵

| 能力 | Electron | **Tauri 2.x** | Wails 2 | Pake |
|------|----------|---------------|---------|------|
| 加载远程网页流畅度 | 极佳 | 良好 | 良好 | 良好 |
| 注入自定义 CSS/JS | ✅ preload | ✅ initialization_script | 部分 | 受限 |
| Cookie / localStorage 持久化 | ✅ | ✅ 默认 | ✅ | ✅ |
| 系统托盘 | ✅ | ✅ 插件 | ✅ | 有限 |
| 全局快捷键 | ✅ | ✅ global-shortcut | ✅ | ❌ |
| 多窗口 | ✅ | ✅ | v2 有限/v3 支持 | ❌ |
| 拦截 / 修改请求 | ✅ webRequest | 部分 | 部分 | 仅 UA |
| 自动更新 | ✅ 成熟 electron-updater | ✅ 内置 updater + 增量更新 | 计划中 | ❌ |
| 跨平台 | 全平台 | 全平台 | 全平台 | 全平台 |

## 二、真实案例

- **Electron 套壳网页**：WhatsApp Desktop、Discord、Slack、Notion、Lark、VS Code
- **Tauri 套壳网页**：[lencx/ChatGPT](https://github.com/lencx/ChatGPT)（54k+ Star，最直接的参考案例）、Hoppscotch（包体 165MB→8MB）、Spacedrive、Padloc
- **DeepSeek 已有套壳**：
  - [doxdk/deepseek-desktop](https://github.com/doxdk/deepseek-desktop)（Electron, 259 Star, 已停滞）
  - [tanvirmahfuz100/deepseek-app](https://github.com/tanvirmahfuz100/deepseek-app)（Electron, 0 Star, 但带托盘+全局快捷键）

## 三、选型建议

### 推荐：**Tauri 2.x**

**理由**：
1. 包体极小（~5-8MB），适合国内学生/低配机用户
2. **lencx/ChatGPT 用相同路线已验证**（54k Star）
3. Cookie 持久化、JS/CSS 注入、托盘、快捷键、自动更新全部支持
4. 内存仅 Electron 的 1/3
5. Rust 后端 + 最小权限模型，安全性更好
6. 增量更新仅 1-5 MB，CDN 成本可控

**注意点**：
- Rust 学习曲线（但壳子项目 Rust 代码量很少）
- WebView 跨平台差异需测试（Windows WebView2 / macOS WKWebView / Linux WebKitGTK）
- 不能用 `<iframe>` 嵌入 chat.deepseek.com（CSP 拦截），必须用 Tauri 原生 WebView 加载

### 备选：Electron
适用场景：团队对 JS 极熟、对包体不敏感、想用最稳妥方案。

### 不推荐
- **Pake**：极简壳，无托盘/快捷键/扩展能力，加功能等于重新开发
- **NW.js**：包体最大，社区萎缩
- **Wails 3**：仍 Alpha
- **PWA / Edge 安装为应用**：无法注入、无系统托盘、无全局快捷键

## 参考链接

- [web-to-desktop-framework-comparison 基准测试](https://github.com/Elanis/web-to-desktop-framework-comparison)
- [Tauri vs Electron 2026 对比](https://tech-insider.org/tauri-vs-electron-2026/)
- [lencx/ChatGPT 系统架构](https://deepwiki.com/lencx/ChatGPT/2-system-architecture)
- [Pake](https://github.com/tw93/Pake)
- [Tauri Updater 文档](https://v2.tauri.app/plugin/updater/)
