// cloudfunctions/sendLetter/index.js — 发送信件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const MAX_CONTENT_LEN = 5000
const MAX_TITLE_LEN = 30
const MAX_ACTIVE_GROUPS = 5 // 普通用户活跃书信组上限

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const { title, content, targetUid, isFirst } = event

    // 1. 参数校验
    if (!content || !content.trim()) {
      return { code: 1002, data: null, message: '信件内容不能为空' }
    }
    if (!targetUid) {
      return { code: 9001, data: null, message: '收信人不能为空' }
    }
    if (targetUid === OPENID) {
      return { code: 9001, data: null, message: '不能给自己写信' }
    }
    if (content.length > MAX_CONTENT_LEN) {
      return { code: 9001, data: null, message: `信件内容不能超过${MAX_CONTENT_LEN}字符` }
    }

    // 2. 字数校验（后端计算，不信任前端传入）
    const wordCount = _countWords(content)
    const required = isFirst ? 150 : 100
    if (wordCount < required) {
      return { code: 1002, data: null, message: `字数不足，至少需要${required}字，当前${wordCount}字` }
    }

    // 3. 活跃书信组数检查（仅首封信时校验）
    if (isFirst) {
      const [userRes, activeSentRes] = await Promise.all([
        db.collection('users').doc(OPENID).field({ _id: true, is_member: true }).get(),
        db.collection('letters')
          .where({ from_uid: OPENID, is_first: true, status: db.command.neq('archived') })
          .count()
      ])

      if (!userRes.data) {
        return { code: 9001, data: null, message: '用户不存在' }
      }

      const isMember = userRes.data.is_member || false
      if (!isMember && activeSentRes.total >= MAX_ACTIVE_GROUPS) {
        return { code: 1005, data: null, message: `活跃书信组数已达上限（${MAX_ACTIVE_GROUPS}组），请先完成或归档现有书信` }
      }
    }

    // 4. 内容安全（正文 + 标题）
    const moderateTargets = [{ content }]
    if (title && title.trim()) {
      moderateTargets.push({ content: title.trim() })
    }

    for (const target of moderateTargets) {
      const modResult = await cloud.callFunction({ name: 'moderateContent', data: target })
      if (modResult.result && modResult.result.code !== 0) {
        return { code: 1001, data: null, message: '内容包含违规信息，请修改后重新发送' }
      }
    }

    // 5. 检查收信人是否存在
    const targetUserRes = await db.collection('users')
      .doc(targetUid)
      .field({ _id: true })
      .get()
    if (!targetUserRes.data) {
      return { code: 9001, data: null, message: '收信人不存在' }
    }

    // 6. 写入 letters 集合
    const letter = {
      from_uid: OPENID,
      to_uid: targetUid,
      parent_id: event.parentId || null,
      title: (title || '').trim().slice(0, MAX_TITLE_LEN),
      content,
      word_count: wordCount,
      status: 'sent',
      is_first: !!isFirst,
      created_at: db.serverDate()
    }

    const addRes = await db.collection('letters').add({ data: letter })

    // 首封信发出后，将匹配状态更新为 active
    if (isFirst) {
      try {
        const matchRes = await db.collection('matches')
          .where({ uid_a: OPENID, uid_b: targetUid })
          .get()
        if (matchRes.data && matchRes.data.length > 0) {
          await db.collection('matches').doc(matchRes.data[0]._id).update({
            data: { status: 'active', updated_at: db.serverDate() }
          })
        }
      } catch (e) {}
    }

    // TODO: 触发订阅消息推送通知收信人

    return { code: 0, data: { _id: addRes._id }, message: 'ok' }
  } catch (err) {
    console.error('[sendLetter] error:', err)
    return { code: 9001, data: null, message: err.message }
  }
}

function _countWords(text) {
  if (!text || typeof text !== 'string') return 0
  const trimmed = text.trim()
  if (!trimmed) return 0
  const chineseChars = (trimmed.match(/[一-龥]/g) || []).length
  const withoutChinese = trimmed.replace(/[一-龥]/g, ' ')
  const englishWords = (withoutChinese.match(/\b[a-zA-Z]+\b/g) || []).length
  const numbers = (withoutChinese.match(/\b\d+\b/g) || []).length
  return chineseChars + englishWords + numbers
}
