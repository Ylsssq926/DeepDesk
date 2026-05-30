/**
 * chat.deepseek.com 已知接口端点常量。
 *
 * @module src-injected/core/endpoints
 *
 * 数据来源：2026-05 通过 scripts/inspect-send.mjs 在真实登录页面发起一次对话，
 * 在浏览器网络层抓取到的真实接口。集中管理，供 interceptors / enhancers 引用，
 * DeepSeek 改版时只需在此处更新。
 *
 * 合规约束（PRD §1.6，必读）：
 *   - 仅用于「识别我们自己发出的请求」以便在响应完成后缓存自身结果（导出/存档）
 *   - 绝不修改请求体 / headers / token
 *   - 绝不触碰 PoW 相关接口（create_pow_challenge / sha3 wasm）：不读、不改、不绕过
 */

/** 对话主接口：SSE 流式返回助手回答。POST。 */
export const CHAT_COMPLETION = '/api/v0/chat/completion';

/** 新建会话。POST。 */
export const CHAT_SESSION_CREATE = '/api/v0/chat_session/create';

/** 拉取会话列表（分页）。GET。 */
export const CHAT_SESSION_FETCH_PAGE = '/api/v0/chat_session/fetch_page';

/** 当前用户信息。GET。 */
export const USERS_CURRENT = '/api/v0/users/current';

/**
 * ⛔ PoW 防滥用相关——合规红线，注入层绝不触碰（不读、不改、不重放、不绕过）。
 * 仅在此登记以便代码评审时显式排除。
 */
export const POW_FORBIDDEN = Object.freeze([
  '/api/v0/chat/create_pow_challenge',
  'sha3_wasm_bg', // PoW 的 SHA3 wasm 计算模块
]);

/** 判断某 URL 是否为对话主接口（用于拦截器 match，仅看路径，不读正文）。 */
export function isChatCompletion(url: string): boolean {
  return url.includes(CHAT_COMPLETION);
}

/** 判断某 URL 是否触碰了 PoW 红线（用于断言/防御性检查）。 */
export function isPowForbidden(url: string): boolean {
  return POW_FORBIDDEN.some((p) => url.includes(p));
}
