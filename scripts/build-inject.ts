/* eslint-disable no-console */
/**
 * 编译注入脚本：src-injected/index.ts → dist-injected/bundle.js（IIFE）
 *
 * 用法：
 *   pnpm build:inject          # 单次构建
 *   pnpm build:inject:watch    # 监听模式（等价于 pnpm dev:inject）
 */
import { build, context, type Plugin } from 'esbuild';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { dirname } from 'node:path';

const watch = process.argv.includes('--watch');

const ENTRY = 'src-injected/index.ts';
const OUTFILE = 'dist-injected/bundle.js';

await mkdir(dirname(OUTFILE), { recursive: true });

// 注入脚本版本：从 package.json 读取，避免硬编码 / 与 npm 包版本漂移。
const pkg = JSON.parse(await readFile('package.json', 'utf8')) as { version: string };
const VERSION = pkg.version || '0.0.0-dev';

/**
 * watch 模式下每次 rebuild 完打印简短状态行，便于确认 watcher 正常工作。
 * 单次 build 不需要这个钩子，因为 esbuild 同步等待 build() 返回。
 */
const watchReportPlugin: Plugin = {
  name: 'deepdesk-inject-watch-report',
  setup(b) {
    let firstBuild = true;
    b.onEnd(async (result) => {
      const ts = new Date().toTimeString().slice(0, 8);
      if (result.errors.length > 0) {
        console.log(`[deepdesk-inject] rebuild FAILED at ${ts} (${result.errors.length} errors)`);
        return;
      }
      let bytes = 0;
      try {
        const s = await stat(OUTFILE);
        bytes = s.size;
      } catch {
        /* file might not exist yet on first failed build */
      }
      const tag = firstBuild ? 'built' : 'rebuilt';
      console.log(`[deepdesk-inject] ${tag} at ${ts} (${bytes} bytes)`);
      firstBuild = false;
    });
  },
};

const opts = {
  entryPoints: [ENTRY],
  outfile: OUTFILE,
  bundle: true,
  format: 'iife' as const,
  globalName: '__deepdesk_inject__',
  target: ['chrome120', 'safari15'],
  platform: 'browser' as const,
  minify: !watch,
  sourcemap: watch ? ('inline' as const) : false,
  legalComments: 'inline' as const,
  // esbuild 编译期常量替换：runtime.ts 里 typeof __BUILD_VERSION__ === 'string' 的检查
  // 在 build 时就能命中真实版本号，无需运行时拼接。
  define: {
    __BUILD_VERSION__: JSON.stringify(VERSION),
  },
  banner: {
    js: `/* DeepDesk inject bundle v${VERSION} — github.com/Ylsssq926/DeepDesk */`,
  },
  // 仅 watch 模式注册 onEnd 钩子；单次 build 无需逐次报告
  plugins: watch ? [watchReportPlugin] : [],
};

if (watch) {
  const ctx = await context(opts);
  await ctx.watch();
  console.log(`[build-inject] watching ${ENTRY} → ${OUTFILE} (v${VERSION})`);
} else {
  await build(opts);
  console.log(`[build-inject] built ${ENTRY} → ${OUTFILE} (v${VERSION})`);
}
