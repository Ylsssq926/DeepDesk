# Tauri Icons

Tauri 构建需要这些图标文件。**当前目录为空** — 请按以下步骤生成。

## 一次性生成

确保已装 [Tauri CLI](https://v2.tauri.app/reference/cli/)：

```bash
# 从 assets/brand/logo.svg 生成全套图标
pnpm tauri icon ../../assets/brand/logo.svg
```

这会自动生成：
- `32x32.png` / `128x128.png` / `128x128@2x.png`（Linux）
- `icon.ico`（Windows）
- `icon.icns`（macOS）
- 以及其他尺寸

## 为什么不直接 commit 二进制

为了保持仓库轻量，PNG/ICO/ICNS 等二进制图标不入仓。
首次 `pnpm install` 后跑一次上面的命令即可。

CI 流程会在 build 前自动生成（见 `.github/workflows/`）。

## 设计准则

详见 `docs/UI-SKILL.md` 与 `TRADEMARK.md`：
- 使用蓝青白配色（hue 215-220）
- 不使用紫色
- 不模仿 DeepSeek 鲸鱼元素
- 单色 SVG 必须支持 macOS template image 自动 invert
