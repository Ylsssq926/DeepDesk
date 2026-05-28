# Contributing to DeepDesk

Thanks for your interest in contributing! This document outlines how to
contribute effectively. By participating, you agree to abide by our
[Code of Conduct](./CODE_OF_CONDUCT.md).

> 中文贡献者请参阅本文档下方的 [中文贡献指南](#中文贡献指南)。

---

## Project Vision

DeepDesk is a **community-built, unofficial desktop client for
chat.deepseek.com** with three guiding principles:

1. **Tailor-made for DeepSeek** — every feature must answer "is this
   particularly useful for DeepSeek users?"
2. **Patch the gap** — only build what DeepSeek's official web doesn't
   already do well.
3. **Graceful exit** — every patch must have a clear off-switch and
   detection logic for when DeepSeek ships an equivalent.

Read the full [PRD](./docs/PRD.md) and [ARCHITECTURE](./docs/ARCHITECTURE.md)
before proposing major changes.

---

## What we accept

✅ **Welcome contributions:**
- Bug fixes
- Documentation improvements (English & 简体中文)
- UI polish that follows [`docs/UI-SKILL.md`](./docs/UI-SKILL.md)
- New features that fit the three principles above
- Test coverage (Rust `cargo test`, frontend `vitest`, E2E Playwright)
- Performance improvements
- Accessibility (WCAG AA) improvements
- Translations

❌ **NOT accepted (please don't open PRs):**
- DOM scraping of DeepSeek's business data
- Bypassing PoW, rate limits, or any anti-abuse mechanisms
- Protocol-level proxies that mediate between user and DeepSeek
- Bundled accounts, account-sharing, account-bypassing
- Commercial / paywall features
- Features that materially harm DeepSeek's service integrity
- Renaming the project or changing the license

If you're unsure whether your idea fits, **open a discussion first**
before writing code.

---

## Development setup

### Prerequisites

- Node.js ≥ 20 ([fnm](https://github.com/Schniz/fnm) recommended)
- pnpm ≥ 9 (`npm i -g pnpm`)
- Rust stable ≥ 1.78 ([rustup.rs](https://rustup.rs/))
- Tauri CLI 2.x (`cargo install tauri-cli --version "^2.0.0"`)
- Platform-specific dependencies — see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

### Getting started

```bash
# 1. Fork and clone
git clone https://github.com/<your-username>/DeepDesk.git
cd DeepDesk

# 2. Install dependencies
pnpm install

# 3. Run in dev mode
pnpm tauri dev

# 4. Build for production
pnpm tauri build
```

### Project layout

```
DeepDesk/
├── docs/              # PRD / ARCHITECTURE / UI-SKILL / research
├── src/               # React + TypeScript front-end (enhancement UI)
├── src-injected/      # Inject scripts loaded into chat.deepseek.com WebView
├── src-tauri/         # Rust back-end
│   ├── src/
│   │   ├── commands/  # Tauri command handlers
│   │   ├── tray/      # System tray
│   │   ├── shortcuts/ # Global shortcuts
│   │   ├── db/        # SQLite + FTS5
│   │   ├── injector/  # Inject script management
│   │   └── updater/   # Auto-update
│   └── tauri.conf.json
└── ...
```

---

## Coding standards

### Branches & commits

- `main` — stable, only merged from PRs after review
- `dev` — active development integration branch
- Feature branches: `feat/short-description`, `fix/short-description`, etc.

**Conventional Commits** (required):
```
feat: add Mermaid rendering injector
fix: prevent IME conflict in slash command popover
docs: update UI-SKILL color tokens
chore: bump tauri to 2.1.0
refactor: split commands into per-feature modules
test: add SSE parser unit tests
```

### DCO required (Developer Certificate of Origin)

All commits must be signed off:
```bash
git commit -s -m "feat: your change"
```

This adds a `Signed-off-by: Your Name <your.email@example.com>` line, which
asserts that you have the right to submit your contribution under the
project's license. We use the [DCO bot](https://github.com/apps/dco) to
verify this on every PR. **No CLA is required.**

If you forgot to sign off, use:
```bash
git commit --amend -s --no-edit
git push -f
```

### Code style

| Layer | Tooling |
|-------|---------|
| TypeScript | ESLint + Prettier (configs in repo) |
| Rust | `cargo fmt` + `cargo clippy --all-targets -- -D warnings` |
| CSS | Tailwind v4 + design tokens from `docs/UI-SKILL.md` |

CI will fail if any of these are not green.

### UI changes

Always follow [`docs/UI-SKILL.md`](./docs/UI-SKILL.md):
- Use design tokens, not hex codes
- Spring animations follow the standard parameter table
- Both light and dark mode must look correct
- WCAG AA contrast required
- Respect `prefers-reduced-motion`

Attach **before/after screenshots** in your PR for any visible change.

### Compliance review

Any PR that touches:
- Network requests to chat.deepseek.com
- Inject script behavior
- Local data persistence
- Privacy-related functionality

…will be reviewed against the **compliance bottom line** in the PRD §1.6.
PRs that violate the bottom line will be closed.

---

## Pull Request process

1. Open an issue first for non-trivial changes (≥ 50 LOC) so we can align.
2. Fork → branch → commit (signed-off) → push → open PR.
3. Fill out the PR template completely.
4. CI must be green: lint + tests + build.
5. At least one maintainer review.
6. Squash & merge (conventional commit subject becomes the merge commit).

---

## Reporting bugs

Use the GitHub issue template. Include:
- Platform (Windows / macOS / Linux + version)
- DeepDesk version (`Settings → About`)
- Reproduction steps
- Expected vs actual behavior
- Logs (`Settings → Diagnostics → Open log folder`)

For **security issues**, do not open a public issue. See [SECURITY.md](./SECURITY.md).

---

## Suggesting features

1. Check existing issues / discussions for duplicates.
2. Open a `[feature]` issue with:
   - Use case (which user persona, what scenario)
   - Why DeepSeek's official web doesn't already cover it
   - Optional: your proposed implementation outline
3. We discuss → approve → roadmap or implement.

---

## License

By contributing, you agree that your contributions are licensed under the
**GNU Affero General Public License v3.0** (see [LICENSE](./LICENSE)).

Brand assets (logo, icons, name) are NOT covered by AGPL — see
[TRADEMARK.md](./TRADEMARK.md).

---
---

# 中文贡献指南

感谢你愿意参与 DeepDesk！本节是简明中文版，**与上方英文版规则等价**，
英文版以最终条款为准。

## 项目愿景三原则
1. **为 DeepSeek 量身定制** — 每个功能都问"这是不是 DeepSeek 用户特别需要的"
2. **查漏补缺** — 只补 DeepSeek 缺的，不重复 DeepSeek 已做好的
3. **优雅退场** — 每个补丁都要有独立开关和"检测官方上线后建议关闭"机制

详见 [PRD](./docs/PRD.md) 和 [架构文档](./docs/ARCHITECTURE.md)。

## 我们接受的贡献
- ✅ Bug 修复 / 文档改进 / 测试覆盖 / 性能优化 / 无障碍改进 / 翻译
- ✅ 符合 UI Skill 的 UI 打磨
- ✅ 符合三原则的新功能（先开 issue 讨论）

## 我们 NOT 接受的 PR
- ❌ DOM 业务数据抓取
- ❌ 绕 PoW / 限流 / 反滥用机制
- ❌ 协议层代理
- ❌ 内置账号 / 账号共享 / 账号绕过
- ❌ 任何商业化 / 付费墙
- ❌ 实质损害 DeepSeek 服务完整性的功能

## 开发环境
- Node.js ≥ 20 + pnpm ≥ 9
- Rust stable ≥ 1.78
- Tauri CLI 2.x
- 平台依赖见 [Tauri 官方文档](https://v2.tauri.app/start/prerequisites/)

## 提交规范
- 使用 Conventional Commits（feat / fix / docs / chore / refactor / test）
- 每次 commit **必须签名**（`git commit -s`），使用 DCO 模式
- 不需要 CLA

## PR 流程
1. 大改动（≥ 50 行）先开 issue 对齐
2. fork → 分支 → 提交（带 sign-off）→ 推送 → 开 PR
3. 完整填写 PR 模板
4. CI 必须全绿：lint + 测试 + 构建
5. 至少一名维护者审过
6. Squash & merge

## 安全问题报告
**不要开公开 issue**。详见 [SECURITY.md](./SECURITY.md)。

## 协议
贡献的代码自动以 **AGPL-3.0** 协议授权。
品牌资产（Logo、图标、名称）**不**在 AGPL 范围内，详见 [TRADEMARK.md](./TRADEMARK.md)。

---

> Welcome aboard. 期待你的第一个 PR。 🌊
