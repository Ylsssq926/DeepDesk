/**
 * SSE 流解析工具：把 ReadableStream 解析为 SSEEvent 异步迭代器。
 *
 * @module src-injected/interceptors/sse
 * @see docs/ARCHITECTURE.md §4.3 SSE 流拦截与对话存档
 *
 * 合规约束：
 *   - 仅解析「调用方传入的流」，自身不主动读取任何请求
 *   - 解析失败时降级为空字符串，不打断流的读取
 *   - 不在日志中输出 chunk 正文（防止日志泄露用户文本）
 *
 * 不变量：
 *   - 标准 SSE 协议：行以 \n 或 \r\n 分隔；一个事件以空行结束
 *   - `data:` 前缀后允许 0 或 1 个空格
 *   - 流被中断（reader 抛错）时 generator 正常结束，不向上传播错误
 */

import type { SSEEvent } from '../types/deepseek';
import { createLogger } from '../utils/logger';
import { asError } from '../utils/safe-call';

const log = createLogger('interceptor:sse');

/**
 * 把 ReadableStream<Uint8Array> 解析为 SSEEvent 异步迭代器。
 *
 * 用例：
 * ```ts
 * for await (const evt of parseSSEStream(response.body!)) {
 *   if (evt.data === '[DONE]') break;
 *   // 处理 evt.data（JSON 字符串）
 * }
 * ```
 */
export async function* parseSSEStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SSEEvent, void, void> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  /** 当前事件的累积字段。 */
  let event = '';
  let dataLines: string[] = [];
  let id: string | undefined;
  let retry: number | undefined;

  const dispatch = (): SSEEvent | null => {
    if (dataLines.length === 0 && !event && id === undefined && retry === undefined) {
      return null;
    }
    const evt: SSEEvent = {
      event: event || 'message',
      data: dataLines.join('\n'),
    };
    if (id !== undefined) evt.id = id;
    if (retry !== undefined) evt.retry = retry;
    // reset
    event = '';
    dataLines = [];
    id = undefined;
    retry = undefined;
    return evt;
  };

  try {
    while (true) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (err) {
        log.warn('SSE reader read() failed (likely cancelled):', asError(err));
        return;
      }
      const { done, value } = chunk;
      if (done) {
        // flush trailing buffer as one last event
        if (buffer) {
          const evt = parseLine(buffer);
          if (evt) yield evt;
          buffer = '';
        }
        const final = dispatch();
        if (final) yield final;
        return;
      }
      if (!value) continue;

      buffer += decoder.decode(value, { stream: true });

      // SSE 协议：以 \n 或 \r\n 分隔行，空行表示一个事件结束
      let nlIdx = findLineEnd(buffer);
      while (nlIdx !== -1) {
        // nlIdx 指向 \n。若前一字符是 \r，则该行实际以 \r\n 结尾，line 不应包含 \r。
        const hasCr = nlIdx > 0 && buffer.charCodeAt(nlIdx - 1) === 13;
        const line = buffer.slice(0, hasCr ? nlIdx - 1 : nlIdx);
        buffer = buffer.slice(nlIdx + 1);

        if (line === '') {
          const evt = dispatch();
          if (evt) yield evt;
        } else {
          applyLine(line);
        }
        nlIdx = findLineEnd(buffer);
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* lock 释放失败可以忽略 */
    }
  }

  // helpers in closure
  function applyLine(line: string): void {
    // 注释行
    if (line.startsWith(':')) return;
    const colon = line.indexOf(':');
    let field: string;
    let val: string;
    if (colon === -1) {
      field = line;
      val = '';
    } else {
      field = line.slice(0, colon);
      val = line.slice(colon + 1);
      if (val.startsWith(' ')) val = val.slice(1);
    }
    switch (field) {
      case 'event':
        event = val;
        break;
      case 'data':
        dataLines.push(val);
        break;
      case 'id':
        id = val;
        break;
      case 'retry': {
        const n = Number.parseInt(val, 10);
        if (Number.isFinite(n)) retry = n;
        break;
      }
      default:
        // 未知字段：协议要求忽略
        break;
    }
  }
}

/** 解析单独的一行（处理 buffer 末尾边界）。 */
function parseLine(line: string): SSEEvent | null {
  if (!line || line.startsWith(':')) return null;
  if (line.startsWith('data:')) {
    const v = line.slice(5).trimStart();
    return { event: 'message', data: v };
  }
  return null;
}

/** 查找下一行的结束位置（即 `\n` 的索引）；找不到返回 -1。
 *  调用方需自行判断 `\n` 前一个字符是否为 `\r` 以兼容 `\r\n`。 */
function findLineEnd(s: string): number {
  return s.indexOf('\n');
}
