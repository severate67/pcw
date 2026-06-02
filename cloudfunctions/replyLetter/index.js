// cloudfunctions/replyLetter/index.js — 回复信件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const MAX_CONTENT_LEN = 5000
const MAX_TITLE_LEN = 30

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const { parentId, content, title } = event

    if (!parentId || !content) {
      return { code: 9001, data: null, message: '参数不完整' }
    }
    if (content.length > MAX_CONTENT_LEN) {
      return { code: 9001, data: null, message: `回信内容不能超过${MAX_CONTENT_LEN}字符` }
    }

    // 字数校验（回信 >= 100 字）
    const wordCount = _countWords(content)
    if (wordCount < 100) {
      return { code: 1002, data: null, message: `回信至少需要100字，当前${wordCount}字` }
    }

    // 内容安全检查（正文 + 标题）
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

    // 获取原始信件，确定收件人
    const parentRes = await db.collection('letters')
      .doc(parentId)
      .field({ _id: true, from_uid: true, to_uid: true })
      .get()
    if (!parentRes.data) {
      return { code: 9001, data: null, message: '原信件不存在' }
    }

    const parent = parentRes.data

    // 权限校验：只有原收件人或发件人可以回信
    if (parent.from_uid !== OPENID && parent.to_uid !== OPENID) {
      return { code: 9001, data: null, message: '无权限回信' }
    }

    // 确定收件人（对方）
    const targetUid = parent.from_uid === OPENID ? parent.to_uid : parent.from_uid

    // 写入回信
    const letter = {
      from_uid: OPENID,
      to_uid: targetUid,
      parent_id: parentId,
      title: (title || '').trim().slice(0, MAX_TITLE_LEN),
      content,
      word_count: wordCount,
      status: 'sent',
      is_first: false,
      created_at: db.serverDate()
    }

    const addRes = await db.collection('letters').add({ data: letter })

    // TODO: 触发来信通知订阅消息

    return { code: 0, data: { _id: addRes._id }, message: 'ok' }
  } catch (err) {
    console.error('[replyLetter] error:', err)
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
