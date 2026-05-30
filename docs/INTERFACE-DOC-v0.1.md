# 接口文档 v0.1 — PingChang 平常云函数

> 版本：v0.1 · 最后更新：2026-05-30  
> 所有云函数通过 `wx.cloud.callFunction` 调用，统一响应结构 `{ code, data, message }`

---

## 调用方式

```js
// 通过 utils/api.js 封装调用（禁止在页面直接调用 wx.cloud.callFunction）
const api = require('../../utils/api')
const res = await api.sendLetter({ content: '...', targetUid: '...' })
// res = { code: 0, data: { _id: 'xxx' }, message: 'ok' }
```

---

## 全局响应结构

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
| `9001` | 数据库操作失败 / 参数错误 |
| `9002` | 云函数超时 |

---

## 云函数列表

### 1. sendLetter — 发送信件

**触发方式**：用户手动调用（写信页点击「封存寄出」）

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `content` | String | 是 | 信件正文 |
| `targetUid` | String | 是 | 收信人 openid |
| `isFirst` | Boolean | 是 | 是否为陌生人首封信（影响字数门槛） |
| `title` | String | 否 | 信件标题，最多30字 |

**返回示例**：

```js
// 成功
{ code: 0, data: { _id: 'letter_id_xxx' }, message: 'ok' }

// 字数不足
{ code: 1002, data: null, message: '字数不足，至少需要150字，当前80字' }

// 内容违规
{ code: 1001, data: null, message: '内容包含违规信息，请修改后重新发送' }
```

**权限说明**：
- `OPENID` 从 `cloud.getWXContext()` 获取，作为 `from_uid` 写入
- 后端独立计算 `word_count`，不信任前端传入值
- UGC 写入前必须调用 `moderateContent` 审核

---

### 2. getLetter — 获取信件详情

**触发方式**：用户手动调用（信件详情页加载）

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | String | 是 | 信件 `_id` |

**返回示例**：

```js
// 成功
{
  code: 0,
  data: {
    _id: 'letter_id_xxx',
    from_uid: 'openid_xxx',
    to_uid: 'openid_yyy',
    title: '信件标题',
    content: '信件正文...',
    word_count: 180,
    status: 'read',
    is_first: true,
    created_at: '2026-05-30T08:00:00.000Z',
    read_at: '2026-05-30T10:00:00.000Z',
    senderNickname: '寄信人昵称'
  },
  message: 'ok'
}

// 无权限
{ code: 9001, data: null, message: '无权限查看此信件' }

// 不存在
{ code: 9001, data: null, message: '信件不存在' }
```

**权限说明**：
- 只有 `from_uid === OPENID` 或 `to_uid === OPENID` 的信件可读取
- 收件人首次读取时，自动将 `status` 更新为 `read`，记录 `read_at`

---

### 3. replyLetter — 回复信件

**触发方式**：用户手动调用（信件详情页点击「回信」→ 写信页提交）

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `parentId` | String | 是 | 原信件 `_id` |
| `content` | String | 是 | 回信正文（≥ 100 字） |
| `title` | String | 否 | 回信标题，最多30字 |

**返回示例**：

```js
// 成功
{ code: 0, data: { _id: 'reply_letter_id' }, message: 'ok' }

// 字数不足
{ code: 1002, data: null, message: '回信至少需要100字，当前60字' }
```

**权限说明**：
- 只有原信件的 `from_uid` 或 `to_uid` 可回信
- 收件人（`to_uid`）确定为对方（`from_uid`）

---

### 4. getInbox — 获取收件箱

**触发方式**：用户手动调用（收件箱页加载、下拉刷新、上拉加载更多）

**输入参数**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | Number | 否 | 0 | 页码，从 0 开始，每页 10 条 |

**返回示例**：

```js
// 成功
{
  code: 0,
  data: [
    {
      _id: 'letter_id',
      from_uid: 'openid_xxx',
      title: '信件标题',
      content: '信件正文...',
      word_count: 200,
      status: 'sent',
      is_first: true,
      created_at: '2026-05-30T08:00:00.000Z',
      senderNickname: '寄信人'
    }
    // ... 最多10条
  ],
  message: 'ok'
}
```

**权限说明**：
- 只返回 `to_uid === OPENID` 且 `status !== 'archived'` 的信件

---

### 5. getSent — 获取已发出列表

**触发方式**：用户手动调用（已发出页加载）

**输入参数**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | Number | 否 | 0 | 页码，从 0 开始，每页 10 条 |

**返回示例**：

```js
{
  code: 0,
  data: [
    {
      _id: 'letter_id',
      to_uid: 'openid_yyy',
      title: '信件标题',
      content: '...',
      word_count: 180,
      status: 'read',
      created_at: '...',
      receiverNickname: '收信人昵称'
    }
  ],
  message: 'ok'
}
```

---

### 6. moderateContent — 内容安全审核

**触发方式**：用户手动调用（所有 UGC 写入前调用）

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `content` | String | 是 | 待审核的文本内容 |

**返回示例**：

```js
// 通过
{ code: 0, data: { suggest: 'pass' }, message: 'ok' }

// 违规
{ code: 1001, data: { suggest: 'risky' }, message: '内容包含违规信息' }

// 待审核（放行）
{ code: 0, data: { suggest: 'review' }, message: 'ok' }
```

**权限说明**：
- 使用微信内容安全 API v2（`cloud.openapi.security.msgSecCheck`）
- API 异常时放行并记录日志，不影响用户正常使用

---

### 7. saveMood — 保存情绪记录

**触发方式**：用户手动调用（首页情绪卡片点击「记录此刻」）

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `emotion` | String | 是 | `'happy'` \| `'calm'` \| `'sad'` \| `'anxious'` \| `'mixed'` |
| `intensity` | Number | 是 | 1–5 的整数 |
| `date` | String | 是 | `'YYYY-MM-DD'` 格式 |
| `diary` | String | 否 | 心情日记（若填写需 ≥ 30 字） |

**返回示例**：

```js
// 成功（新建）
{
  code: 0,
  data: { _id: 'mood_id', uid: 'openid', emotion: 'calm', intensity: 3, date: '2026-05-30' },
  message: 'ok'
}

// 日记字数不足
{ code: 1002, data: null, message: '日记至少需要30字，当前15字' }
```

**权限说明**：
- 同一天重复保存时覆盖更新（upsert，`date` 字段唯一约束）
- 日记内容若存在，调用 `moderateContent` 审核

---

### 8. getMoods — 获取月份情绪列表

**触发方式**：用户手动调用（情绪旅程页加载、切换月份）

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `year` | Number | 是 | 年份，如 `2026` |
| `month` | Number | 是 | 月份，1–12 |

**返回示例**：

```js
{
  code: 0,
  data: [
    { _id: 'mood_id', emotion: 'happy', intensity: 4, diary: '...', date: '2026-05-15' },
    { _id: 'mood_id2', emotion: 'calm', intensity: 3, date: '2026-05-20' }
  ],
  message: 'ok'
}
```

---

### 9. getMoodTrend — 获取30天情绪趋势

**触发方式**：用户手动调用（情绪旅程页折线图）

**输入参数**：无

**返回示例**：

```js
{
  code: 0,
  data: [
    { date: '2026-05-01', intensity: 3, emotion: 'calm' },
    { date: '2026-05-03', intensity: 4, emotion: 'happy' }
    // 只返回有记录的日期
  ],
  message: 'ok'
}
```

---

### 10. getMemoryToday — 获取「去年的今天」

**触发方式**：用户手动调用（首页加载）；每日 8:00 定时触发（推送提醒）

**输入参数**：无

**返回示例**：

```js
// 有情绪记录
{
  code: 0,
  data: {
    type: 'mood',
    _id: 'mood_id',
    emotion: 'happy',
    intensity: 4,
    diary: '去年今天很开心...',
    date: '2025-05-30'
  },
  message: 'ok'
}

// 有信件记录
{
  code: 0,
  data: {
    type: 'letter',
    _id: 'letter_id',
    content: '去年今天写的信...',
    created_at: '...'
  },
  message: 'ok'
}

// 无记录
{ code: 0, data: null, message: 'no memory' }
```

---

### 11. getMatches — 计算匹配分（定时触发）

**触发方式**：每日 0:00 定时触发（CloudBase 定时器）；也可手动调用触发计算

**输入参数**：无（定时触发时 event 为空）

**返回示例**：

```js
// 成功
{ code: 0, data: { matched: 42 }, message: 'ok' }
```

**权限说明**：
- 使用 Jaccard 相似度算法计算匹配分
- 已建立通信关系的用户不参与推荐（过滤 letters 集合）
- 计算结果写入 `matches` 集合，`status: 'pending'`

---

### 12. getDailyRecommend — 获取每日推荐

**触发方式**：用户手动调用（首页、灵魂匹配页加载）

**输入参数**：无

**返回示例**：

```js
// 成功（免费用户最多3条，会员最多5条）
{
  code: 0,
  data: [
    {
      _id: 'match_id',
      profile: {
        _id: 'openid_xxx',
        nickname: '对方昵称',
        intro: '一句话介绍...',
        tags: ['文学', '诗歌'],
        active_time: 'night',
        letter_freq: 'weekly'
      },
      score: 75,
      tagsCommon: ['文学']
    }
  ],
  message: 'ok'
}

// 推荐已用完
{ code: 1004, data: [], message: '今日推荐已用完，明天再来' }
```

---

### 13. skipUser — 跳过推荐用户

**触发方式**：用户手动调用（点击「跳过」按钮）

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `targetUid` | String | 是 | 要跳过的用户 openid |

**返回示例**：

```js
// 成功
{ code: 0, data: null, message: 'ok' }
```

**权限说明**：
- 更新 `matches` 集合中对应记录的 `status` 为 `'skipped'`
- 该用户当日不再出现在推荐列表

---

### 14. getPublicProfile — 获取他人公开资料

**触发方式**：用户手动调用（对方主页加载）

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `targetUid` | String | 是 | 目标用户 openid |

**返回示例**：

```js
{
  code: 0,
  data: {
    _id: 'openid_xxx',
    nickname: '对方昵称',
    intro: '完整一句话介绍',
    tags: ['文学', '诗歌', '哲学'],
    active_time: 'night',
    letter_freq: 'weekly',
    last_active: '2026-05-28T10:00:00.000Z',
    isActiveRecently: true,
    recentExcerpt: '最近书写的前50字...',
    activeTimeLabel: '夜深',
    letterFreqLabel: '每周一封'
  },
  message: 'ok'
}
```

**权限说明**：
- 不返回 openid 之外的用户隐私标识符（手机号、微信号等）
- `recentExcerpt` 最多50字，由后端截取

---

### 15. createUser — 新用户注册

**触发方式**：用户手动调用（注册引导页完成Step 3提交）

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `nickname` | String | 是 | 昵称，≤ 20字 |
| `intro` | String | 是 | 一句话介绍，20–60字 |
| `tags` | Array | 是 | 兴趣标签，3–5个 |
| `activeTime` | String | 否 | `'morning'` \| `'afternoon'` \| `'night'` |
| `letterFreq` | String | 否 | `'weekly'` \| `'biweekly'` \| `'free'` |

**返回示例**：

```js
// 成功
{
  code: 0,
  data: {
    _id: 'openid',
    nickname: '用户昵称',
    intro: '一句话介绍',
    tags: ['文学', '诗歌', '哲学'],
    active_time: 'night',
    letter_freq: 'weekly',
    is_member: false
  },
  message: 'ok'
}

// 已注册
{ code: 9001, data: null, message: '用户已注册' }

// 介绍字数不合规
{ code: 1002, data: null, message: '一句话介绍需在20-60字之间，当前10字' }
```

**权限说明**：
- `_id` 使用 `OPENID`（云数据库自动关联，无需手动传入）
- 后端重新校验 `intro` 字数（不信任前端）
- 注册前对 `intro` 调用 `moderateContent` 审核

---

### 16. getUser — 获取当前用户信息

**触发方式**：用户手动调用（首页、我的页加载）

**输入参数**：无

**返回示例**：

```js
{
  code: 0,
  data: {
    _id: 'openid',
    nickname: '昵称',
    intro: '介绍',
    tags: ['文学'],
    active_time: 'night',
    letter_freq: 'weekly',
    is_member: false,
    created_at: '...',
    last_active: '...',
    lettersSent: 12,
    lettersReceived: 8,
    moodDays: 45
  },
  message: 'ok'
}

// 用户不存在（未注册）
{ code: 9001, data: null, message: '用户不存在，请先完成注册' }
```

---

### 17. updateUser — 更新用户资料

**触发方式**：用户手动调用（编辑资料页保存）

**输入参数**（所有字段均为选填，传入字段才会更新）：

| 参数 | 类型 | 说明 |
|------|------|------|
| `nickname` | String | 昵称，≤ 20字 |
| `intro` | String | 一句话介绍，20–60字 |
| `tags` | Array | 兴趣标签，3–5个 |
| `activeTime` | String | 活跃时段 |
| `letterFreq` | String | 书信频率 |

**返回示例**：

```js
// 成功（返回更新后的完整数据）
{ code: 0, data: { /* 同 getUser */ }, message: 'ok' }

// 介绍违规
{ code: 1001, data: null, message: '介绍内容包含违规信息，请修改' }
```

---

### 18. checkInactivity — 检查不活跃通信（定时触发）

**触发方式**：每日 9:00 定时触发（CloudBase 定时器）

**输入参数**：无

**返回示例**：

```js
{
  code: 0,
  data: {
    checked: 3,
    inactiveLetters: [
      {
        threshold: '7天未回应',
        letters: [{ _id: '...', to_uid: '...', from_uid: '...' }]
      }
    ]
  },
  message: 'ok'
}
```

**权限说明**：
- 定时触发，识别 7/14/30 天内未读的信件
- TODO: 触发订阅消息提醒（需用户订阅消息模板）

---

## 数据模型快速参考

### users 集合
```js
{
  _id: String,           // openid
  nickname: String,      // ≤ 20字
  intro: String,         // 20-60字
  tags: String[],        // 3-5个
  active_time: 'morning'|'afternoon'|'night',
  letter_freq: 'weekly'|'biweekly'|'free',
  created_at: Date,
  last_active: Date,
  is_member: Boolean,
  member_expire: Date    // 可选
}
```

### letters 集合
```js
{
  _id: String,
  from_uid: String,
  to_uid: String,
  parent_id: String,     // 回信时填写
  title: String,         // ≤ 30字，可选
  content: String,
  word_count: Number,    // 后端计算
  status: 'sent'|'read'|'archived'|'rejected',
  is_first: Boolean,
  created_at: Date,
  read_at: Date          // 可选
}
```

### moods 集合
```js
{
  _id: String,
  uid: String,
  emotion: 'happy'|'calm'|'sad'|'anxious'|'mixed',
  intensity: Number,     // 1-5
  diary: String,         // ≥ 30字，可选
  date: String           // 'YYYY-MM-DD'，同用户唯一
}
```

### matches 集合
```js
{
  _id: String,
  uid_a: String,
  uid_b: String,
  score: Number,         // 0-100
  tags_common: String[],
  status: 'pending'|'active'|'skipped',
  updated_at: Date
}
```

---

## 数据库索引

| 集合 | 索引 | 用途 |
|------|------|------|
| `letters` | `{ to_uid: 1, status: 1 }` | 收件箱查询 < 300ms |
| `moods` | `{ uid: 1, date: 1 }` | 月历查询 < 200ms |
| `matches` | `{ uid_a: 1, updated_at: -1 }` | 推荐列表排序 |

---

*接口文档版本 v0.1，对应 Sprint 0 交付物。Sprint 1 开发时根据实际接口调整后更新至 v0.2。*
