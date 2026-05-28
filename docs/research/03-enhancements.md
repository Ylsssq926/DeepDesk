# 增强能力调研报告

> 调研时间：2026 年 3 月  
> 技术方案：Tauri 套壳 chat.deepseek.com

## 一、桌面客户端相比浏览器的天然优势

| # | 能力 | 解决的痛点 |
|---|------|-----------|
| 1 | 系统托盘 / Dock 常驻 | 不被淹没在浏览器标签 |
| 2 | 全局快捷键唤起（如 Cmd+Shift+K） | 任意应用一键唤起，无切换上下文 |
| 3 | 系统级通知 | 长回答完成时推送通知 |
| 4 | 文件拖拽上传 + 系统右键菜单 | 拖拽即上传；右键文件"用 DeepSeek 解释" |
| 5 | 剪贴板监听 / 划词快速提问 | 选中文本 + 快捷键自动发送 |
| 6 | 多账号 / 多窗口（独立 Cookie 容器） | 个人/工作账号互不干扰 |
| 7 | 离线对话存档 / 全文搜索本地历史 | 网页删除也不丢；全文检索 |
| 8 | 字体、主题、字号自定义（CSS 注入） | 暗色主题、大字体、代码高亮 |
| 9 | 屏蔽广告 / 营销弹窗 | 减少干扰 |
| 10 | 启动直达新对话页 | 跳过首页/营销页 |
| 11 | 截图工具集成 → OCR → 自动提问 | "看到不懂截图即问" |
| 12 | 沉浸式专注模式 | 隐藏侧边栏/导航栏，最大化对话区 |

## 二、类似产品功能取经

### 2.1 [Pake](https://github.com/tw93/pake)（49.3k Star）通用网页套壳

- 全局快捷键唤起
- 系统托盘常驻
- 沉浸式无边框窗口
- 自定义 CSS/JS 注入
- 窗口置顶（Always-on-top）
- 开机自启
- 窗口尺寸/位置记忆
- 极小体积（~3MB）

### 2.2 [lencx/ChatGPT](https://github.com/lencx/ChatGPT) Tauri 桌面版 ChatGPT

- **导出对话历史**：PNG / PDF / Markdown 三种格式
- 系统托盘悬浮窗
- **Slash 命令系统**：输入 `/` 触发预设 Prompt 模板
- 全局快捷键
- 多 WebView 架构（标题栏、主内容、Ask 输入区独立 WebView）
- 窗口置顶
- 主题切换（系统/亮/暗）
- 自动升级通知
- **划词搜索弹窗**：选中文本（≤400字）自动弹搜索窗
- 自定义 URL 包装（任意网站 → 桌面应用）

参考：[DeepWiki 文档](https://deepwiki.com/lencx/ChatGPT)

### 2.3 [lencx/Noi](https://github.com/lencx/Noi) 多 AI 统一桌面

- **多窗口并行管理**：同时打开 ChatGPT、Claude、DeepSeek
- **会话隔离（分区 Cookie）**：每个窗口独立会话
- **NoiAsk Prompt 管理**：100+ 人格模板
- 内置终端（NSH）
- CLI 接口（外部工具可通过 IPC 控制）
- Chrome 扩展兼容
- 本地优先数据存储

### 2.4 [ChatBox](https://docs.chatboxai.app/en)

- 多模型同时对话
- 对话导出（Markdown / HTML / TXT）
- 文件解析（PDF / Word / Excel / 图片）
- 代码实时预览（类似 Artifacts）
- 联网搜索
- AI 图像生成
- Mermaid 图表
- 本地数据存储
- 参数精调（temperature、max tokens）
- 跨平台同步（Premium）

### 2.5 [Cherry Studio](https://github.com/CherryHQ/cherry-studio)（46.4k Star）

- 300+ 预设智能体
- **知识库系统**：导入 PDF/DOCX/TXT 创建可检索知识库
- 多模型统一接入
- AI 翻译
- 云同步（WebDAV、坚果云、Dropbox）
- 透明窗口模式
- Prompt 管理
- AI 绘图
- 自主智能体
- 企业版（管理后台、模型访问控制）

### 2.6 [Raycast AI](https://raycast.com/ai)

- **Quick AI**：全局热键浮窗，即时提问，答案直接显示在搜索栏
- AI Chat（32+ 模型，自定义系统指令）
- **AI Commands**：30+ 内置命令（修正语法、解释代码、总结网页、改变语气）
- 上下文集成（PDF/CSV/屏幕）
- AI Extensions（自然语言控制 OS 和第三方应用）
- 模型比较（同对话用不同模型重新生成）
- BYOK
- 剪贴板集成

### 2.7 [Arc Max](https://arc.net/max)

- **5 Second Previews**：Shift+悬停链接 → AI 生成预览摘要
- Ask on Page（对当前页面提问）
- Tidy Tab Titles（AI 自动重命名标签）
- Tidy Downloads（自动重命名下载文件）
- Ask ChatGPT（命令栏直接调用）
- **Boosts**：注入自定义 CSS/JS 修改任意网站

### 2.8 [Sider](https://sider.ai/) / [Monica](https://monica.im/) 浏览器侧边栏 AI

- 侧边栏多模型对话
- 划词解释/翻译
- 网页/视频摘要（YouTube）
- 全页翻译（双栏对照）
- PDF/文档交互
- Wisebase 知识库
- AI 写作助手
- OCR 文本提取
- 会议录音摘要

## 三、注入式增强的技术可行性

### 3.1 CSS/JS 注入

| 技术 | 可行性 | 实现 |
|------|-------|------|
| **Electron** | ✅ 完全可行 | `webContents.insertCSS(css)` / `webContents.executeJavaScript(code)`，preload 脚本可访问 DOM 和 Node.js |
| **Tauri** | ✅ 可行 | `initialization_script` 在 WebView 创建时注入；IPC 通信；Isolation Pattern 拦截 IPC |

**Electron 优势**：preload 脚本可在页面 JS 执行前运行，monkey-patch `window.fetch`、`XMLHttpRequest`。

### 3.2 读取 DeepSeek 网页内部 React 状态/接口

| 方法 | 可行性 | 说明 |
|------|-------|------|
| **Fetch / XHR 拦截** | ✅ 高度可行 | preload 中重写 `window.fetch` 和 `XMLHttpRequest.prototype.open`，捕获所有 API 请求/响应 |
| React DevTools 状态读取 | ⚠️ 有限 | 通过 `__REACT_DEVTOOLS_GLOBAL_HOOK__` 或 Fiber 树，依赖 React 内部实现，版本更新可能失效 |
| DOM 解析 | ✅ 可行 | MutationObserver 监听 DOM 变化 |
| Electron session.webRequest | ✅ 可行 | `session.defaultSession.webRequest.onBeforeSendHeaders` 拦截/修改所有 HTTP 请求头 |

### 3.3 导出 Markdown / PDF

| 方案 | 可行性 | 路径 |
|------|-------|------|
| **Markdown 导出** | ✅ | A. 拦截 API 响应直接获取原始 Markdown（DeepSeek 返回的就是 Markdown）；B. DOM 解析 + turndown 转换 |
| **PDF 导出** | ✅ | Electron `webContents.printToPDF()` API；Tauri 通过浏览器原生 print → PDF |
| **PNG 导出** | ✅ | `webContents.capturePage()` 或 html2canvas |

### 3.4 本地全文搜索历史

技术路径：
1. **数据抓取**：fetch 拦截捕获 SSE 流式响应，拼接完整回答
2. **本地存储**：SQLite（better-sqlite3 / Tauri-plugin-sql）
3. **全文搜索**：SQLite FTS5（高性能）；备选 MiniSearch / FlexSearch（纯 JS）
4. **增量同步**：MutationObserver 监听新消息 DOM，实时入库

### 3.5 接管接口请求

| 能力 | 可行性 | 实现 |
|------|-------|------|
| 请求缓存 | ✅ | fetch 拦截 + 本地缓存层 |
| 自动重试 | ✅ | 拦截失败响应，指数退避重发 |
| 断网恢复 | ✅ | 监听 `navigator.onLine`，断网时队列化请求 |
| 流式响应缓存 | ⚠️ 中等 | 拦截 SSE 流逐 chunk 缓存，支持断点续传 |
| 请求限流/排队 | ✅ | 拦截并发请求，客户端限流 |

## 四、增强功能优先级

### MVP 第一阶段（必做 8 项）

| # | 功能 | 价值 | 难度 |
|---|------|------|------|
| 1 | 全局快捷键唤起 + 浮窗模式 | 杀手级 | 低 |
| 2 | 系统托盘常驻 + 多窗口 | 高 | 低 |
| 3 | 沉浸式模式（CSS 注入隐藏侧栏） | 高 | 低 |
| 4 | 对话导出 Markdown / PDF（fetch 拦截 SSE 流） | 杀手级 | 中 |
| 5 | 本地对话存档 + 全文搜索（SQLite FTS5） | 高 | 中 |
| 6 | 失败自动重试 + 断网恢复（fetch 拦截 + 指数退避） | 高 | 中 |
| 7 | 多账号会话隔离（独立 cookie 容器） | 中 | 中 |
| 8 | 启动直达新对话页 + 主题字体定制 | 中 | 低 |

### 第二阶段（10 项）

| # | 功能 | 价值 | 难度 |
|---|------|------|------|
| 1 | 截图 OCR → 自动提问 | 高 | 中 |
| 2 | 划词 / 剪贴板快速提问 | 高 | 中 |
| 3 | 系统通知（回答完成） | 中 | 低 |
| 4 | Prompt 模板库（Slash 命令） | 中 | 中 |
| 5 | 系统右键菜单集成 | 中 | 高 |
| 6 | 对话同步到 Obsidian/Notion | 中 | 高 |
| 7 | 文件拖拽上传增强 | 中 | 中 |
| 8 | 插件 / 扩展系统 | 高 | 高 |
| 9 | Thinking 链折叠 + 单独导出 | 高 | 中 |
| 10 | 模型对比（直答 vs Thinking 并排） | 中 | 中 |

## 五、差异化创新方向（脱颖而出）

### 1.「深度思考伴侣」— 唯一为 DeepSeek 量身定制
- **Thinking 链可视化**：思考链折叠/展开优雅呈现，单独导出思考过程
- **长回答进度指示**：深度思考下显示预估剩余时间和 token 消耗
- **回答完成通知 + 摘要预览**：通知弹窗直接显示回答前几行
- **对比模式**：同问题分别用快速/Thinking 模式，并排对比
- **思考链收藏**：将有价值推理过程单独收藏

价值：通用套壳工具不会做这层；深度思考是 DeepSeek 核心卖点 → 强品牌绑定。

### 2.「对话知识库」— 本地 AI 记忆系统
- 自动拦截存储所有对话（本地 SQLite）
- 全文搜索 + 本地 embedding 语义搜索
- 标签、分类、收藏
- 自动提取代码片段、关键结论、待办
- 导出为 Obsidian vault，与个人 KM 系统打通

价值：网页"线性历史"→"结构化知识库"，解决"问过但找不到"的核心痛点。

### 3.「智能上下文桥」— 像 Raycast 那样感知上下文
- 全局快捷键浮窗时自动感知当前上下文（剪贴板、屏幕、当前文件）
- 截图 → OCR → 自动构造提问
- 划词 + 快捷键 → 自动发给 DeepSeek
- 与 VS Code、终端等开发工具的剪贴板联动

价值：竞品都是"打开窗口 → 手动输入"，本产品"感知上下文 → 智能提问"。
