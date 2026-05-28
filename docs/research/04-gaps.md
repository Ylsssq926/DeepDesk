# DeepSeek 网页版功能缺口清单

> 调研时间：2026 年 3 月
> 视角：DeepDesk（Tauri 套壳 chat.deepseek.com）"为 DeepSeek 量身定制 + 查漏补缺"
> 合规底线：不抓 DOM 业务数据、不绕 PoW、不代理协议、不修改 DeepSeek 自己的请求；所有补丁可优雅退场

## 总览：11 个维度的缺口与优先级

| # | 维度 | 缺口烈度 | 桌面壳可行性 | DeepSeek 短期内官方做的概率 | 综合优先级 |
|---|------|---------|-------------|----------------------------|-----------|
| 1 | 多模态（视觉/图像生成） | 中 | 中（仅本地预处理） | **高**（V4 已有视觉能力） | **中**（窗口期短，做"过渡层"） |
| 2 | Artifacts / Mermaid / 代码运行 | **高** | **高** | 低 | **高** |
| 3 | 记忆 / 系统提示 / 角色卡 | **高** | **高** | 中 | **高** |
| 4 | 分享与协作（导出） | 中 | 中 | 低 | 中 |
| 5 | 语音 TTS / STT | 中 | **高** | 低 | 中 |
| 6 | 对话历史管理 | **高** | **高** | 低 | **高** |
| 7 | 联网搜索引用呈现 | 中 | 中 | 中 | 中 |
| 8 | 文件附件复用 | 中 | 中 | 低 | 中 |
| 9 | 渲染（KaTeX/代码块/表格） | 中 | **高** | 低 | 中 |
| 10 | 系统集成（划词/截图/右键/全局唤起） | **高** | **高** | 不可能 | **高** |
| 11 | 失败兜底（服务器繁忙/中断） | **高** | **高** | 中 | **高** |

**6 个高优缺口**：#2 Artifacts、#3 记忆与系统提示、#6 历史管理、#10 系统集成、#11 失败兜底；其中 #1 多模态因官方将快速补齐而紧迫感极高，单独算一档"短窗口任务"。

---

## 维度 1：多模态相关

### DeepSeek 当前状态
- **视觉理解**：chat.deepseek.com 已支持图片输入做视觉问答；V4 系列原生 vision，KV 缓存仅约 90 entries/图（Claude 870），效率优势显著
- **OCR**：独立的 [DeepSeek-OCR](https://github.com/deepseek-ai/DeepSeek-OCR) 开源模型（10× 无损/20× 可用压缩），但 chat 网页**未单独挂出 OCR**
- **图像生成**：网页 chat 端**不支持**（开源 [Janus-Pro](https://huggingface.co/deepseek-ai/Janus-Pro-1B) 未集成进 chat）
- **上传限制**（[CometAPI 实测](https://www.cometapi.com/how-many-images-can-you-upload-to-deepseek/)）：免费单次 1-20 张/单图≤5MB/日额 50-100 张，付费档显著放宽

### 横向对比

| 能力 | DeepSeek Web | ChatGPT | Claude | Gemini |
|------|--------------|---------|--------|--------|
| 视觉问答 | ✅ V4 原生 | ✅ | ✅ | ✅ |
| 图像生成 | ❌ | ✅ DALL·E 3 | ❌ | ✅ Imagen 3 |
| 视频理解 | 部分 | 有限 | ❌ | ✅ |
| 音频理解 | ❌ | ✅ | ❌ | ✅ |

### 桌面壳可补到什么程度

| 补丁 | 可行性 | 价值 |
|------|-------|------|
| **本地截图工具 → 自动填入提问框** | ✅ 高 | 高 |
| 本地图像预处理（裁剪/标注/去隐私） | ✅ 高 | 中 |
| 本地小型 OCR（Tesseract / DeepSeek-OCR ONNX）→ 文字塞进提问 | ✅ 中（包体大） | 中-高（上传配额受限时尤其有用） |
| 桌面端调用第三方图像生成 API | ⚠️ | **不建议**（违背产品哲学） |

### 优先级
**中**（短窗口 + 高可行性）；其中"截图 → 提问"独立看为**高**

**关键策略**：聚焦"截图 → OCR/直接图片 → 自动填表"的零摩擦工作流——浏览器永远做不到这层。

---

## 维度 2：代码与产物（Artifacts / Canvas / Mermaid / 代码运行）

### DeepSeek 当前状态
- **没有 Artifacts / Canvas**：代码块只是普通 markdown 高亮 + 复制按钮
- **没有 Mermaid 实时渲染**——第三方 [yan5xu/deepseek-diagrams-extension](https://github.com/yan5xu/deepseek-diagrams-extension) 专门为此而生，明确证据
- **没有 PlantUML / 流程图**
- **没有代码运行环境**（Python REPL / JS 沙箱 / 数据分析）
- 已知 issue：[DeepSeek-V3 #992 Mermaid rendering failed](https://github.com/deepseek-ai/DeepSeek-V3/issues/992)

### 横向对比

| 能力 | DeepSeek | ChatGPT | Claude |
|------|----------|---------|--------|
| Artifacts/Canvas | ❌ | ✅ [Canvas](https://openai.com/index/introducing-canvas/) | ✅ [Artifacts](https://www.anthropic.com/news/build-artifacts) |
| Mermaid 内联渲染 | ❌ | ✅ | ✅ |
| HTML 实时预览 | ❌ | ✅ | ✅ |
| Python 沙箱 | ❌ | ✅ Code Interpreter | ❌ |

### 桌面壳可补到什么程度

| 补丁 | 可行性 | 价值 |
|------|-------|------|
| **CSS/JS 注入：Mermaid.js 渲染所有 ` ```mermaid ` 代码块** | ✅ 极高 | **极高** |
| HTML 代码块"预览"按钮 → 弹出沙箱 webview srcdoc | ✅ 高 | **高** |
| 代码块"在 VS Code 打开"/"另存为新文件"按钮 | ✅ 高 | 高（开发者爱） |
| 代码块"在本地沙箱运行"（Python/QuickJS） | ⚠️ 中（V2） | 中 |
| **回答中可视化"工件抽屉"：把所有产出的代码/图/HTML 抽到右侧栏** | ✅ 高 | **高** |
| 数学公式 → 一键复制 LaTeX/Word 友好格式 | ✅ 高 | 中 |
| PlantUML（用本地 plantuml.jar 或 kroki） | ✅ 中 | 中 |

### 退场设计
DeepSeek 上线 Artifacts 后一键关闭对应注入；"工件抽屉"作为可选侧栏自动检测官方 UI 后默认关闭。

### 优先级
**高**——杀手级 + DeepSeek 不会很快做 + 完全可由前端注入实现

---

## 维度 3：记忆与个性化

### DeepSeek 当前状态
- **没有 Memory**（chat.deepseek.com 不提供 ChatGPT 的 Saved Memories 等价物）
- **没有自定义指令（Custom Instructions）**：每次新会话从空白开始
- **没有"角色 / Gem / Project"**
- **没有全局偏好**（永远 markdown / 永远中文）
- 用户绕路证据极强：Greasyfork 同时存在 **"DeepSeek System Prompt Injector"** 和 **"DeepSeek System Prompt"** 两个独立用户脚本；**"DeepSeek Traits"** 脚本明确写 "A recreation of OpenAI's ChatGPT Traits feature"
- API 端有 `system` role 可注入，但**网页前端不暴露给用户**

### 横向对比

| 能力 | DeepSeek | ChatGPT | Claude | Gemini |
|------|----------|---------|--------|--------|
| 自定义指令 | ❌ | ✅ Custom Instructions / Traits | ✅ Project System Prompt | ✅ Gem |
| 跨会话记忆 | ❌ | ✅ [Saved Memories](https://openai.com/index/memory-and-new-controls-for-chatgpt/) | 部分 | ✅ |
| 角色/智能体卡 | ❌ | ✅ GPTs | ✅ Projects | ✅ Gems |
| 模板 / Slash 命令 | ❌ | 部分 | ❌ | ❌ |

### 用户呼声
3 个独立的 DeepSeek 系统提示注入用户脚本 + 中文 prompt 库 [langgptai/awesome-deepseek-prompts](https://github.com/langgptai/awesome-deepseek-prompts) 维护活跃

### 桌面壳可补到什么程度

| 补丁 | 可行性 | 价值 |
|------|-------|------|
| **本地 Prompt 模板库 + Slash 命令**（输入 `/` 出菜单） | ✅ 极高 | **极高** |
| **每次新对话前在用户 prompt 头部自动注入"系统级偏好文本"** | ✅ 高 | **极高** |
| **角色卡片库**（开发者/作家/翻译） | ✅ 高 | 高 |
| **变量化模板**（如 `{{selection}}`、`{{clipboard}}`） | ✅ 高 | 高 |
| **本地"对话记忆"：扫描历史标注关键事实，需要时手动注入** | ✅ 高 | 高 |

**关键合规观点**：把"自定义指令"实现为**在输入框头部插入文本**而非"在 system 字段动手脚"，从协议层等价于用户自己敲了那段 prompt → 完全合规。

### 优先级
**极高**——DeepSeek 体验差距最大、技术最容易、长期内 DeepSeek 也未必做（DeepSeek 历来重模型轻产品）

---

## 维度 4：分享与协作

### DeepSeek 当前状态
- **没有 share 链接**——明确的官方 issue 求教此功能：[deepseek-ai/DeepSeek-R1 Issue #64](https://github.com/deepseek-ai/DeepSeek-R1/issues/64) "Add Share Functionality to Chats for Easy Sharing"，至今未关闭
- **没有官方导出**
- **没有团队/协作概念**
- 第三方 [Yorick-Ryu/deep-share](https://github.com/Yorick-Ryu/deep-share)、[ypyf/deepseek-chat-exporter](https://github.com/ypyf/deepseek-chat-exporter) 等专为补这块

### 桌面壳可补到什么程度

| 补丁 | 可行性 | 价值 |
|------|-------|------|
| **导出 Markdown / PDF / PNG / HTML**（fetch 拦截 SSE 原始 markdown） | ✅ 极高 | **极高** |
| **导出图卡（社交分享版式）** — 自定义模板 + 水印 | ✅ 高 | 高（小红书友好） |
| **局部分享：选中几条消息导出** | ✅ 高 | 高 |
| **导出 Notion / Obsidian Markdown + frontmatter + 双链** | ✅ 高 | 高 |
| 生成"公开分享链接"（在我方服务器存一份） | ❌ | **不做**（涉及版权 + ToS） |

### 优先级
**高**——18 个月被验证的真实需求

---

## 维度 5：语音

### DeepSeek 当前状态
- **没有 TTS 朗读 / 没有语音输入**（chat 输入区只有文字 + 文件）
- iOS/Android App 也未提供（截至 2026-03）
- 第三方 [voicewave.xyz/talk-to-deepseek](https://voicewave.xyz/talk-to-deepseek/) 自建路由证明需求存在

### 桌面壳可补到什么程度

| 补丁 | 可行性 | 价值 |
|------|-------|------|
| **系统级 TTS 朗读**（macOS NSSpeechSynthesizer / Windows SAPI / Linux espeak） | ✅ 极高 | 中 |
| 接入开源 TTS（Edge-TTS、Piper、Kokoro） | ✅ 高 | 中 |
| **本地 Whisper.cpp 语音输入**（点麦克风 → 本地识别 → 写入输入框） | ✅ 高 | **高** |
| OS 系统级 STT 调用 | ✅ 极高 | 中 |
| 实时语音对话 | ⚠️ 难（DeepSeek 没有低延迟 voice 接口） | 低 |

### 优先级
**中**——非红线痛点但是差异化亮点；本地 Whisper STT 对中文用户尤其有价值

---

## 维度 6：对话历史管理

### DeepSeek 当前状态
极简，**严重缺失**：
- ✅ 列表 + 重命名 + 删除
- ❌ 文件夹 / 标签 / 收藏 / 置顶
- ❌ 跨对话搜索（**全网最大痛点之一**）
- ❌ 分支对话（fork from message）
- ❌ 编辑已发送的消息
- ❌ 批量删除 / 归档

### 横向对比

| 能力 | DeepSeek | ChatGPT | Claude | Gemini |
|------|----------|---------|--------|--------|
| 文件夹/Project | ❌ | ✅ | ✅ | ❌ |
| 标签/收藏 | ❌ | ❌ | ❌ | ❌ |
| 置顶 | ❌ | ✅ Pin | ❌ | ✅ |
| 跨对话搜索 | ❌ | ✅ | ✅ | ✅ |
| 分支 | ❌ | ✅ Branch | ✅ | ✅ |
| 归档 | ❌ | ✅ | ❌ | ✅ |

### 用户呼声
Greasyfork "Ophel Atlas" 用户脚本：**"adds … conversation folders, pinning, prompt queue, prompt library, … Search Everywhere"**——一个脚本就给所有主流 AI（含 DeepSeek）补这套缺失的全集。

### 桌面壳可补到什么程度

| 补丁 | 可行性 | 价值 |
|------|-------|------|
| **本地标签/文件夹/收藏/置顶**（独立 SQLite 元数据表） | ✅ 极高 | **极高** |
| **跨对话本地全文搜索**（拦截响应入 SQLite FTS5） | ✅ 极高 | **极高** |
| **分支对话（fork from message）**：复制消息序列到新对话开头 | ⚠️ 中（不能 1:1 复刻 ChatGPT 真分支，可达 80%） | 中 |
| 批量删除 / 多选 | ✅ 高 | 中 |
| **离线对话存档**（账号封禁/网页删除也不丢） | ✅ 高 | **高** |

### 优先级
**极高**——多年痛点 + DeepSeek 历来不重视前端，长期不会做完整，**长线价值最大**

---

## 维度 7：联网搜索体验

### DeepSeek 当前状态
- 联网搜索本身可用
- **引用源呈现弱**：[trakkr.ai 分析](https://trakkr.ai/article/check-if-deepseek-cites-my-site)：_"DeepSeek's responses don't include visible citations or source links."_
- 不能切换搜索引擎
- 联网 token 不稳定

### 桌面壳可补到什么程度

| 补丁 | 可行性 | 价值 |
|------|-------|------|
| 从拦截到的搜索响应中聚合引用源 → 侧栏列表 | ✅ 中 | 中 |
| 一键打开所有引用为新标签 | ✅ 高 | 中 |
| 引用源 PDF / 截图本地存档 | ✅ 中（仅"用户点了再抓"避免 ToS 风险） | 中 |

### 优先级
**中**——非高频痛点但 power user 爱，**Phase 2**

---

## 维度 8：文件附件

### DeepSeek 当前状态
- 网页支持上传 PDF/图片/文本
- **附件历史不能跨对话回看**
- **无"知识库"概念**
- 重新提问要重传

### 桌面壳可补到什么程度

| 补丁 | 可行性 | 价值 |
|------|-------|------|
| **本地文件库**：上传时同时本地另存（hash 去重），UI 选"再次使用" | ✅ 高 | **高** |
| 拖拽上传增强 + 多文件批处理 | ✅ 高 | 中 |
| **本地"知识库"目录 → 一键上传给当前对话** | ✅ 高 | 高 |
| 文件预览（PDF/Office 本地预览） | ✅ 中 | 中 |

### 优先级
**中**——确实有价值但比 #2/#3/#6 低一档，**Phase 2**

---

## 维度 9：渲染与排版

### DeepSeek 当前状态
- KaTeX 基本可用，但长公式横向溢出常见
- 长代码块超长时浏览器 reflow 卡顿
- 表格超过视口宽度不优雅
- Greasyfork 用户脚本：**"Wider AI Chat"** 加宽聊天框、**"Double-click Math Formula to Copy to Word"**、**"DeepSeek Smart RTL Assistant"** RTL 修复

### 桌面壳可补到什么程度

| 补丁 | 可行性 | 价值 |
|------|-------|------|
| CSS 注入：加宽聊天框、可调字号、暗色细节 | ✅ 极高 | 高 |
| 代码块：虚拟滚动 / 折叠超长部分 / 行号 | ✅ 中 | 中 |
| 表格：横向滚动容器 + 一键复制 CSV/Excel | ✅ 高 | 中 |
| 数学公式：双击复制 LaTeX/MathML | ✅ 高 | 中 |
| **思考链折叠 + 单独导出**（DeepSeek 专属，已纳入 MVP M-07） | ✅ 高 | 高 |

### 优先级
**中**——基础体验项，与"沉浸式模式"绑定一起做，**Phase 1 末**

---

## 维度 10：系统集成（桌面专属，护城河）

### DeepSeek 当前状态
浏览器版本**完全做不到**：
- ❌ 全局划词翻译/解释
- ❌ 系统级"用 AI 解释所选"右键菜单
- ❌ 剪贴板自动注入
- ❌ 屏幕区域截图 + OCR + 提问
- ❌ 通知中心常驻"快速提问"
- ❌ macOS Spotlight / Windows PowerToys 集成
- ❌ 全局快捷键

### 桌面壳可补到什么程度

| 补丁 | 可行性 | 价值 |
|------|-------|------|
| **全局快捷键唤起浮窗** | ✅ 极高 | **极高** |
| **划词 + 快捷键 → 自动发到 DeepSeek** | ✅ 高 | **极高** |
| **系统右键菜单"用 DeepSeek 解释"** | ✅ Mac/Win 高，Linux 中 | 高 |
| 剪贴板监听 + 主动建议 | ✅ 高（默认关闭开关） | 中 |
| **屏幕截图 → OCR → 自动填入提问** | ✅ 高 | **极高** |
| 通知中心快速提问 | ✅ Mac/Win 高 | 中 |
| Spotlight / PowerToys / Raycast 扩展 | ✅ 中 | 中 |
| **托盘 + 多窗口 + 浮窗模式** | ✅ 极高 | **极高** |

### 优先级
**极高**——套壳客户端**唯一不可替代**的护城河，浏览器永远做不到

---

## 维度 11：失败兜底

### DeepSeek 当前状态
- **"服务器繁忙"**：全网最大抱怨。专门的 Chrome 扩展 [DeepSeek Server Busy](https://chromewebstore.google.com/detail/deepseek-server-busy/ilmchkjknlgjdlcokfepanfibdbifkbh)、[Overpowered DeepSeek](https://www.producthunt.com/products/overpowered-deepseek) 卖点完全围绕这个
- **长输出被中断**：[byteplus 报告 R1 截断 bug](https://www.byteplus.com/en/topic/385427)；用户脚本 ["Auto click continue"](https://greasyfork.org/en/scripts/by-site/deepseek.com)
- **网络抖动重连**：网页版无断点续传
- **被审查/重写的回答**：用户脚本 ["DeepSeeker"](https://greasyfork.org/en/scripts/by-site/deepseek.com) 描述：_"Prevents deletion of filtered/censored responses"_
- **Anti-recall**：[DeepSeek Anti-recall 脚本](https://greasyfork.org/en/scripts/553866-deepseek-anti-recall)

### 桌面壳可补到什么程度

| 补丁 | 可行性 | 价值 |
|------|-------|------|
| **"服务器繁忙"自动重试 + 指数退避**（仅模拟用户点击 retry） | ✅ 高 | **极高** |
| **断网检测 + 在线后弹"恢复发送"** | ✅ 高 | **高** |
| **流式响应本地缓存**（拦截 SSE → 即使页面刷新也能恢复显示） | ✅ 中 | 高 |
| 被撤回内容的本地保留 | ✅ 高 | ⚠️ 政策敏感（建议默认关闭、海外版可开） |
| **长回答自动接续**（检测"继续生成"自动点击） | ✅ 高 | 高 |
| **输入草稿持久化**（断网/崩溃不丢用户已输入的内容） | ✅ 极高 | **极高** |

### 关键合规边界
- ✅ 模拟用户点击 retry 按钮（用户自己也能点）
- ❌ **不要做**：自动重发请求体、绕 PoW、自动伪造请求头/UA、自动绕账号封禁

### 优先级
**极高**——用户最痛、最高频的体验项；技术上极易；DeepSeek 短期内可能改善服务器，但"网络抖动恢复 + 输入草稿"客户端职责官方永远不会做

---

## 关键交叉洞察

### A. 短窗口 vs 长窗口缺口分类

**短窗口缺口（DeepSeek 大概率 12 个月内补齐，做"过渡补丁"）**：
- 多模态绘画（Janus 整合）
- 视觉理解优化
- 自定义指令（最简单的可能就一个设置项）
- 跨对话搜索
- Share 链接

**长窗口缺口（DeepSeek 历来不重视前端，长线价值大）**：
- 桌面系统集成（10 项）— 浏览器永远做不到
- 本地全文搜索 + 标签/文件夹（端侧能力）
- Mermaid/HTML 预览（前端工程量大）
- 输入草稿持久化、断网恢复、自动重试（客户端职责）
- Prompt 模板库 + Slash 命令
- TTS/STT 本地化

### B. 退场设计原则
每一个补丁都需要：
1. 设置项独立开关（用户可关）
2. 检测官方功能上线（自动建议关闭，不强制）
3. 本地数据可导出/迁移（不绑架用户）
4. 不修改 DeepSeek 自己的请求体（仅前端注入、UI 包装、监听响应）
5. 崩溃/失败时回退到原版网页（不阻塞使用）

### C. 6 个高优先级缺口（建议 Phase 1 锁定）

1. **#11 失败兜底套件**：自动重试 + 输入草稿持久化 + 断网恢复（DeepSeek 第一痛点）
2. **#10 系统集成**：全局快捷键 + 托盘 + 浮窗 + 划词 + 截图 OCR（套壳产品的护城河）
3. **#3 自定义指令 + Prompt 模板库**：在输入框头部注入，零侵入
4. **#6 本地历史标签 + 跨对话全文搜索**：长线价值最大
5. **#2 Mermaid 渲染 + HTML 预览面板**：CSS/JS 注入即可
6. **#4 导出 Markdown / PDF / 图卡**：18 个月被验证的真实需求

### D. 必避雷区
- 任何形式的"绕 PoW"、"代理协议"、"代登录"、"DOM 抓取业务数据上传我方服务器"
- 任何形式的"分享链接"我方托管 — 涉及内容版权 + ToS
- "审查内容保留"功能在国内版默认开启 — 监管风险
- 任何形式的本地推理冒充 DeepSeek 输出 — 违背产品哲学

---

## 关键来源链接

**官方**
- [DeepSeek 服务条款](https://cdn.deepseek.com/policies/en-US/deepseek-terms-of-use.html)
- [DeepSeek API Docs FAQ](https://api-docs.deepseek.com/faq)
- [DeepSeek Service Status](http://status.deepseek.com/)
- [V4 Preview 发布](https://api-docs.deepseek.com/news/news260424)

**多模态**
- [DeepSeek-VL2](https://huggingface.co/deepseek-ai/deepseek-vl2)
- [DeepSeek-OCR](https://github.com/deepseek-ai/DeepSeek-OCR)
- [Janus-Pro 1B](https://huggingface.co/deepseek-ai/Janus-Pro-1B)
- [V4 Vision 分析](https://www.mindstudio.ai/blog/deepseek-v4-vision-cheaper-multimodal-ai-workflows)
- [图片上传限制实测](https://www.cometapi.com/how-many-images-can-you-upload-to-deepseek/)

**Artifacts/Mermaid**
- [Claude Artifacts](https://www.anthropic.com/news/build-artifacts)
- [ChatGPT Canvas](https://openai.com/index/introducing-canvas/)
- [yan5xu/deepseek-diagrams-extension](https://github.com/yan5xu/deepseek-diagrams-extension)
- [DeepSeek-V3 Mermaid bug #992](https://github.com/deepseek-ai/DeepSeek-V3/issues/992)

**记忆/系统提示**
- [ChatGPT Memory 官方](https://openai.com/index/memory-and-new-controls-for-chatgpt/)
- [Custom Instructions vs Memory](https://help.openai.com/en/articles/8983151-is-memory-different-from-custom-instructions)
- [langgptai/awesome-deepseek-prompts](https://github.com/langgptai/awesome-deepseek-prompts)
- [GPT Prompt Manager](https://greasyfork.org/en/scripts/527308-gpt-prompt-manager-deepseek-and-chatgpt/code)

**分享与协作**
- [DeepSeek-R1 Issue #64 Share 请求](https://github.com/deepseek-ai/DeepSeek-R1/issues/64)
- [Yorick-Ryu/deep-share](https://github.com/Yorick-Ryu/deep-share)
- [ypyf/deepseek-chat-exporter](https://github.com/ypyf/deepseek-chat-exporter)

**联网搜索**
- [trakkr.ai：DeepSeek 不显示引用源](https://trakkr.ai/article/check-if-deepseek-cites-my-site)

**失败兜底**
- [DeepSeek Server Busy Chrome 扩展](https://chromewebstore.google.com/detail/deepseek-server-busy/ilmchkjknlgjdlcokfepanfibdbifkbh)
- [Overpowered DeepSeek](https://www.producthunt.com/products/overpowered-deepseek)
- [R1 cut-off bug 报告](https://www.byteplus.com/en/topic/385427)
- [DeepSeek Anti-recall 脚本](https://greasyfork.org/en/scripts/553866-deepseek-anti-recall)
