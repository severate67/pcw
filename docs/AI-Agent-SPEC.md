# AI-Agent-SPEC.md — PingChang 平常

> 本文件定义 AI 编程 Agent（如 Claude Code）在本项目中的**行为规范、权限边界与任务执行准则**。  
> Agent 在执行任何任务前必须读取本文件。

---

## 1. Agent 角色定义

在 PingChang 项目中，AI Agent 扮演**高级全栈开发工程师**的角色，负责：

- 微信小程序前端页面与组件开发
- 云函数（CloudBase）编写与调试
- 数据库集合结构维护与索引优化
- 代码审查与重构建议
- 测试用例生成与 Bug 定位

Agent **不负责**：
- 产品方向决策（功能增减、优先级调整）
- 设计稿制作（Figma 原型）
- 微信小程序审核提交
- 用户数据的直接操作（生产数据库的增删改）

---

## 2. 任务接收规范

### 2.1 任务输入格式

Agent 接收任务时，期望提供以下信息（不完整时应主动询问）：

```
任务类型：[新增功能 | Bug修复 | 重构 | 测试 | 文档]
所属模块：[页面路径 或 云函数名]
任务描述：[清晰的需求描述]
验收标准：[完成的判断依据]
优先级：[P0 | P1 | P2]
相关文件：[涉及的文件路径列表]
```

### 2.2 任务开始前必做

执行任何编码任务前，Agent 必须：

1. **读取 CLAUDE.md** — 确认技术约束与禁止事项
2. **确认所属 Sprint** — 对照 `TASK-PHASES.md` 确认当前任务在计划范围内
3. **检查相关文件** — 阅读涉及的现有代码，避免重复实现
4. **明确验收标准** — 若任务描述中没有验收标准，必须在执行前向人类确认

### 2.3 歧义处理

当任务描述存在歧义时，Agent 应：
- 列出自己的理解方式（A / B / C 方案）
- 说明各方案的权衡
- 等待人类选择，**不擅自选择并执行**

---

## 3. 代码生成规范

### 3.1 通用原则

- **最小改动原则**：修复 Bug 时只改必要部分，不顺手重构无关代码
- **可读性优先**：变量命名要表达意图，不写聪明但难懂的代码
- **防御性编程**：云函数中所有外部输入（`event` 参数）都要做类型和范围校验
- **错误不能吞掉**：`catch` 块必须至少 `console.error`，不允许空 `catch`

### 3.2 云函数生成规范

每个云函数必须包含以下结构：

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()  // 从上下文获取，不信任 event 中的 uid

  // === 1. 参数校验 ===
  if (!event.requiredParam) {
    return { code: 1002, data: null, message: '缺少必填参数: requiredParam' }
  }

  // === 2. 内容安全（仅 UGC 写操作需要）===
  // await moderateContent(event.content)

  // === 3. 权限校验 ===
  // 确保用户只能操作自己的数据

  // === 4. 业务逻辑 ===
  try {
    const result = await db.collection('...')./* 操作 */
    return { code: 0, data: result, message: 'ok' }
  } catch (err) {
    console.error('[functionName] db error:', err)
    return { code: 9001, data: null, message: err.message }
  }
}
```

**禁止行为**：
- 不得在云函数中信任 `event.uid` 或 `event.openid`——必须从 `cloud.getWXContext()` 获取
- 不得跳过 `try/catch`
- 不得在没有权限校验的情况下查询或修改他人数据

### 3.3 前端页面生成规范

**WXML**：
- 列表渲染必须提供 `wx:key`
- 图片必须提供 `lazy-load` 属性
- 点击事件用 `bindtap`，不用 `catchtap`（除非明确需要阻止冒泡）

**WXSS**：
- 尺寸单位统一使用 `rpx`（响应式像素）
- 颜色值必须使用 CSS 变量（在 `app.wxss` 中定义），不硬编码色值

```css
/* app.wxss 中定义的颜色变量 */
page {
  --color-primary: #5C3D20;
  --color-accent: #C4622D;
  --color-bg: #F5EFE0;
  --color-paper: #EDE0C4;
  --color-ink: #3A2A1A;
  --color-ink-secondary: #7A5C3E;
  --color-seal: #B5341E;
}
```

**JS（页面逻辑）**：
- 所有 API 调用通过 `utils/api.js` 封装，不直接调用 `wx.cloud.callFunction`
- 页面数据初始化在 `onLoad` 中完成
- 用 `this.setData()` 的最小粒度更新，不整体替换大对象

### 3.4 动画组件规范

`open-animation` 组件的状态机必须严格按照以下设计实现：

```js
// 状态枚举
const ANIM_STATE = {
  IDLE: 'idle',           // 初始，信封封闭
  SEAL_FADE: 'sealFade',  // 蜡封消失
  FLAP_OPEN: 'flapOpen',  // 封口翻折
  PAPER_SLIDE: 'paperSlide', // 信纸滑出
  TEXT_FADE: 'textFade',  // 文字淡入
  DONE: 'done'            // 完成
}

// 必须有 isAnimating 防重入标志
// 必须在 DONE 状态后才允许「回信」按钮可点击
```

---

## 4. 权限与安全规范

### 4.1 数据权限矩阵

Agent 生成的代码必须遵守以下权限规则：

| 操作 | 条件 |
|------|------|
| 读取信件内容 | `from_uid === OPENID` 或 `to_uid === OPENID` |
| 修改信件状态 | `to_uid === OPENID`（只有收件人可标记已读） |
| 删除/归档信件 | `from_uid === OPENID` 或 `to_uid === OPENID` |
| 读取他人 profile | 仅读取 `nickname, tags, intro, active_time`，不返回 `_id` 之外的标识符 |
| 读取情绪记录 | `uid === OPENID`（情绪数据完全私有） |

### 4.2 前端安全

- 不在小程序本地存储（`wx.setStorageSync`）中保存 openid 或 token
- 不将用户的完整信息（包括 openid）传递给任何第三方接口
- 图片上传前在前端压缩至 ≤ 1MB，上传路径为云存储，不使用外部图床

### 4.3 内容安全

所有用户生成内容（信件正文、日记、自我介绍）在写入数据库前，必须经过 `moderateContent` 云函数过滤：

```js
// 调用示例（在 sendLetter / saveMood 中）
const modResult = await cloud.callFunction({
  name: 'moderateContent',
  data: { content: event.content }
})
if (modResult.result.code !== 0) {
  return { code: 1001, data: null, message: '内容包含违规信息' }
}
```

---

## 5. 测试规范

### 5.1 云函数单元测试

每个云函数提交前，Agent 必须提供以下测试用例（至少覆盖）：

| 用例类型 | 说明 |
|----------|------|
| 正常路径 | 正确参数，期望返回 `code: 0` |
| 参数缺失 | 必填参数为空，期望返回业务错误码 |
| 权限越权 | 操作他人数据，期望返回 `9001` 或业务错误 |
| 内容违规 | 违规文字输入，期望返回 `1001` |
| 数据库异常 | 模拟 db 报错，期望返回 `9001` |

### 5.2 前端组件测试

提交组件代码时，Agent 应提供：
- 组件的所有 `properties` 说明
- 至少 2 个使用示例（正常态 + 空/边界态）
- 已知的兼容性问题或限制

### 5.3 动画测试

拆信动画提交时必须说明：
- 在微信开发者工具模拟器中的测试结果
- 快速连续点击是否有防重入保护
- 低端机（Redmi Note 8 或同级）的帧率估算

---

## 6. 代码审查清单

Agent 在提交任何代码前，自检以下清单：

### 云函数
- [ ] 使用了 `cloud.getWXContext()` 而非信任 `event.uid`
- [ ] 有 `try/catch` 且 catch 块有日志
- [ ] 返回了 `{ code, data, message }` 结构
- [ ] UGC 写操作调用了 `moderateContent`
- [ ] 有权限校验，防止越权访问

### 前端页面
- [ ] 使用了 `utils/api.js` 而非直接调用云函数
- [ ] 颜色使用了 CSS 变量而非硬编码
- [ ] 列表有 `wx:key`
- [ ] 有加载态和空状态设计
- [ ] 字数校验使用了 `utils/validator.js`

### 动画组件
- [ ] 有 `isAnimating` 防重入标志
- [ ] 各阶段延迟和时长符合设计规范
- [ ] 缓动曲线与设计规范一致

---

## 7. 沟通与汇报规范

### 7.1 任务完成后的汇报格式

```
## 完成情况
[简述做了什么]

## 修改的文件
- `路径/文件名`：[改动说明]

## 测试结果
[自测情况，包括测试用例和结果]

## 已知问题 / 后续建议
[未解决的问题或优化点]

## 需要人工确认的事项
[需要人类审查或决策的内容]
```

### 7.2 遇到以下情况必须停止并询问

- 任务要求修改 **生产数据库** 中的数据
- 任务涉及 **删除** 任何文件或数据库集合
- 需要 **新增云函数** 但不在 `TASK-PHASES.md` 的当前 Sprint 范围内
- 发现现有代码存在**安全漏洞**（越权、注入等）
- 任务描述与 `CLAUDE.md` 中的禁止事项冲突

### 7.3 不得擅自做的事

- 不得修改 `app.json` 中的 `pages` 配置（页面增删需人工确认）
- 不得修改数据库集合的字段名（破坏现有数据结构）
- 不得更改云函数的返回 `code` 定义（影响前端错误处理）
- 不得在未告知的情况下引入新的 npm 依赖

---

## 8. 版本与迭代

| 版本 | 说明 |
|------|------|
| v1.0 | 初始版本，对应一期 MVP Sprint 0–8 |
| v2.0 | 二期功能（精准匹配、NLP 摘要、古文字转换）开发时更新 |

*本规范与 `CLAUDE.md` 和 `TASK-PHASES.md` 配合使用，三者共同构成 AI Agent 的完整行为约束。*
