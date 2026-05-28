## 概述 / Summary

<!-- 一句话描述这个 PR 做了什么 -->

## 类型 / Type

- [ ] feat — 新功能
- [ ] fix — Bug 修复
- [ ] docs — 文档
- [ ] refactor — 重构（无功能变更）
- [ ] test — 增加测试
- [ ] chore — 构建/依赖/工具
- [ ] perf — 性能优化

## 关联 Issue / Related issues

<!-- 用 "Closes #N" / "Refs #N" 格式 -->

## 变更内容 / Changes

<!-- 列出关键变更点 -->

-
-
-

## 测试 / Testing

<!-- 你怎么验证它能工作？ -->

- [ ] 手动测试通过（请描述）
- [ ] 添加了单元测试
- [ ] 添加了 E2E 测试
- [ ] 三平台测试（Windows / macOS / Linux）— 至少两个

## UI 变更 / UI changes（如适用）

<!-- 截图：before / after。明色和暗色都要。 -->

## 合规检查 / Compliance bottom-line check

按照 PRD §1.6（与 ARCHITECTURE 风险章节）：

- [ ] 没有抓取 chat.deepseek.com 的 DOM 业务数据用于用户自身会话之外的目的
- [ ] 没有修改发往 DeepSeek 的请求 body / headers / token / PoW 字段
- [ ] 没有提供任何代理协议、代登录、账号共享能力
- [ ] 没有引入付费墙 / 内置广告 / 商业化锁定
- [ ] 所有新增的"短窗口补丁"功能都有明确的退场设计

## 自检 / Self-checklist

- [ ] 提交已签名 (`git commit -s`，DCO)
- [ ] 遵守 Conventional Commits
- [ ] `pnpm lint` 通过
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test:run` 通过
- [ ] 必要的文档已更新
- [ ] 已阅读并遵守 [CONTRIBUTING.md](../CONTRIBUTING.md)
