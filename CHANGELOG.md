# Changelog

All notable changes to DeepDesk will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project scaffolding (Tauri 2.x + React 19 + TypeScript + Tailwind v4)
- Design tokens following `docs/UI-SKILL.md` (蓝青白配色方案)
- Custom title bar with macOS/Windows/Linux platform detection
- System tray with show/hide and quit menu items
- Global shortcut (Cmd/Ctrl+Shift+K) to toggle main window
- Inject script entry point (skeleton)
- Theme store (light/dark/system) with persistence
- Comprehensive documentation:
  - `docs/PRD.md` — Product requirements (50+ features)
  - `docs/ARCHITECTURE.md` — Technical design
  - `docs/UI-SKILL.md` — UI design authoritative guide
  - `docs/LICENSE-STRATEGY.md` — Open source strategy
  - 6 research documents in `docs/research/`
- Legal & governance:
  - `LICENSE` (AGPL-3.0)
  - `NOTICE`, `DISCLAIMER.md`, `TRADEMARK.md`
  - `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `GOVERNANCE.md`
  - GitHub issue/PR templates
  - CI workflow + DCO check workflow

### Notes
- This is the project skeleton. Functional features will be built on top of
  this foundation across upcoming releases.
- See `SETUP.md` for development environment setup.

[Unreleased]: https://github.com/Ylsssq926/DeepDesk/commits/main
