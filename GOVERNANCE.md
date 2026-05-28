# DeepDesk Project Governance / 项目治理

> Version 1.0 / 2026-03

This document describes how decisions are made in the DeepDesk project.
It is a living document and will evolve as the project grows.

本文档描述 DeepDesk 项目的决策机制。这是一份会随项目成长而演进的活文档。

---

## 1. Project Stage / 项目阶段

DeepDesk is currently in the **Founding (BDFL) phase**:

- A single founding maintainer makes final decisions.
- Community contributions are welcome and reviewed transparently.
- Major architectural / philosophical changes go through the RFC process
  (see Section 4).

DeepDesk 目前处于**创始阶段（BDFL 模式 — Benevolent Dictator For Life）**：
- 单一创始维护者做最终决定
- 欢迎并透明评审社区贡献
- 重大架构 / 哲学变更走 RFC 流程（见第 4 章）

As the project matures, governance will transition to a **maintainer
council** model and eventually to a documented democratic process.
项目成熟后，治理将逐步过渡到**维护者委员会**模式，最终过渡到完整的民主流程。

---

## 2. Roles / 角色

### 2.1 Founder / Founding Maintainer
- Currently: [@Ylsssq926](https://github.com/Ylsssq926)
- Final decision authority on all matters
- Holds the trademark and brand assets
- Can veto any change

### 2.2 Maintainers
- Have commit / merge rights
- Review PRs in their area of expertise
- Help triage issues and coordinate releases

### 2.3 Contributors
- Anyone who has had at least one PR merged
- Listed in `CONTRIBUTORS.md` (auto-generated)

### 2.4 Translators / Documentation
- Maintain locale files and i18n keys
- Listed under their dedicated section in `CONTRIBUTORS.md`

### 2.5 Security Responders
- Respond to security advisories (see [SECURITY.md](./SECURITY.md))
- Must be Maintainers or Founder

### 2.6 Emeritus
- Former Maintainers no longer active
- Recognized in `CONTRIBUTORS.md` for their past work

---

## 3. Decision-Making / 决策

### 3.1 Day-to-day decisions (low impact)
- Single maintainer review is sufficient for:
  - Bug fixes
  - Documentation improvements
  - Minor refactors
  - UI polish
  - Test additions
  - Translations

### 3.2 Significant changes (medium impact)
- At least 2 maintainers (or 1 maintainer + Founder) approval required:
  - New features
  - Performance optimizations with side effects
  - Dependency upgrades
  - CI / build pipeline changes

### 3.3 Critical changes (high impact)
- **Unanimous maintainer agreement** required for:
  - License changes
  - Trademark policy changes
  - Compliance bottom-line modifications (PRD §1.6)
  - Project rename / rebrand
  - Governance model changes
  - Commercial-related decisions (e.g. dual-licensing)

These changes also require an RFC (see Section 4) and a 30-day public
comment period.
此类变更还需 RFC + 30 天社区公示期。

---

## 4. RFC Process / RFC 流程

For non-trivial proposals (especially Section 3.3 changes), use the RFC
process:

1. **Open an issue** with title `[RFC] <short-summary>` and the
   `rfc-pending` label.
2. **Body** includes:
   - Motivation
   - Detailed design
   - Trade-offs and alternatives considered
   - Migration plan (if breaking)
   - Compatibility with project philosophy (the three principles)
3. **Discussion period** of at least 14 days for community review.
4. **Maintainer decision**: accept / reject / request changes.
5. If accepted, the RFC is moved to `docs/rfcs/<number>-<title>.md`.
6. Implementation PR references the RFC number.

---

## 5. Becoming a Maintainer / 成为维护者

A contributor is invited to become a Maintainer when **all** the following
are true:

1. Active for **≥ 3 months** with consistent quality contributions.
2. **≥ 5 merged PRs** of non-trivial nature.
3. Demonstrated understanding of the project philosophy and compliance
   bottom line.
4. **Unanimous approval** from existing Maintainers (and the Founder during
   the BDFL phase).
5. Willingness to commit time for ongoing review.

Invitations are sent privately. Acceptance is by replying to the invite
issue.

---

## 6. Stepping Down / 退出维护者角色

Maintainers may step down at any time by:
1. Opening an issue or sending a private note to the Founder.
2. Optionally nominating a successor.
3. Being recognized as Emeritus in `CONTRIBUTORS.md`.

**Inactivity rule**: Maintainers inactive for **6 months** without
communication are automatically moved to Emeritus, with a 30-day prior
notice via direct message and public issue.

---

## 7. Conflict Resolution / 冲突解决

Conflicts between maintainers or contributors are first attempted to be
resolved through direct discussion. If unresolved:
1. Open an issue with the `[conflict-resolution]` label.
2. Maintainers vote (Founder has final authority during BDFL phase).
3. Outcome is documented publicly (with privacy preserved as needed).

For Code of Conduct violations, see [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
for the dedicated process.

---

## 8. Communication Channels / 沟通渠道

| Channel | Purpose |
|---------|---------|
| GitHub Issues | Bug reports, feature requests, RFCs |
| GitHub Discussions | Q&A, ideas, show-and-tell |
| GitHub Pull Requests | Code review, changes |
| GitHub Security Advisories | Private security reports |

We do not currently maintain a Discord / Slack / WeChat group officially.
The project intentionally keeps coordination on GitHub for transparency.

---

## 9. Funding & Commercial Decisions / 资金与商业决策

DeepDesk is **non-commercial** at its core. We do not accept paid feature
requests. If donations or sponsorships become significant, the following
rules apply:

1. **No feature can be paywalled** in the open source distribution.
2. **No advertising** in the application.
3. **Future Pro version** (if any) requires a 30-day RFC and unanimous
   maintainer approval per Section 3.3.
4. **Sponsor logos** may appear in `README.md` and the website, but never
   in the application UI.

---

## 10. Updates / 更新

This document is updated by RFC. Each version is tagged in git history.

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03 | Initial governance model. |
