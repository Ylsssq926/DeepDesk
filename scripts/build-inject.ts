/* eslint-disable no-console */
/**
 * 编译注入脚本：src-injected/index.ts → dist-injected/bundle.js（IIFE）
 *
 * 用法：
 *   pnpm build:inject          # 单次构建
 *   pnpm build:inject:watch    # 监听模式
 */
import { build, context } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const watch = process.argv.includes('--watch');

const ENTRY = 'src-injected/index.ts';
const OUTFILE = 'dist-injected/bundle.js';

await mkdir(dirname(OUTFILE), { recursive: true });

const opts = {
  entryPoints: [ENTRY],
  outfile: OUTFILE,
  bundle: true,
  format: 'iife' as const,
  globalName: '__deepdesk_inject__',
  target: ['chrome120', 'safari15'],
  platform: 'browser' as const,
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  legalComments: 'inline' as const,
  banner: {
    js: '/* DeepDesk inject bundle — github.com/Ylsssq926/DeepDesk */',
  },
};

if (watch) {
  const ctx = await context(opts);
  await ctx.watch();
  console.log(`[build-inject] watching ${ENTRY} → ${OUTFILE}`);
} else {
  await build(opts);
  console.log(`[build-inject] built ${ENTRY} → ${OUTFILE}`);
}
