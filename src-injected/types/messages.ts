/**
 * 与 Tauri 主进程之间收发的消息类型定义。
 *
 * @module src-injected/types/messages
 * @see docs/ARCHITECTURE.md §5 IPC 协议
 *
 * 合规约束：
 *   - 这些 payload 只携带「我们自己捕获到的请求/响应元信息」与「用户主动行为信号」
 *   - 不包含任何抓取自 chat.deepseek.com 业务 DOM 的数据
 *
 * 不变量：
 *   - Rust 端结构体（src-tauri/src/db/models.rs 等）与本文件一一对应；
 *     升级时必须同步两端
 */

/** 注入脚本 → Rust 的事件名命名空间。 */
export type InjectEmitEvent =
  | 'inject:ready'
  | 'inject:module-error'
  | 'inject:version-mismatch'
  | 'inject:selector-miss'
  | 'webview://message-completed'
  | 'message:captured'
  | 'retry:attempt'
  | 'mermaid:rendered'
  | 'slash:menu-opened'
  | 'draft:saved'
  | 'message:retracted';

/** Rust → 注入脚本的事件名命名空间。 */
export type InjectListenEvent =
  | 'settings:updated'
  | 'inject:updated'
  | 'feature-flag:set'
  | 'conversation:updated'
  | 'screenshot:captured'
  | 'ocr:completed';

/** Tauri command 名称（前端 → Rust）。 */
export type TauriCommand =
  | 'save_message'
  | 'get_messages'
  | 'search_history'
  | 'get_settings'
  | 'update_settings'
  | 'cache_sse_chunks'
  | 'list_prompt_templates'
  | 'render_template'
  | 'get_custom_instructions'
  | 'set_custom_instructions'
  | 'save_draft'
  | 'load_draft';

/** inject:ready 事件 payload。 */
export interface InjectReadyPayload {
  version: string;
  /** UNIX 毫秒时间戳。 */
  startedAt: number;
  /** 启动时已成功初始化的 enhancer 名称列表。 */
  enhancers: string[];
  /** WebView 当前 URL，便于主进程做诊断。 */
  href: string;
  userAgent: string;
}

/** inject:module-error 事件 payload。 */
export interface InjectModuleErrorPayload {
  module: string;
  error: string;
  /** 可选的更深层堆栈（仅开发模式下上报）。 */
  stack?: string;
}

/** inject:selector-miss 事件 payload，用于监控 chat.deepseek.com 改版。 */
export interface InjectSelectorMissPayload {
  /** 选择器逻辑名称（如 'chatInput' / 'messageList'）。 */
  name: string;
  /** 此次查询是否最终命中（true 表示某个 fallback 命中，false 表示全部失败）。 */
  hit: boolean;
  /** 累计命中次数。 */
  totalHits: number;
  /** 累计未命中次数。 */
  totalMisses: number;
}

/**
 * 与 chat.deepseek.com 自身请求/响应解耦的消息记录 payload。
 *
 * 这是「我们自己请求的结果」缓存到本地的标准化形态。
 *
 * @remark 字段集合保持与 docs/ARCHITECTURE.md §5.3 MessagePayload 同步
 */
export interface MessagePayload {
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string | null;
  model?: string | null;
  /** UNIX 毫秒。 */
  timestamp: number;
}

/** settings:updated 事件 payload（部分字段，注入脚本只关心一小部分）。 */
export interface InjectRelevantSettings {
  immersive_mode?: boolean;
  auto_retry?: boolean;
  retry_max_attempts?: number;
  /** 注入脚本侧 feature flags 远程同步。 */
  inject_feature_flags?: Record<string, boolean>;
}

/** feature-flag:set 事件 payload。 */
export interface FeatureFlagSetPayload {
  name: string;
  enabled: boolean;
}
