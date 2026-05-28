/**
 * chat.deepseek.com 公开可观察数据结构（仅描述自身请求结果中的字段）。
 *
 * @module src-injected/types/deepseek
 * @see docs/ARCHITECTURE.md §4.3 SSE 流拦截与对话存档
 *
 * 合规约束：
 *   - 本文件描述的所有字段都基于「用户自身发起的 chat completion 请求所返回的 SSE 流」
 *   - **不**包含从 DOM 抓取的业务数据
 *   - **不**包含其他用户、其他会话或服务端内部状态字段
 *
 * 不变量：
 *   - 这些字段属于 chat.deepseek.com 的非承诺接口，可能随官方升级而变化
 *   - 解析失败时调用方必须降级为「空字符串」而非抛错（参见 interceptors/sse.ts）
 */

/** 一条原始 SSE 行解析后的事件（与 EventStream 协议保持一致）。 */
export interface SSEEvent {
  /** event: <name> 行；缺省时为 'message'。 */
  event: string;
  /** data: 行（已去除 'data: ' 前缀），可能是 JSON 字符串或 `[DONE]` 等哨兵。 */
  data: string;
  /** id: 行（如有）。 */
  id?: string;
  /** retry: 行（如有），单位 ms。 */
  retry?: number;
}

/**
 * DeepSeek chat completion SSE 流中 `data` 字段 JSON 解析后的形态。
 *
 * 基于公开可观察的 SSE 字段，可能随官方升级而变化。
 */
export interface DeepSeekChatChunk {
  /** 服务端生成的 chunk id（可选）。 */
  id?: string;
  /** 模型名（如 'deepseek-v4-pro'）。 */
  model?: string;
  /** 当前 chunk 的增量内容容器。 */
  choices?: Array<{
    index?: number;
    delta?: DeepSeekDelta;
    /** 终止原因（如 'stop' / 'length'）。 */
    finish_reason?: string | null;
  }>;
  /** 用法统计（仅最末包出现）。 */
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/** delta 段，区分正文与思考链。基于公开可观察的 SSE 字段，可能随官方升级而变化。 */
export interface DeepSeekDelta {
  role?: 'assistant';
  /** 正文 markdown 增量。 */
  content?: string;
  /** Thinking / 思考链增量（DeepSeek-R1 / V4 系列）。 */
  reasoning_content?: string;
}

/**
 * 我们对一次完整 SSE 流的聚合结果，供后端入库。
 * 字段全部来自当前用户自己的请求/响应，不涉及任何 DOM 抓取。
 */
export interface AggregatedAssistantMessage {
  content: string;
  thinking: string;
  model: string | null;
  /** 终止原因，便于诊断（'stop' / 'length' / 'cancel' / 'error'）。 */
  finishReason: string | null;
  /** 收到的 chunk 数，用于统计与诊断。 */
  chunkCount: number;
  /** 是否完整结束（收到 `[DONE]` 或 finish_reason 非空）。 */
  completed: boolean;
}
