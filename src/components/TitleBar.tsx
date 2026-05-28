import { Window } from '@tauri-apps/api/window';
import { Minus, Square, X, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * 自定义标题栏。
 *
 * - macOS：保留原生 traffic light（在 Rust 端配置 titleBarStyle: "Overlay"），
 *   此组件只显示标题与右侧空间。
 * - Windows / Linux：自绘最小/最大/关闭按钮。
 *
 * 详见 docs/UI-SKILL.md §6.1
 */
export function TitleBar() {
  const [platform, setPlatform] = useState<'macos' | 'windows' | 'linux' | 'unknown'>('unknown');
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    // 平台检测：Tauri 2 提供 os plugin，但延迟加载以减小首屏 bundle
    import('@tauri-apps/plugin-os').then(({ platform: getPlatform }) => {
      const p = getPlatform();
      if (p === 'macos') setPlatform('macos');
      else if (p === 'windows') setPlatform('windows');
      else if (p === 'linux') setPlatform('linux');
    }).catch(() => setPlatform('unknown'));

    const win = Window.getCurrent();
    win.isMaximized().then(setMaximized);
    const unlisten = win.onResized(() => {
      win.isMaximized().then(setMaximized);
    });
    return () => {
      unlisten.then((u) => u());
    };
  }, []);

  const win = Window.getCurrent();

  return (
    <header
      data-tauri-drag-region
      className={cn(
        'h-9 flex items-center select-none',
        'bg-bg-elevated/80 backdrop-blur',
        'border-b border-border'
      )}
    >
      {/* macOS：左侧给 traffic light 留出 68px 空间 */}
      {platform === 'macos' && <div className="w-[68px] shrink-0" />}

      {/* 标题区（可拖拽） */}
      <div
        data-tauri-drag-region
        className="flex-1 flex items-center justify-center text-2xs text-fg-secondary"
      >
        <span data-tauri-drag-region>DeepDesk</span>
        <span
          data-tauri-drag-region
          className="ml-2 px-1.5 py-0.5 rounded-xs text-[10px] bg-bg-hover text-fg-tertiary"
        >
          Unofficial
        </span>
      </div>

      {/* Windows / Linux：右侧自绘按钮 */}
      {platform !== 'macos' && (
        <div className="flex items-center h-full">
          <TitleBarButton onClick={() => win.minimize()} aria-label="Minimize">
            <Minus size={14} />
          </TitleBarButton>
          <TitleBarButton
            onClick={() => (maximized ? win.unmaximize() : win.maximize())}
            aria-label={maximized ? 'Restore' : 'Maximize'}
          >
            {maximized ? <Copy size={12} /> : <Square size={12} />}
          </TitleBarButton>
          <TitleBarButton onClick={() => win.hide()} aria-label="Close" hover="danger">
            <X size={14} />
          </TitleBarButton>
        </div>
      )}

      {/* 右侧空间（macOS 平衡左侧） */}
      {platform === 'macos' && <div className="w-[68px] shrink-0" />}
    </header>
  );
}

function TitleBarButton({
  children,
  onClick,
  hover = 'normal',
  ...rest
}: React.ComponentProps<'button'> & { hover?: 'normal' | 'danger' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-full w-11 flex items-center justify-center',
        'text-fg-secondary transition-colors duration-fast',
        hover === 'danger'
          ? 'hover:bg-danger hover:text-white'
          : 'hover:bg-bg-hover hover:text-fg-primary'
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
