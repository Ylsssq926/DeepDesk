import { TitleBar } from '@/components/TitleBar';

/**
 * 应用主壳。
 *
 * 当前为骨架版本——后续会按 PRD 拆分为：
 *   - 主窗口（chat.deepseek.com WebView 占主体）
 *   - 侧栏（会话列表 / 工作区切换 / 设置入口）
 *   - 设置窗口（独立窗口）
 *   - 全局快捷键浮窗（独立 WebView）
 */
export default function App() {
  return (
    <div className="h-screen w-screen flex flex-col bg-bg-base text-fg-primary overflow-hidden">
      <TitleBar />

      <main className="flex-1 flex items-center justify-center content-region">
        <div className="text-center space-y-4 max-w-md p-8">
          <div className="text-2xl font-medium brand-gradient-text">DeepDesk</div>
          <p className="text-sm text-fg-secondary">
            Unofficial desktop client for chat.deepseek.com
            <br />
            <span className="text-fg-tertiary">非官方第三方桌面客户端</span>
          </p>

          <div className="text-2xs text-fg-tertiary border-t border-border pt-4">
            v0.1.0-alpha · 骨架阶段 · Components ready: 12
            <br />
            后续将逐步搭载 chat.deepseek.com WebView、注入引擎、对话二脑等模块
          </div>

          <a
            href="https://github.com/Ylsssq926/DeepDesk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-brand hover:text-brand-hover transition-colors"
          >
            github.com/Ylsssq926/DeepDesk →
          </a>
        </div>
      </main>
    </div>
  );
}
