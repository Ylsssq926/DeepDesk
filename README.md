# DeepDesk

> ⚠️ **Disclaimer**: DeepDesk is an **unofficial**, community-built desktop client for chat.deepseek.com. This project is **not affiliated with, endorsed by, or sponsored by Hangzhou DeepSeek Artificial Intelligence Co., Ltd.** "DeepSeek" is a trademark of its respective owner; we use the name only to indicate compatibility, in accordance with nominative fair use.
>
> ⚠️ **声明**：DeepDesk 是 chat.deepseek.com 的**非官方**社区桌面客户端，**与杭州深度求索人工智能有限公司无任何隶属、授权、合作或赞助关系**。「DeepSeek」为其所有者的商标；本项目仅在指示性合理使用范围内使用该名称以表明兼容性。

---

为 [DeepSeek](https://chat.deepseek.com) 网页版重度用户而生的桌面增强外壳。保留官方一切能力，把浏览器留下的空缺补齐。

## 设计哲学

- **为 DeepSeek 量身定制** — 每个功能都问"这是 DeepSeek 用户特别需要的吗"
- **查漏补缺** — 只补 DeepSeek 缺的，不重复 DeepSeek 已做好的
- **优雅退场** — DeepSeek 上线对应官方能力时，对应补丁可一键关闭、不绑架用户

## 状态

🚧 **Pre-alpha** — 当前为骨架阶段。功能详见 [`docs/PRD.md`](./docs/PRD.md)。

## 主要规划能力

| 类别 | 能力 |
|------|------|
| **系统集成** | 全局快捷键 / 系统托盘 / 划词提问 / 截图 OCR / 系统右键菜单 |
| **失败兜底** | 自动重试 / 输入草稿持久化 / 长回答自动接续 / 流式响应缓存 |
| **二脑工作流** | 对话标签与文件夹 / 消息片段卡 / 跨对话 @ 引用 / Workspace 工作区 |
| **体验增强** | Mermaid 渲染 / HTML 预览 / 思考链折叠 / 改稿 Inline Diff |
| **个性化** | Prompt 模板库 + Slash 命令 / 自定义指令 / 主题字体 |
| **隐私护栏** | 数据加密 / 隐私脱敏过滤器 / 本地嵌入式语义搜索 |
| **DeepSeek 关怀** | 服务状态浮窗 / 官方公告订阅 / 模型版本 Changelog |

完整功能清单（共 50+ 项，按 MVP / V0.2 / V1 / V2 分阶段）见 [`docs/PRD.md`](./docs/PRD.md)。

## 技术栈

- **Tauri 2.x** — Rust 后端 + 系统 WebView
- **React 19 + TypeScript** — 增强 UI
- **Tailwind CSS v4** — 样式（OKLCH 色彩空间）
- **shadcn/ui** — 基础组件
- **SQLite + FTS5** — 本地存档与全文搜索
- **Tesseract（轻量版）** — 本地 OCR
- 详见 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) 与 [`docs/UI-SKILL.md`](./docs/UI-SKILL.md)

## 安装与开发

### 前置依赖

- [Node.js](https://nodejs.org/) ≥ 20
- [pnpm](https://pnpm.io/) ≥ 9（`npm i -g pnpm`）
- [Rust](https://rustup.rs/) stable ≥ 1.78
- 平台依赖：[Tauri 官方前置要求](https://v2.tauri.app/start/prerequisites/)

### 上手

```bash
git clone https://github.com/Ylsssq926/DeepDesk.git
cd DeepDesk

pnpm install
pnpm tauri:dev
```

详细开发指南见 [`SETUP.md`](./SETUP.md) 与 [`CONTRIBUTING.md`](./CONTRIBUTING.md)。

## 协议

- **代码**：[GNU AGPL-3.0-only](./LICENSE)
- **品牌资产**（名称、Logo、图标）：见 [`TRADEMARK.md`](./TRADEMARK.md)，**不**在 AGPL 范围内
- 完整法律说明：[`DISCLAIMER.md`](./DISCLAIMER.md)
- 协议选择理由与发布策略：[`docs/LICENSE-STRATEGY.md`](./docs/LICENSE-STRATEGY.md)

## 文档

| 文档 | 用途 |
|------|------|
| [`docs/PRD.md`](./docs/PRD.md) | 产品需求文档（v0.3，50+ 功能） |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | 技术架构设计（含 IPC、数据模型、降级策略） |
| [`docs/UI-SKILL.md`](./docs/UI-SKILL.md) | UI/UX 设计权威指南（design tokens、组件 spec） |
| [`docs/LICENSE-STRATEGY.md`](./docs/LICENSE-STRATEGY.md) | 协议、商标、发布策略 |
| [`docs/research/`](./docs/research/) | 调研报告（技术选型、竞品、缺口、UI 趋势） |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | 贡献指南 |
| [`GOVERNANCE.md`](./GOVERNANCE.md) | 项目治理 |
| [`SECURITY.md`](./SECURITY.md) | 安全披露 |
| [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) | 行为准则 |

## 致谢

DeepDesk 的诞生离不开以下开源项目的启发：

- [Tauri](https://tauri.app/) — 跨平台桌面框架
- [Cherry Studio](https://github.com/CherryHQ/cherry-studio) — AGPL 协议路径范例
- [lencx/ChatGPT](https://github.com/lencx/ChatGPT) — Tauri 套壳 ChatGPT 的开创者
- [shadcn/ui](https://ui.shadcn.com/) — 组件设计系统
- [Radix Colors](https://www.radix-ui.com/colors) — 配色系统
- [Linear](https://linear.app/) / [Raycast](https://www.raycast.com/) — 设计哲学灵感

更多见 [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)（构建时自动生成）。

---

> Made with care for DeepSeek users — by the community, for the community.
