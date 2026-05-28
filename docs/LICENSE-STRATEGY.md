# DeepDesk 开源协议与发布策略指南

> 版本：v1.0 / 撰写时间：2026 年 3 月
> 文档目标：为「比完全开源更严格一点」的发布策略提供可落地的协议、文档、商标三位一体方案
> 法律免责：本文整理自公开资料，作者非执业律师；正式发布前建议至少做一次开源律师 30 分钟付费咨询

---

## 摘要（一页速览）

DeepDesk 是 Tauri 套壳 `chat.deepseek.com` 的非商业桌面客户端。「严格开源」的真正诉求不是限制贡献者读源码，而是阻止三类滥用：**①伪官方收费 ②商业 SaaS 套壳 ③License 漂白后的二次贩卖**。围绕这一目标，本文得出的核心结论：

- **协议层**只能解决「分发与衍生」问题，无法独立阻止伪官方欺诈，必须 **协议 + 商标 + 技术自标识 + 法律声明** 四层叠加。
- **桌面套壳类项目的主流选择**是 MIT / Apache-2.0（Pake、NextChat、lencx/ChatGPT、Pake、LobeChat），代表「最大化用户基数」路线；同类中文项目 Cherry Studio 选择 **AGPLv3**，代表「中度严格」路线。
- DeepDesk 当前 PRD 写的是 MIT，与「比完全开源更严格」的目标不符。**最终推荐方案 B：AGPLv3 + 强商标政策 + DCO + 自识别水印**——在 OSI 认证开源的范围内拿到最大限度的反 SaaS 化与威慑力，对个人用户零摩擦。
- 不推荐 BUSL / Elastic License / SSPL / PolyForm Noncommercial：这些协议不被 OSI 认证为开源，会显著伤害 GitHub Star 增长、中文开发者信任度与上游依赖兼容性，与项目「3000+ Star、月活 10000+」OKR 直接冲突。

---

## 一、「严格开源」主流做法横向对比

### 1.1 GPLv3（OSI 认证开源 / FSF 强 Copyleft）
- **真实生产案例**：GIMP、Bash、Inkscape、Audacity、Krita，**ChatBox 社区版**（40k★，桌面 AI 客户端最直接对照）。
- **对个人非商业用户**：完全自由——可使用、可学习、可改、可分享。
- **对商业二次分发**：只要分发了二进制或源代码，就必须以同协议提供完整对应源代码（含修改部分）。
- **OSI / FSF 认证**：均认证。
- **DeepDesk 适配性**：可阻止「闭源套壳」，但**无法阻止「开源套壳收费」**——只要对方也开源同协议就合法。这条漏洞通过商标和品牌政策补。

### 1.2 AGPLv3（OSI 认证开源 / FSF 网络强 Copyleft）★推荐
- **真实生产案例**：MongoDB（已弃用改 SSPL）、Nextcloud、Mastodon、Plausible、**Cherry Studio**（46k★，中文 AI 客户端旗舰对照）、Ghost、Bitwarden 服务端。
- **对个人非商业用户**：与 GPL 相同，零摩擦。
- **对商业二次分发**：在 GPL 基础上增加 **§13 网络条款**——把软件以服务形式提供给远程用户也必须开源。这条对桌面 App 通常不直接生效，但若有人把 DeepDesk 改造成 Web 版 SaaS，就被强 Copyleft 卡住。
- **DeepDesk 适配性**：**最贴合**。桌面 App 场景下 AGPL 与 GPL 体感无差别，但对未来「DeepDesk 云端版」「在线 Demo 站」等任何 SaaS 化套壳都形成强约束，恰好满足「比完全开源更严格一点」。

### 1.3 SSPL（MongoDB v1.0 / OSI 拒绝认证）
- **真实生产案例**：MongoDB 4.x+、Elasticsearch（部分版本）、Redis 7.4+。
- **OSI / FSF 认证**：**均不认证**，OSI 明确表态 SSPL "discriminates against fields of endeavor"。
- **DeepDesk 适配性**：**不推荐**。DeepDesk 不是数据库这类 SaaS 受害方，SSPL 强度收益小、社区代价大、还会被 OSI/Linux 发行版打上「非开源」标签。

### 1.4 BUSL / BSL（Business Source License 1.1）
- **真实生产案例**：HashiCorp 全家桶（Terraform/Vault/Consul/Nomad）、Sentry、MariaDB MaxScale、CockroachDB、Couchbase。
- **机制**：源代码可见 + 排除「与发布者竞争的 SaaS」用途；约定 **Change Date**（通常 4 年）后自动转为指定开源协议。
- **OSI / FSF 认证**：均不认证。HashiCorp 自己也明确称「不再是开源公司」。
- **DeepDesk 适配性**：**不推荐**。DeepDesk 没有商业产品需要保护，BUSL 的核心价值（防 AWS 抄走商业版）对个人开源项目不存在；Star 数和社区贡献会因「非开源」标签直接减半。

### 1.5 Elastic License v2（Source-Available）
- **真实生产案例**：Elasticsearch / Kibana 7.11+、Apollo Router、部分 Confluent 产品。
- **OSI 认证**：不认证。
- **DeepDesk 适配性**：**不推荐**。DeepDesk 没有 License Key 体系，三条限制中只有第一条对项目有意义——AGPLv3 已能更优雅地处理。

### 1.6 PolyForm 系列（7 张许可证 / 模块化 Source-Available）

| 名称 | 用途 | 对 DeepDesk 适配 |
|------|------|-----------------|
| PolyForm Strict | 仅供阅读，禁分发禁修改 | 不考虑 |
| PolyForm Noncommercial | 允许非商业分发与修改 | 接近 CC BY-NC，可作为底线极端备选 |
| PolyForm Small Business | 仅小公司可商用 | 落地复杂 |
| PolyForm Free Trial | 30 天试用 | 与 DeepDesk 免费定位不符 |
| PolyForm Shield | 禁止与发布者商业竞争 | 类似 ELv2 |
| **PolyForm Perimeter** | **禁止与本软件商业竞争** | **C 方案备选** |
| PolyForm Internal Use | 公司内可用 | DeepDesk 不需要 |

### 1.7 Sustainable Use License（n8n / Fair-Code）
- **真实生产案例**：n8n（70k+★）、Mattermost 部分模块。
- **机制**：源代码完全开放；禁止把价值主要源自该软件的产品作为商业服务出售。
- **OSI / FSF 认证**：均不认证（n8n 自称 fair-code）。
- **DeepDesk 适配性**：思路与 ELv2 类似但对集成商更宽松，C 方案另一备选；同样失去开源标签。

### 1.8 CC BY-NC 4.0
- **DeepDesk 适配性**：**不推荐**。Creative Commons 自己明确说**不应当用于软件**——CC 协议没有专利条款、源代码定义不清。

### 1.9 一张图速览

| 协议 | OSI 认证 | 个人零摩擦 | 阻闭源套壳 | 阻 SaaS 套壳 | 中文接受度 | 真实代表 |
|------|---------|-----------|-----------|-------------|-----------|---------|
| MIT / Apache-2.0 | ✅ | ✅ | ❌ | ❌ | ⭐⭐⭐⭐⭐ | NextChat、Pake、lencx/ChatGPT |
| **GPLv3** | ✅ | ✅ | ✅ | ⚠️ | ⭐⭐⭐⭐ | ChatBox 社区版 |
| **AGPLv3** ★ | ✅ | ✅ | ✅ | ✅ | ⭐⭐⭐⭐ | **Cherry Studio**、Mastodon |
| SSPL | ❌ | ✅ | ✅ | ✅✅ | ⭐⭐ | MongoDB |
| BUSL 1.1 | ❌ | ✅ | ✅（4 年内） | ✅ | ⭐⭐⭐ | Terraform、Sentry |
| Elastic License v2 | ❌ | ✅ | ⚠️ | ✅ | ⭐⭐ | Elasticsearch |
| PolyForm Perimeter | ❌ | ✅ | ✅ | ✅ | ⭐ | 个别 SaaS |
| Sustainable Use | ❌ | ✅ | ⚠️ | ✅ | ⭐⭐ | n8n |
| CC BY-NC | n/a | ✅ | ❌ | ❌ | ⭐⭐ | 不推荐 |

---

## 二、类似项目协议选择规律

### 2.1 网页套壳类
| 项目 | Star | 协议 |
|------|------|------|
| Pake (tw93) | 49k+ | **MIT** |
| lencx/ChatGPT | 54k+ | **Apache-2.0** |

**规律**：**最宽松**。这类项目核心价值是「让别人也能套」，限制等于自废武功。

### 2.2 AI 客户端类
| 项目 | Star | 协议 | 备注 |
|------|------|------|------|
| NextChat | 83k+ | MIT | 最大众化路线 |
| LobeChat | 66k+ | Apache-2.0（自定义） | 含商标条款的修改版 Apache |
| ChatBox 社区版 | 40k+ | **GPLv3** | 公司同时运营闭源 Pro 版 |
| **Cherry Studio** | 46k+ | **AGPLv3** | **DeepDesk 应当对标** |

### 2.3 桌面工具类
- **Raycast**：主程序闭源，扩展仓库 MIT
- **Obsidian**：主程序闭源（独立 EULA），插件 API 开放
- **n8n**：Sustainable Use License

**总结**：**网页套壳类倾向 MIT/Apache（最大化扩散）；AI 客户端类倾向 MIT/Apache 或 GPL/AGPL（视立场）；桌面工具类按主程序定位选择闭源或 GPL 派系。DeepDesk 的「比完全开源更严格」诉求，最佳锚点就是 Cherry Studio 走过的 AGPLv3 路线。**

---

## 三、对 DeepDesk 的三套推荐方案

### 方案 A：温和严格 = Apache-2.0 + 强商标政策 + DCO
- **协议**：[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- **对用户影响**：零摩擦——可商用、可闭源、可改、可分发
- **代价**：与「严格开源」诉求最远——他人完全可以闭源套壳，仅靠商标威慑

### 方案 B：中度严格 = AGPLv3 + 强商标政策 + DCO + 技术水印 ★推荐
- **协议**：[GNU AGPLv3](https://www.gnu.org/licenses/agpl-3.0.html)
- **对用户影响**：对个人零摩擦；对修改后再分发者必须公开完整修改源码
- **理由**：
  1. **OSI 认证开源**——保留 GitHub `Open Source` 标签、awesome-list 收录资格、社区贡献者信任度
  2. **覆盖最重要的滥用场景**——闭源套壳与 SaaS 化套壳同时被卡住
  3. **桌面 App 场景下 AGPL 实际生效边界与 GPL 几乎一致**，对纯个人用户没有任何额外负担
  4. **与对标项目 Cherry Studio 一致**，中文 AI 客户端社区已熟悉这条路径
  5. 配合商标政策与启动页自识别水印，三层防线足以应对国内套壳跑路的实际风险

### 方案 C：高度严格 = PolyForm Perimeter / Sustainable Use License
- **代价**：失去 OSI 开源标签、中文社区不熟悉、PRD OKR 实质拖累
- **何时选择**：仅当出现实际伪官方收费侵害事件、且方案 B 不足以应对时再升级

### 选型决策树
```
你最在意什么？
├── 最大化 GitHub Star、扩散速度、企业贡献 → 方案 A（Apache-2.0）
├── 在 OSI 开源边界内拿到最大反滥用力度 → 方案 B（AGPLv3）★
└── 不计 Star 代价，最大化阻挡商业套壳 → 方案 C（PolyForm Perimeter）
```

---

## 四、必备发布策略文档

### 4.1 `CONTRIBUTING.md`（贡献指南）
- 项目愿景一段话（拒绝偏离 PRD「为 DeepSeek 量身定制 + 优雅退场」哲学的 PR）
- 开发环境搭建（Node ≥ 18、Rust ≥ 1.75、Tauri CLI 2.x）
- 分支策略：`main` 稳定版、`dev` 开发版、`feat/*` 特性分支
- 提交规范：Conventional Commits
- **DCO 签名要求**：所有 commit 必须 `git commit -s`
- 代码风格：ESLint + Prettier + rustfmt + clippy 必须全绿
- PR / Issue 模板
- **不接受的 PR 类型**：抓 DOM 业务数据、绕 PoW、代理协议、内置账号、商业化收费功能

### 4.2 `CODE_OF_CONDUCT.md`
直接采用 [Contributor Covenant 2.1 中文版](https://www.contributor-covenant.org/zh-cn/version/2/1/code_of_conduct/)。

### 4.3 `TRADEMARK.md` ★关键
- 明确声明「DeepDesk」名称与 Logo **不属于代码许可证授权范围**
- **允许的非商业使用**：博客、教程、引用、Forked from DeepDesk
- **不允许的使用**：fork 后保留同名、上架应用商店含「DeepDesk」字样、注册「DeepDesk」相关商标域名、暗示官方
- **强制改名规则**：参考 Firefox→IceCat、Chromium→Brave 模式

### 4.4 `SECURITY.md`
- 私密报告渠道：`security@<域名>` 或 GitHub Security Advisories
- 响应承诺：72 小时内确认收到、14 天内给出初步分析
- Supported Versions 表格
- 漏洞类型范围；明确排除 chat.deepseek.com 自身的安全问题

### 4.5 `GOVERNANCE.md`
- 当前阶段：BDFL 模式
- 角色定义：维护者 / 贡献者 / 翻译者 / 安全响应者
- 决策机制：日常合并 1 维护者审过即可；合规底线、协议、商标变更需所有维护者一致
- 维护者准入：连续 3 个月活跃 / 至少 5 个被合并的 PR / 维护者全票通过

### 4.6 CLA vs DCO 选型
**结论：DeepDesk 推荐 DCO，不用 CLA。**
- DCO（Developer Certificate of Origin）：每条 commit `git commit -s` 附 `Signed-off-by:`
- CLA：贡献者签署正式协议把版权转让给项目所有者
- DCO 流程极轻、无版权转让、社区接受度高（GitLab、Chef 都从 CLA 改回 DCO）
- CLA 容易给社区留下「准备闭源」的负面信号
- 用 GitHub Action [DCO Bot](https://github.com/apps/dco) 自动检查

### 4.7 `NOTICE`
项目名 + 主版权人 + 起始年；标明 Logo 受 TRADEMARK.md 保护；重要第三方代码片段归属。

### 4.8 `THIRD_PARTY_NOTICES.md`
用 `cargo about generate` + `license-checker` 自动生成。
**AGPL 兼容性体检**：所有依赖协议必须与 AGPLv3 兼容——MIT/Apache-2.0/MPL-2.0/BSD/ISC/LGPL/GPL/AGPL 都 OK；BUSL/SSPL/CC BY-NC 等不能直接吸收。Tauri 自身 MIT/Apache-2.0 双协议，与 AGPL 兼容。

### 4.9 其他建议
- `.github/ISSUE_TEMPLATE/`、`.github/PULL_REQUEST_TEMPLATE.md`
- `CHANGELOG.md`（Keep-a-Changelog 风格）
- `ROADMAP.md`（来自 PRD 的版本规划摘要）

---

## 五、商标与品牌保护

### 5.1 「DeepDesk」名称的国际保护

1. **零成本起步**：所有渠道一致使用 `™` 上标（`DeepDesk™`），积累 **未注册商标权 (Common Law Trademark)**
2. **核心市场注册**：
   - **中国 (CN)**：第 9 类（计算机软件）+ 第 42 类（软件服务），约 ¥1500/类。**重要**：DeepSeek 已在中国注册同名商标，「DeepDesk」与之相似度低、类别可能不同——但仍建议提前查询 [中国商标网](https://wsgg.sbj.cnipa.gov.cn:9443/tmoss/) 排查近似商标
   - **美国 (US)**：USPTO，第 9 + 42 类，约 $250-350/类
   - **欧盟 (EU)**：EUIPO，约 €850 单类 + €50/额外类
3. **国际扩展**：通过 **马德里体系 (WIPO Madrid)** 一次申请覆盖 100+ 国
4. **域名联防**：`deepdesk.app` (主) + `.com / .cn / .dev / .org / 常见错拼`

### 5.2 防止 Fork 后用相同名字商业分发
- **协议层**：Apache/AGPL 都不授权商标
- **文档层**：`TRADEMARK.md` 把规则写死
- **司法层**：注册商标后，可向 GitHub / App Store / 国内应用商店发 [DMCA 商标侵权通知](https://docs.github.com/en/site-policy/content-removal-policies/dmca-takedown-policy)
- **行为模板**：参考 Mozilla 「源代码完全开放，二进制必须改名才能使用 Firefox 名称」

### 5.3 防止冒充「官方版本」骗付费
这是 DeepDesk 在中国市场的**最大实际风险**。
- **协议层**（辅助）：AGPLv3 强制公开衍生品源码
- **品牌层**（最有效）：商标注册 + DMCA
- **技术层**（详见 §7）：自识别水印、官网链接验证、签名分发
- **法律层**：在中国可援引《反不正当竞争法》第 6 条（混淆行为）+ 《商标法》第 57 条（商标侵权）

### 5.4 Logo / Icon 版权策略
- Logo 同时受**著作权**（自动产生）和**商标权**（注册后获得）双重保护
- DeepDesk Logo 应**自行原创设计**，不要拼接 DeepSeek 鲸鱼元素
- 仓库内 `assets/brand/` 存放 SVG 源文件，标注 © 年份 + 作者，与代码协议**显式分离**
- Logo 多套尺寸都打 `<title>DeepDesk® Brand Asset</title>` 元数据

---

## 六、与 DeepSeek 的关系处理

### 6.1 README / 应用启动时清晰标明「非官方」

**README.md 顶部 Disclaimer 标准写法**：

```markdown
> ⚠️ **Disclaimer**: DeepDesk is an **unofficial**, community-built desktop client
> for chat.deepseek.com. This project is **not affiliated with, endorsed by, or
> sponsored by Hangzhou DeepSeek Artificial Intelligence Co., Ltd.** "DeepSeek" is
> a trademark of its respective owner; we use the name only to indicate
> compatibility, in accordance with nominative fair use.
>
> ⚠️ **声明**：DeepDesk 是 chat.deepseek.com 的**非官方**社区桌面客户端，
> **与杭州深度求索人工智能有限公司无任何隶属、授权、合作或赞助关系**。
> 「DeepSeek」为其各自所有者的商标；我们仅在指示性合理使用 (nominative fair use)
> 范围内使用该名称以表明兼容性。
```

**应用层标注**：
- 安装包文件名包含 `DeepDesk`，绝不包含 `DeepSeek-Desktop`、`深度求索官方`
- 启动屏显示「DeepDesk · 非官方第三方客户端 / Unofficial Third-Party Client」
- 设置页 → 关于页面：完整 Disclaimer + DeepSeek 商标声明 + 项目源码链接
- 系统托盘图标 hover 提示：「DeepDesk (Unofficial)」

### 6.2 避免 DeepSeek 反过来发律师函（四条护身规则）
1. **不抓 DOM 业务数据、不代理协议、不绕 PoW**
2. **不内置账号、不收费、不商业化**
3. **接受 DeepSeek 改版的自然降级**——使用注入式增强 + 探测降级，不与官方"对抗"
4. **若收到 DeepSeek 沟通邮件，48 小时内回应**

### 6.3 商标 Disclaimer 的标准写法

**法律术语锚点**：使用「**Nominative Fair Use** (指示性合理使用)」抗辩——美/欧/中三地都承认的商标使用例外，三个条件：
1. 没有更合理的方式可以指代该产品
2. 仅使用名称必要的最小范围
3. 不暗示赞助或授权关系

**最终 Disclaimer 模板**（粘贴到 LICENSE 末尾、TRADEMARK.md、关于页面）：
```
DeepDesk is an unofficial third-party desktop client for chat.deepseek.com.
This project is independently developed and is not affiliated with, endorsed
by, sponsored by, or otherwise approved by Hangzhou DeepSeek Artificial
Intelligence Co., Ltd. or any of its affiliates. "DeepSeek", the DeepSeek
logo, and all related marks are trademarks of their respective owners. Their
use here is solely for the descriptive purpose of indicating compatibility,
under the doctrine of nominative fair use. All other trademarks are the
property of their respective owners.
```

---

## 七、防止「伪官方」二次分发的具体策略

### 7.1 协议层
- AGPLv3 §7 不允许下游移除原作者的属性声明
- AGPLv3 §13 网络条款——若伪官方把 DeepDesk 改造成 Web 版套壳骗钱，必须公开其修改源码
- TRADEMARK.md 禁止未经许可的「DeepDesk」名义分发

### 7.2 技术层（自识别 / 自标识 / 不可移除水印）

按可实现性 × 反制力度从低到高：

1. **启动屏识别码**（必做）：右下角显示 `Build: <commit-sha> · <build-time> · github.com/Ylsssq926/DeepDesk`
2. **关于页强制链接**（必做）：「项目源码」「报告滥用」明显展示
3. **应用图标 metadata**（推荐）：在 `tauri.conf.json` 的 `productName/copyright/identifier` 写死作者信息
4. **代码签名**（强烈推荐）：申请微软/苹果开发者签名（约 $100/年）；用户查到没签名 = 伪造版
5. **官网联动验证**（推荐）：应用启动时调用 `https://deepdesk.app/api/version` 校验合法版本（**不能强制阻断旧版本运行**，否则违反 AGPL）
6. **不可见水印**（可选谨慎）：导出对话末尾加 `<!-- Exported by DeepDesk v0.x · github.com/... -->`

### 7.3 法律层
- **商标侵权**：《商标法》第 57 条
- **不正当竞争**：《反不正当竞争法》第 6 条
- **诈骗 / 消费者权益保护**
- **侵犯著作权**：AGPL 协议违约同时构成著作权侵权
- **DMCA Takedown**：覆盖 GitHub / App Store / Play Store
- **平台投诉**：国内 App Store / 应用宝 / 华为 / 小米都有「侵权举报」通道

### 7.4 三层防线一图
```
[用户] ←──「我是不是装错版本了？」
            │
   ① 协议层 (AGPL §7/§13)             ── 强制源码暴露 + 属性保留
   ② 商标层 (TRADEMARK.md + 注册)      ── 名字不能用 + DMCA 武器
   ③ 技术层 (签名 + 水印 + 官网验证)    ── 用户能自查、平台能识别
   ④ 法律层 (商标法 + 反不正当竞争)     ── 真出事时的最后一道
```

---

## 八、最终推荐方案 ★

### 选定：**方案 B（AGPLv3 + 强商标政策 + DCO + 自识别水印）**

**核心理由（一句话）**：在 OSI 认证开源、保留社区扩散势能的前提下，AGPLv3 是 DeepDesk「比完全开源更严格一点」诉求的**最优解**——对照 Cherry Studio 已经走通的同款路径，避免重复发明轮子，且对个人用户零摩擦、对滥用者形成最大威慑。

**为什么不是 A**：MIT/Apache 与「严格」完全无关，等于不对抗滥用，与用户当前明确诉求矛盾。
**为什么不是 C**：失去 OSI 开源标签会拖累 Star 数与社区信任，目前还没有出现实际伪官方收费事件，提前升级到 source-available 是过度反应。

### 升级路径预设
- **A → B**：当前 PRD 写的 MIT 已不再适配「严格」诉求 → 立即换 AGPL（DeepDesk 阶段早，无历史包袱）
- **B → C**：出现实际伪官方收费侵害事件，且法律手段处理周期太长 → 升级到 PolyForm Perimeter；旧版本仍以 AGPL 提供

---

## 九、接下来要做的 7 步行动清单

### 步骤 1：核对依赖兼容性（半天）
- 跑 `cargo about generate` + `npx license-checker --production`
- 确保所有上游依赖与 AGPLv3 兼容（已知 Tauri / React / shadcn / Tesseract 全部兼容）
- 输出 `THIRD_PARTY_NOTICES.md`

### 步骤 2：起草协议与商标三件套（1 天）
- `LICENSE` 替换为 [AGPLv3 全文](https://www.gnu.org/licenses/agpl-3.0.txt)，文件头加 `Copyright © 2026 DeepDesk Authors`
- 写 `NOTICE`
- 写 `TRADEMARK.md`（参考本文 §4.3 + §5）
- 写 `DISCLAIMER`（参考本文 §6.3 模板）

### 步骤 3：撰写治理与贡献文档（1 天）
- `CONTRIBUTING.md`（含 DCO 要求 / Conventional Commits / PR 模板）
- `CODE_OF_CONDUCT.md`（直接套 Contributor Covenant 2.1 中文版）
- `SECURITY.md`（响应窗口 / 上报邮箱 / Supported Versions）
- `GOVERNANCE.md`（BDFL 模式 / 维护者准入与退出 / RFC 流程）
- 配置 GitHub DCO Bot Action

### 步骤 4：技术自标识落地（1 天）
- 启动屏右下角加 `Build: ${SHA} · ${TIME} · github.com/Ylsssq926/DeepDesk` 文本
- 关于页加项目源码链接、协议链接、Disclaimer
- 在 `tauri.conf.json` 的 `productName / copyright / identifier` 写死作者信息
- 导出 Markdown 末尾加 `<!-- Exported by DeepDesk · github.com/Ylsssq926/DeepDesk -->` HTML 注释

### 步骤 5：商标与域名注册（持续）
- 注册 `deepdesk.app`（主）+ `.com / .cn / .dev / .org` 至少 5 个，年成本约 ¥600
- 提前在中国商标网查询「DeepDesk」近似商标
- 中国商标局申请 9 类 + 42 类（约 ¥3000，6-12 个月下证）

### 步骤 6：发布前最终自检 Checklist（半天）
- [ ] LICENSE / NOTICE / TRADEMARK / SECURITY / GOVERNANCE / CONTRIBUTING / CODE_OF_CONDUCT 全部存在
- [ ] README 顶部含中英文双语 Disclaimer
- [ ] THIRD_PARTY_NOTICES.md 自动生成且无禁用协议
- [ ] 启动屏 / 关于页 / 系统托盘 / 安装包文件名 / 应用 metadata 五处都标识「Unofficial」
- [ ] DCO Bot CI 检查跑通
- [ ] PRD §1.6 合规底线与 LICENSE 不冲突（PRD 中的「MIT 开源」需更新为 AGPLv3）

### 步骤 7：v0.1 发布与社区响应（1 天 + 持续）
- 推送首版 Tag、生成 GitHub Release（带 SHA256 + 签名）
- 官方公告同时在 GitHub Discussions、V2EX、知乎、即刻、Twitter 发布
- 准备 FAQ 标准答复

---

## 附录 A：关键参考链接

- AGPLv3 全文：https://www.gnu.org/licenses/agpl-3.0.html
- Apache 2.0 全文：https://www.apache.org/licenses/LICENSE-2.0
- PolyForm Project：https://polyformproject.org/licenses
- BUSL 1.1 全文：https://mariadb.com/bsl11/
- Elastic License 2.0：https://www.elastic.co/licensing/elastic-license
- n8n Sustainable Use License：https://docs.n8n.io/sustainable-use-license/
- Cherry Studio AGPL LICENSE 文件：https://github.com/CherryHQ/cherry-studio/blob/main/LICENSE
- Mozilla 商标政策：https://www.mozilla.org/foundation/trademarks/policy/
- Rust 基金会 Logo 政策：https://foundation.rust-lang.org/policies/logo-policy-and-media-guide/
- GitHub DCO Bot：https://github.com/apps/dco
- Contributor Covenant 中文版：https://www.contributor-covenant.org/zh-cn/version/2/1/code_of_conduct/
- 中国商标网：https://wsgg.sbj.cnipa.gov.cn:9443/tmoss/

---

> 本文档作为 DeepDesk 发布策略的**初版基线**，正式发布前建议至少做一次开源律师 30 分钟付费咨询。
