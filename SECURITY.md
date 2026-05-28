# Security Policy / 安全策略

## Reporting a Vulnerability / 报告安全漏洞

**⚠️ DO NOT open a public GitHub issue for security vulnerabilities.**
**⚠️ 请勿在公开 GitHub issue 中报告安全漏洞。**

If you discover a security issue in DeepDesk, please report it privately:

如果你发现 DeepDesk 中的安全问题，请通过以下私密渠道报告：

1. **Preferred**: [GitHub Security Advisories](https://github.com/Ylsssq926/DeepDesk/security/advisories/new)
   （优先方式）
2. **Email**: 暂未设立专用安全邮箱；请使用 GitHub Security Advisories
   或 issue 标 `[security-private]`（仅维护者可见）。

---

## Response Timeline / 响应承诺

| Stage | Target |
|-------|--------|
| Acknowledge receipt | within **72 hours** |
| Initial triage & severity assessment | within **7 days** |
| Patch released for critical issues | within **14 days** |
| Patch released for high-severity issues | within **30 days** |
| CVE coordination (if applicable) | within **90 days** |

We will keep you informed of our progress throughout the process.

我们承诺在确认收到 72 小时内回复你，7 天内完成初步定级，14-30 天内发布
补丁（视严重程度而定）。

---

## Supported Versions / 支持的版本

| Version | Supported |
|---------|-----------|
| Latest stable (`main` release) | ✅ |
| Previous stable (`v0.N - 1`) | ⚠️ Critical fixes only |
| Older | ❌ |

---

## Scope / 报告范围

We accept reports for the following categories:

我们接受以下类别的安全问题报告：

✅ **In scope:**
- Inject script sandbox escape (注入脚本逃逸)
- Local data leakage / unauthorized access (本地数据泄露 / 越权访问)
- Tauri Capability misconfiguration / IPC bypass
- Supply-chain vulnerabilities in our dependencies
- Code execution vulnerabilities in updater / signature verification
- Authentication bypass for the encrypted-vault feature (V1)
- Trademark / impersonation reports related to the DeepDesk Brand

❌ **Out of scope:**
- Security issues in chat.deepseek.com itself — please report directly to
  [DeepSeek's security team](https://www.deepseek.com).
- Issues that require physical access to an unlocked, signed-in device.
- Self-inflicted issues from running modified, unofficial builds.
- Findings that require chained exploits not present in DeepDesk's threat
  model (we'll evaluate these case by case).

chat.deepseek.com 自身的安全问题**不**在本范围内，请直接向 DeepSeek 官方
安全团队报告。

---

## Hall of Fame / 致谢

We publicly thank security researchers who report valid issues (with their
permission). After a fix is released, your name will be added to
`SECURITY-Hall-of-Fame.md` in the repository.

---

## Disclosure Policy / 披露政策

We follow **coordinated disclosure**:

1. We will work with you privately to confirm and reproduce the issue.
2. We will develop a fix and prepare a release.
3. After the patched release is publicly available, we will publish a
   security advisory crediting you (if you wish), describing the issue,
   and any necessary user actions.
4. We may request a brief embargo (typically up to 90 days) for
   coordination if the issue impacts a wide downstream ecosystem.

We will not pursue legal action against researchers who follow this policy
in good faith.

我们采用**协调披露**模式：先私下修复 → 发布补丁 → 公开公告（致谢报告者）→
必要时协调最长 90 天的禁令期。我们承诺不对遵循本政策的善意研究者采取法律行动。

---

## Security Best Practices for Users / 用户安全最佳实践

- Always download DeepDesk from the official GitHub Releases page:
  https://github.com/Ylsssq926/DeepDesk/releases
- Verify the SHA-256 hash of installers (published in each release).
- On macOS, verify the build is signed by the official developer ID.
- Enable database encryption (V1) if you store sensitive conversations.
- Keep DeepDesk updated to the latest version.

请务必从官方仓库下载，校验 SHA-256，定期更新。
