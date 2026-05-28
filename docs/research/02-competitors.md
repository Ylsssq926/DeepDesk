# 竞品与 DeepSeek 现状调研

> 调研时间：2026 年 3 月  
> 方案前提：桌面壳加载 chat.deepseek.com（网页嵌入），非 API 重做 UI

## 一、DeepSeek 官方现状

### 1.1 桌面客户端：至今（2026-03）仍无
- 官方仅有网页版 + iOS/Android App，**没有 PC 客户端**
- 来源：[Webeeky 2026 PC 指南](https://webeeky.com/deepseek-for-pc/)、[DeepSeek 官网](https://www.deepseek.com/en/)
- 这是套壳客户端项目存在的根本市场空隙

### 1.2 chat.deepseek.com 当前功能
| 功能 | 状态 |
|------|------|
| 默认模型 | DeepSeek-V4-Pro（2026-04-24，1M 上下文 / 384K 最大输出） |
| 推理模式 | Non-Thinking / Thinking / 混合（V4 原生 Thinking Mode） |
| 联网搜索 | ✅ |
| 深度思考 R1 / V4 Thinking | ✅ |
| 文件上传（PDF/图片/文本） | ✅ |
| 多模态视觉（基于 DeepSeek-VL2 / OCR 系列） | ✅ |
| 跨设备同步 | ✅ |
| 对话管理 | ❌ 仅基础列表+重命名+删除（无文件夹/标签/置顶/分支） |
| 导出对话 | ❌ 官方无导出 |

### 1.3 登录与鉴权
- **支持**：邮箱、Google、+86 手机号
- **不支持**：微信登录
- **鉴权**：Cookie + Session + JWT 风格 Token 混合
- **Cookie 政策**：[DeepSeek Cookies Policy](https://cdn.deepseek.com/policies/en-US/cookies-policy.html)

### 1.4 反第三方与安全机制
- **Cloudflare 风格人机验证**："One more step before you proceed..."
- **PoW 人机验证**：第三方逆向项目 [lzA6/Deepseek-2api](https://github.com/lzA6/Deepseek-2api) 卖点之一是"攻克 PoW 人机验证"
- **iframe 嵌入风险**：响应头含 `Content-Security-Policy: frame-ancestors 'self'` 和 `X-Frame-Options: SAMEORIGIN`，**普通跨站 iframe 嵌入会被浏览器拒绝**
  - 这就是为什么所有套壳项目用 Electron BrowserWindow / Tauri WebView，**不是用 `<iframe>`**
- **UA 检测**：未观察到强 UA 屏蔽，Electron/Tauri 默认 UA 可正常加载

## 二、已有第三方桌面客户端竞品

### 2.1 直接竞品（套壳 chat.deepseek.com）

| 项目 | Star | 技术栈 | 最近更新 | 独特功能 | 评价 |
|------|------|--------|---------|---------|------|
| [doxdk/deepseek-desktop](https://github.com/doxdk/deepseek-desktop) | 259 | Electron | 2025-01 后停滞 | 仅 Win，Mac/Linux 承诺未兑现 | 基础壳 |
| [code3-dev/deepseek-desktop](https://github.com/code3-dev/deepseek-desktop) | 17 | Electron | 2025-02 v1.8.0 | Splash 启动页、菜单栏 | 基础壳 |
| [devedale/deepseek-desktop-version](https://github.com/devedale/deepseek-desktop-version) | 28 | Electron | 2025-02 v1.0.0 | "Security-Focused"（实质只有壳） | 基础壳 |
| [tanvirmahfuz100/deepseek-app](https://github.com/tanvirmahfuz100/deepseek-app) | 0 | Electron | 2025-03 | **托盘+Alt+Space 全局唤起+Alt+Shift+N 新对话+Linux 自启** | **唯一加了价值层** |
| [kenvandine/deepseek-desktop](https://github.com/kenvandine/deepseek-desktop) | 0 | Snap webapp | 2025-01 | Linux Snap 包装 | 基础壳 |

**结论**：直接竞品都很弱——最高 Star 259，**没有任何一个项目把"桌面化体验"做完整**（托盘+全局唤起+多账号+导出+主题+本地缓存基本全缺）。

### 2.2 多模型聚合客户端（API 模式，间接竞品）

| 项目 | Star | 技术栈 | 对 DeepSeek 接入方式 | 桌面版 |
|------|------|--------|---------------------|--------|
| [NextChat](https://github.com/ChatGPTNextWeb/NextChat) | 88.1k | Next.js + Tauri | API（OpenAI 兼容 + DeepSeek key） | ✅ Tauri |
| [LobeChat](https://github.com/lobehub/lobe-chat) | 77.8k | Next.js + React | API（DeepSeek 内置 provider） | ✅ Electron |
| [CherryHQ/cherry-studio](https://github.com/cherryhq/cherry-studio) | 46.4k | Electron | API（300+ 模型） | ✅ |
| [chatboxai/chatbox](https://github.com/chatboxai/chatbox) | 40.1k | Electron + Vite + React | API（已支持 deepseek-reasoner 工具调用） | ✅ |
| [ThinkInAIXYZ/deepchat](https://github.com/ThinkInAIXYZ/deepchat) | 5.8k | Electron | API + 本地模型 | ✅ |

**结论**：API 模式需用户自备 key 付费。**网页路线的核心价值是"白嫖官方账号体系：免费、不限量、自带联网+R1+V4、永远跟最新模型"**。两条路是不同的市场。

### 2.3 商业套壳产品
- [WebCatalog DeepSeek](https://webcatalog.io/en/apps/deepseek)：套壳 chat.deepseek.com 的商业产品，卖点是"distraction-free window、faster app switching、多账号管理"——**它的卖点恰好就是用户痛点的真实映射**

### 2.4 其他周边
- [DeepLifeStudio/DeepSeekAI](https://github.com/DeepLifeStudio/DeepSeekAI)：浏览器扩展
- [LLM-Red-Team/deepseek-free-api](https://github.com/LLM-Red-Team/deepseek-free-api) / [lzA6/Deepseek-2api](https://github.com/lzA6/Deepseek-2api)：把网页 cookie 包成 OpenAI 兼容 API 的逆向项目（有合规风险，**不要做**）
- [ypyf/deepseek-chat-exporter](https://github.com/ypyf/deepseek-chat-exporter)：导出对话脚本，**说明导出是真实高频需求**

## 三、用户痛点（V2EX、HN、知乎、扩展商店反馈）

按强度排序：

1. **"服务器繁忙，请稍后再试"频繁出现** — 全网最大抱怨
2. **没有快速唤起，每次要打开浏览器→新建标签页→点书签**
3. **没有托盘常驻、没有窗口置顶、没有迷你浮窗**
4. **对话历史无法导出**（官方完全不提供，催生了至少 5 个第三方导出脚本/扩展）
5. **多账号切换困难**
6. **多窗口/多对话并行差**（网页只能单标签页深度使用）
7. **本地敏感信息泄露顾虑**（参考 [Ropes & Gray 法律分析](https://www.ropesgray.com/en/insights/alerts/2025/01/deepseek-legal-considerations-for-enterprise-users)）
8. **公式/代码块渲染、长对话卡顿**

### 次要痛点
- 邮箱域名注册被拒（小众邮箱）
- 联网搜索 token 不稳定
- 模型版本切换混乱（R1、V3、V3.2、V4-Pro、V4-Flash 来回跳）
- 国际用户网络抖动

## 四、法律与合规

### 4.1 DeepSeek 官方条款
来源：[DeepSeek Terms of Use（2026-03-27）](https://cdn.deepseek.com/policies/en-US/deepseek-terms-of-use.html)

| 条款 | 解读 |
|------|------|
| 3.5(3) 禁止逆向工程、抓取/爬虫/镜像 | 用 WebView 加载、不抓 DOM、不模拟请求 → 不构成爬虫；做"自动重试"、"DOM 注入导出"、"绕 PoW" → **触线** |
| 3.6(4) 未经授权不得复制、转让、出售、再许可 | **若收费分发，几乎肯定违反**；免费开源 + 用户自己账号 → 灰色地带 |
| 6.2 禁止未经许可使用商标 | 不能用 "DeepSeek Desktop / DeepSeek for Mac"，需独立品牌 + 标注 "Unofficial" |
| 3.1 授权可撤销 | 官方有权关停账号/封 UA/IP，客户端必须能优雅降级 |

### 4.2 类似先例
- [lencx/ChatGPT](https://github.com/lencx/ChatGPT)（54k Star，Tauri 套壳 ChatGPT 网页）—— **没有被 OpenAI 投诉下架**，作者主动停更，原因是 OpenAI 推出官方桌面应用后差异化丧失
- WeChat for Mac 早期曾是 WebKit 套壳
- WebCatalog 公开把 chat.deepseek.com 商业化售卖至今正常运营

### 4.3 合规底线（必须守住）
1. ✅ 用 WebView 加载、用户自己 cookie 登录 — 与浏览器访问等价
2. ❌ **不要做** DOM 抓取/协议代理/PoW 绕过/代登录
3. ❌ **不要用** "DeepSeek Desktop" 等带商标的名字，起独立品牌名 + 显著标注 "Unofficial / Not affiliated with DeepSeek"
4. ❌ 不附带预装账号、不卖账号、不在客户端做计费
5. ✅ 开源、免费、MIT/Apache 许可
6. ✅ 自动更新走 GitHub Releases 或自建源，不冒充官方

## 五、关键洞察

1. **市场窗口期 6-12 个月**：官方至今无桌面客户端，竞品最强者 259 Star，做完整就能拿第一名
2. **网页路线 vs API 路线是两个市场**：API 路线已是红海（Lobe 77.8k、Chatbox 40k、Cherry 46k），不要混着做
3. **真正差异化在"WebView 之上的原生层"**：托盘、快捷键、多账号、本地导出、自动重试、主题
4. **Tauri > Electron**：lencx/ChatGPT 选 Tauri 做到 54k Star，包体小 10 倍、内存小 3-5 倍
5. **合规底线明确**：禁止 DOM 抓取/协议代理/PoW 绕过/带商标，守住即与浏览器访问等价

## 关键来源链接

- DeepSeek 官方：[首页](https://www.deepseek.com/en/) | [服务条款](https://cdn.deepseek.com/policies/en-US/deepseek-terms-of-use.html) | [Cookies Policy](https://cdn.deepseek.com/policies/en-US/cookies-policy.html) | [FAQ](https://api-docs.deepseek.com/faq)
- 套壳直接竞品：[doxdk](https://github.com/doxdk/deepseek-desktop) | [tanvirmahfuz100](https://github.com/tanvirmahfuz100/deepseek-app)
- API 间接竞品：[NextChat](https://github.com/ChatGPTNextWeb/NextChat) | [LobeChat](https://github.com/lobehub/lobe-chat) | [Cherry Studio](https://github.com/cherryhq/cherry-studio) | [ChatBox](https://github.com/chatboxai/chatbox)
- 合规先例：[lencx/ChatGPT](https://github.com/lencx/ChatGPT) | [WebCatalog](https://webcatalog.io/en/apps/deepseek)
- 用户痛点证据：[V2EX 1114718](https://www.v2ex.com/t/1114718) | [自动重试 Chrome 扩展](https://chromewebstore.google.com/detail/deepseek-server-busy/ilmchkjknlgjdlcokfepanfibdbifkbh) | [对话导出脚本](https://github.com/ypyf/deepseek-chat-exporter)
