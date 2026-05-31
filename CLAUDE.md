# CLAUDE.md — PingChang 平常

> 本文件供 AI 编程助手（Claude Code、Cursor、Copilot 等）在辅助开发时读取。
> 阅读本文件后，你应当了解项目的完整背景、技术约束、代码规范与禁止行为。

---

## 项目简介

**PingChang（平常）** 是一款基于微信小程序的情绪慢社交应用，核心交流形式为「数字书信」。  
用户通过写长文字信件与陌生人建立深度情感连接，同时记录个人情绪成长轨迹。

- **平台**：微信小程序（基础库 3.0+）
- **后端**：微信云开发 CloudBase（无服务器）
- **数据库**：云数据库（MongoDB 文档型）
- **当前阶段**：Sprint 1 — 基础框架（进行中）
- **云开发环境 ID**：`cloud1-d0gh5vk6m6766834f`

---

## 目录结构

```
pingchang/
├── miniprogram/
│   ├── pages/
│   │   ├── index/          # 首页
│   │   ├── letters/
│   │   │   ├── inbox/      # 收件箱
│   │   │   ├── sent/       # 已发出
│   │   │   ├── write/      # 写信页
│   │   │   └── detail/     # 信件详情（含拆信动画）
│   │   ├── journey/        # 情绪旅程
│   │   ├── match/
│   │   │   ├── index/      # 灵魂匹配
│   │   │   └── profile/    # 对方主页
│   │   ├── profile/
│   │   │   ├── index/      # 我的
│   │   │   └── edit/       # 编辑资料
│   │   └── onboarding/     # 注册引导
│   ├── components/
│   │   ├── envelope-card/  # 信封卡片
│   │   ├── soul-card/      # 灵魂匹配卡
│   │   ├── mood-widget/    # 情绪记录组件
│   │   ├── letter-paper/   # 信纸容器
│   │   ├── open-animation/ # 拆信动画（5阶段状态机）
│   │   ├── emotion-calendar/ # 情绪月历
│   │   ├── trend-chart/    # 情绪折线图
│   │   ├── tag-picker/     # 标签选择器
│   │   ├── counter-input/  # 字数计数输入框
│   │   └── seal-stamp/     # 蜡封印章
│   ├── utils/
│   │   ├── api.js          # 云函数调用封装
│   │   ├── validator.js    # 字数、内容校验
│   │   └── date.js         # 日期格式化工具
│   └── app.js / app.json / app.wxss
├── cloudfunctions/
│   ├── sendLetter/
│   ├── getLetter/
│   ├── replyLetter/
│   ├── getMatches/
│   ├── getDailyRecommend/
│   ├── saveMood/
│   ├── getMemoryToday/
│   ├── checkInactivity/
│   └── moderateContent/
└── CLAUDE.md
```

---

## 技术栈与版本约束

| 层级 | 技术 | 约束 |
|------|------|------|
| 前端 | WXML + WXSS + JS | 基础库 ≥ 3.0，不使用框架（原生） |
| 动画 | `wx.createAnimation()` | 不使用 CSS keyframes（小程序兼容性） |
| 图表 | wx-charts | 不引入 ECharts（体积过大） |
| 后端 | 微信云开发 CloudBase | 所有数据操作必须经云函数，禁止前端直连数据库 |
| 数据库 | 云数据库（MongoDB） | 集合名见下方数据模型 |
| 推送 | 微信订阅消息 API | 需用户主动订阅，不可静默推送 |
| 内容安全 | 微信内容安全 API | 所有用户生成内容发送前必须过滤 |

---

## 数据模型（云数据库集合）

### `users`
```js
{
  _id: String,          // 微信 openid
  nickname: String,     // ≤ 20 字
  avatar_url: String,   // 云存储路径，可选
  intro: String,        // 20–60 字，必填
  tags: String[],       // 3–5 个兴趣标签，必填
  active_time: String,  // 'morning' | 'afternoon' | 'night'
  letter_freq: String,  // 'weekly' | 'biweekly' | 'free'
  created_at: Date,
  last_active: Date,
  is_member: Boolean,   // 默认 false
  member_expire: Date   // 可选
}
```

### `letters`
```js
{
  _id: String,
  from_uid: String,
  to_uid: String,
  parent_id: String,    // 回信时填写，可选
  title: String,        // ≤ 30 字，可选
  content: String,      // 首封 ≥ 150 字，回信 ≥ 100 字
  word_count: Number,   // 后端计算写入
  status: String,       // 'sent' | 'read' | 'archived' | 'rejected'
  is_first: Boolean,    // 是否为陌生人首封信
  created_at: Date,
  read_at: Date         // 可选
}
```

### `moods`
```js
{
  _id: String,
  uid: String,
  emotion: String,      // 'happy' | 'calm' | 'sad' | 'anxious' | 'mixed'
  intensity: Number,    // 1–5
  diary: String,        // ≥ 30 字，可选
  date: String          // 'YYYY-MM-DD'
}
```

### `matches`
```js
{
  _id: String,
  uid_a: String,
  uid_b: String,
  score: Number,        // 0–100，Jaccard + 加权
  tags_common: String[],
  status: String,       // 'pending' | 'active' | 'skipped'
  updated_at: Date
}
```

---

## 云函数接口规范

### 调用方式
所有云函数通过 `wx.cloud.callFunction` 调用：
```js
wx.cloud.callFunction({
  name: 'functionName',
  data: { /* 参数 */ },
  success: res => { /* res.result = { code, data, message } */ },
  fail: err => { /* 网络失败 */ }
})
```

### 统一响应结构
```js
// 成功
{ code: 0, data: { /* 业务数据 */ }, message: 'ok' }

// 失败
{ code: 1001, data: null, message: '内容包含违规信息' }
```

### 错误码
| 错误码 | 含义 |
|--------|------|
| `1001` | 内容未通过安全检测 |
| `1002` | 字数不足 |
| `1003` | 对方已拒绝接收 |
| `1004` | 每日推荐已用完 |
| `1005` | 活跃书信组数已达上限 |
| `9001` | 数据库操作失败 |
| `9002` | 云函数超时 |

---

## 字数规则（业务约束）

| 场景 | 最低字数 |
|------|----------|
| 陌生人首封信 | **150 字** |
| 已建立通信的回信 | **100 字** |
| 心情日记 | **30 字**（可选填） |
| 一句话介绍（注册） | **20–60 字** |
| 对方主页书写摘要（展示） | 最多展示 **50 字** |

字数计算方式：去除首尾空格后的中文字符 + 英文单词数 + 阿拉伯数字组（不计标点、空格）。  
校验逻辑统一在 `utils/validator.js` 的 `countWords(text)` 函数中实现，**禁止在各页面重复写校验逻辑**。

---

## 代码规范

### 命名
- 页面文件夹：`kebab-case`（如 `letter-detail`）
- 组件文件夹：`kebab-case`
- JS 变量/函数：`camelCase`
- 云函数名：`camelCase`（如 `sendLetter`）
- 数据库集合名：`snake_case`（如 `letters`、`moods`）
- WXSS 类名：`kebab-case`（如 `.letter-card`）

### 云函数规范
每个云函数必须：
1. 在入口处调用 `cloud.init()`
2. 用 `try/catch` 包裹所有数据库操作
3. 返回统一的 `{ code, data, message }` 结构
4. 涉及用户生成内容的写操作，必须先调用 `moderateContent`

```js
// 云函数标准模板
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 1. 参数校验
    // 2. 内容安全（如有 UGC）
    // 3. 业务逻辑
    // 4. 数据库操作
    return { code: 0, data: result, message: 'ok' }
  } catch (err) {
    console.error(err)
    return { code: 9001, data: null, message: err.message }
  }
}
```

### 前端数据请求
统一使用 `utils/api.js` 封装，**禁止在页面 JS 中直接调用 `wx.cloud.callFunction`**：
```js
// utils/api.js 导出形如：
export const sendLetter = (data) => callCloud('sendLetter', data)
export const getLetter  = (id)   => callCloud('getLetter',  { id })
```

---

## 禁止事项

以下行为在本项目中**严格禁止**，AI 助手不应生成此类代码：

1. **禁止前端直连数据库**（`db.collection('letters').get()`）——所有数据库操作必须在云函数中执行
2. **禁止跳过内容安全过滤**——任何用户输入的文字在写入数据库前必须经过 `moderateContent`
3. **禁止越权读取**——云函数中查询信件时必须校验 `from_uid` 或 `to_uid` 等于当前用户 openid
4. **禁止在前端存储 openid**——openid 通过 `wx.cloud.callFunction` 在云端通过 `context.OPENID` 获取
5. **禁止引入 ECharts**——图表统一使用 wx-charts
6. **禁止使用实时聊天功能**（WebSocket、长轮询）——本产品为异步书信，无实时通信需求
7. **禁止暴露用户手机号、微信号等真实身份信息**给其他用户
8. **禁止在页面 JS 中重复写字数校验逻辑**——统一使用 `utils/validator.js`

---

## 匹配算法说明

`getMatches` 云函数使用 **Jaccard 相似度** 计算用户匹配分：

```js
// 基础分
score = (|A ∩ B| / |A ∪ B|) * 100

// 加权修正（叠加）
if (activeTime_A === activeTime_B)  score += 10
if (letterFreq_A === letterFreq_B)  score += 5
if (lastActive_B within 7 days)     score += 8
if (already_in_contact)             score = -1  // 不推荐
if (skipped_today)                  score = -1  // 不推荐
```

最终取 score ≥ 0 的用户，按 score 降序排列，每日推荐前 3 名（会员 5 名）。

---

## 动画实现要点

拆信动画分 5 个阶段，通过 `open-animation` 组件的内部状态机管理：

| 阶段 | 延迟 | 时长 | 属性 | 缓动 |
|------|------|------|------|------|
| 蜡封消失 | 0ms | 280ms | opacity + scale → 0 | ease-out |
| 封口翻折 | 100ms | 550ms | rotateX → 180deg | ease-in-out |
| 信纸滑出 | 300ms | 500ms | scaleY → 1 | cubic-bezier(0.34,1.1,0.64,1) |
| 文字淡入 | 500ms | 300ms | opacity → 1 | ease |
| 签名淡入 | 650ms | 300ms | opacity → 1 | ease |

使用 `wx.createAnimation()` 实现，**不使用 CSS keyframes**（小程序兼容性限制）。  
组件内用 `isAnimating` flag 防止重复触发。

---

## 性能要求

| 指标 | 目标值 |
|------|--------|
| 收件箱列表首屏加载 | < 500ms |
| `sendLetter` 端到端 | < 1500ms |
| `getLetter` 查询 | < 300ms |
| 拆信动画帧率 | ≥ 55fps（主流机型） |
| 情绪月历渲染 | < 200ms |

**索引要求**：`letters` 集合在 `{ to_uid: 1, status: 1 }` 上建立复合索引。

---

## 本地开发说明

```bash
# 1. 在微信开发者工具中打开项目根目录
# 2. 在云开发控制台创建环境，记录环境 ID
# 3. 在 app.js 中初始化：
wx.cloud.init({ env: 'your-env-id', traceUser: true })

# 4. 云函数本地调试：
#    右键云函数目录 → 「在终端中打开」→ 「开启云函数本地调试」

# 5. 上传云函数：
#    右键单个云函数目录 → 「上传并部署：云端安装依赖」
```

---

*本文件随项目迭代更新，每个 Sprint 结束后检查是否需要同步修改。*

---

## Sprint 进度（快速查阅）

| Sprint | 主题 | 状态 | 完成日期 |
|--------|------|------|----------|
| Sprint 0 | 需求与设计 | ✅ 已完成 | 2026-05-30 |
| Sprint 1 | 基础框架 | ✅ 已完成 | 2026-05-30 |
| Sprint 2 | 书信核心（上） | ✅ 已完成 | 2026-05-30 |
| Sprint 3 | 书信核心（下） | ✅ 已完成 | 2026-05-30 |
| Sprint 4 | 情绪系统 | ✅ 已完成 | 2026-05-30 |
| Sprint 5 | 匹配系统 | ✅ 已完成 | 2026-05-31 |
| Sprint 6 | UI 精修 | ⬜ 未开始 | — |
| Sprint 7 | 性能与安全 | ⬜ 未开始 | — |
| Sprint 8 | 测试与上线 | ⬜ 未开始 | — |

## Sprint 0 完成情况（2026-05-30）

**已完成：**
- 高保真可点击 HTML 原型（`project/prototype/pingchat.html`）：首页 / 信箱 / 写信 / 拆信详情 / 情绪旅程 / 我的，含 Tweaks 主题切换
- `docs/PRD.md`：全部 11 个页面功能需求文档
- `docs/INTERFACE-DOC-v0.1.md`：18 个云函数 input/output 签名文档
- `miniprogram/` 完整目录脚手架：11 页面 × 4 文件、10 组件 × 4 文件
- `miniprogram/app.wxss`：7 个全局 CSS 颜色变量 + 5 个情绪色变量
- `miniprogram/utils/`：api.js / validator.js / date.js
- `cloudfunctions/`：18 个云函数已上传至 `cloud1-d0gh5vk6m6766834f`
- 数据库集合已创建：`users` / `letters` / `moods` / `matches`（权限：仅创建者可读写）
- 数据库索引已创建：`letters.{to_uid,status}` / `moods.{uid,date}` / `matches.{uid_a,updated_at}`
- `project.config.json`：项目根目录配置，`miniprogramRoot` + `cloudfunctionRoot` 已指向正确路径

**待人工完成：**
- 微信订阅消息模板申请（来信提醒 / 情绪记忆提醒）

## Sprint 2 完成情况（2026-05-30）

**已完成：**
- `pages/letters/write/`：写信页完整实现（字数校验、内容安全、发送流程）
- `pages/letters/inbox/`：收件箱完整实现（分页加载、下拉刷新、上拉加载更多）
- `pages/letters/sent/`：已发出列表完整实现（receiverNickname 映射）
- `pages/letters/detail/`：信件详情 + 拆信动画完整实现（5阶段状态机）
- `cloudfunctions/sendLetter/`：发信云函数（字数校验、内容安全、写入 letters）
- `cloudfunctions/getLetter/`：取信云函数（权限校验、自动标 read、返回 replyToUid）
- `cloudfunctions/replyLetter/`：回信云函数（权限校验、字数校验）
- `cloudfunctions/getInbox/`：收件箱云函数（分页、批量获取 senderNickname）
- `cloudfunctions/getSent/`：已发出云函数（分页、批量获取 receiverNickname）
- `cloudfunctions/moderateContent/`：内容安全审核（微信 API v2）
- `components/letter-paper/`：信纸组件（横线背景、日期格式化）
- `components/open-animation/`：拆信动画组件（5阶段 wx.createAnimation）
- `components/envelope-card/`：信封卡片组件（未读红点、相对时间）
- `components/seal-stamp/`：蜡封印章组件（按压动画、激活态）
- `app.js`：启动时检查用户是否注册，未注册跳转 onboarding

**已知限制（后续 Sprint 处理）：**
- 订阅消息推送（来信提醒）：TODO，需用户申请模板
- 信件归档功能：计划 Sprint 3 实现

## Sprint 5 完成情况（2026-05-31）

**已完成：**
- `pages/match/index/`：每日灵魂推荐页（加载推荐列表、跳过、写信、点击卡片查看主页）
- `pages/match/profile/`：对方主页（公开资料展示、近期摘要、活跃偏好、跳过/写信操作）
- `components/soul-card/`：灵魂匹配卡组件（匹配度色彩动态、共同标签展示、点击跳转主页）
- `cloudfunctions/getMatches/`：Jaccard 匹配算法（加权修正：活跃时段+10 / 书信频率+5 / 近期活跃+8）+ 每日 0 点定时触发配置
- `cloudfunctions/getDailyRecommend/`：每日推荐列表（普通用户3条 / 会员5条）+ 信使账号冷启动兜底
- `cloudfunctions/skipUser/`：跳过推荐（upsert matches 状态为 skipped）
- `cloudfunctions/getPublicProfile/`：获取他人公开资料（白名单字段 + 近期摘要50字 + 活跃标签）
- `cloudfunctions/sendLetter/`：首封信发出后自动将 matches 记录状态更新为 active

**待人工完成：**
- 在微信云开发控制台为 `getMatches` 云函数创建定时触发器（cron: `0 0 0 * * * *`）

## Sprint 5 联调修复（2026-05-31）

**已修复：**
- `components/soul-card/`：`onTap` 触发事件补充 `targetNickname` 字段
- `pages/match/index/index.js`：`goToProfile` 改从 `e.detail` 读取自定义事件数据（原先读 `e.currentTarget.dataset` 导致 targetUid 为 undefined）
- `pages/match/index/index.js`：`goToWrite` 对 `targetNickname` 做 `encodeURIComponent` 编码防止中文截断
- `pages/match/index/index.wxml`：「写信给TA」按钮补加 `data-target-uid` 和 `data-target-nickname` 属性
- `components/emotion-calendar/index.js`：末尾补空格至满 7 格，防止最后一周只有 1 格时因 flex:1 撑满整行造成日期列错位

## 已知环境信息

- **云开发环境 ID**：`cloud1-d0gh5vk6m6766834f`
- **云函数数量**：18 个（均已上传，Sprint 2 完成核心书信函数）
- **tabBar 图标**：`miniprogram/assets/icons/`（8 个 PNG，已生成）
- **设计原型**：`project/prototype/pingchat.html`（浏览器直接打开可查看）
