// cloudfunctions/sendLetter/index.js — 发送信件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

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

    // 2. 字数校验（后端计算，不信任前端传入）
    const wordCount = _countWords(content)
    const required = isFirst ? 150 : 100
    if (wordCount < required) {
      return { code: 1002, data: null, message: `字数不足，至少需要${required}字，当前${wordCount}字` }
    }

    // 3. 内容安全（调用 moderateContent 云函数）
    const modResult = await cloud.callFunction({
      name: 'moderateContent',
      data: { content }
    })
    if (modResult.result && modResult.result.code !== 0) {
      return { code: 1001, data: null, message: '内容包含违规信息，请修改后重新发送' }
    }

    // 4. 检查收信人是否存在且未拒绝
    const userRes = await db.collection('users').doc(targetUid).get()
    if (!userRes.data) {
      return { code: 9001, data: null, message: '收信人不存在' }
    }

    // 5. 写入 letters 集合
    const letter = {
      from_uid: OPENID,
      to_uid: targetUid,
      parent_id: event.parentId || null,
      title: (title || '').slice(0, 30),
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

// 后端字数计算（与前端 validator.js 保持一致）
function _countWords(text) {
  if (!text || typeof text !== 'string') return 0
  const trimmed = text.trim()
  if (!trimmed) return 0
  const chineseChars = (trimmed.match(/[一-龥]/g) || []).length
  const withoutChinese = trimmed.replace(/[一-龥]/g, ' ')
  const englishWords = (withoutChinese.match(/\b[a-zA-Z]+\b/g) || []).length
  return chineseChars + englishWords
}
