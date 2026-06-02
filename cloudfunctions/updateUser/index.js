// cloudfunctions/updateUser/index.js — 更新用户资料
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const VALID_ACTIVE_TIMES = ['morning', 'afternoon', 'night']
const VALID_LETTER_FREQS = ['weekly', 'biweekly', 'free']
const MAX_TAG_LEN = 20

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const { nickname, intro, tags, activeTime, letterFreq } = event
    const updateData = {}

    if (nickname !== undefined) {
      const trimmed = nickname.trim()
      if (!trimmed) return { code: 9001, data: null, message: '昵称不能为空' }
      if (trimmed.length > 20) return { code: 9001, data: null, message: '昵称不能超过20字' }

      // 昵称内容安全检查
      const modResult = await cloud.callFunction({
        name: 'moderateContent',
        data: { content: trimmed }
      })
      if (modResult.result && modResult.result.code !== 0) {
        return { code: 1001, data: null, message: '昵称包含违规信息，请修改' }
      }

      updateData.nickname = trimmed.slice(0, 20)
    }

    if (intro !== undefined) {
      const introCount = _countWords(intro)
      if (introCount < 20 || introCount > 60) {
        return { code: 1002, data: null, message: `介绍需在20-60字之间，当前${introCount}字` }
      }

      const modResult = await cloud.callFunction({
        name: 'moderateContent',
        data: { content: intro.trim() }
      })
      if (modResult.result && modResult.result.code !== 0) {
        return { code: 1001, data: null, message: '介绍内容包含违规信息，请修改' }
      }

      updateData.intro = intro.trim()
    }

    if (tags !== undefined) {
      if (!Array.isArray(tags) || tags.length < 3 || tags.length > 5) {
        return { code: 9001, data: null, message: '标签需选择3-5个' }
      }
      const sanitizedTags = tags.map(t => String(t).trim()).filter(Boolean)
      if (sanitizedTags.length < 3) {
        return { code: 9001, data: null, message: '标签内容不合法' }
      }
      if (sanitizedTags.some(t => t.length > MAX_TAG_LEN)) {
        return { code: 9001, data: null, message: `标签长度不能超过${MAX_TAG_LEN}字` }
      }
      updateData.tags = sanitizedTags.slice(0, 5)
    }

    if (activeTime !== undefined && VALID_ACTIVE_TIMES.includes(activeTime)) {
      updateData.active_time = activeTime
    }

    if (letterFreq !== undefined && VALID_LETTER_FREQS.includes(letterFreq)) {
      updateData.letter_freq = letterFreq
    }

    updateData.last_active = db.serverDate()

    if (Object.keys(updateData).length <= 1) {
      return { code: 9001, data: null, message: '没有需要更新的字段' }
    }

    await db.collection('users').doc(OPENID).update({ data: updateData })

    return { code: 0, data: updateData, message: 'ok' }
  } catch (err) {
    console.error('[updateUser] error:', err)
    return { code: 9001, data: null, message: err.message }
  }
}

function _countWords(text) {
  if (!text || typeof text !== 'string') return 0
  const trimmed = text.trim()
  if (!trimmed) return 0
  const chineseChars = (trimmed.match(/[一-鿿]/g) || []).length
  const withoutChinese = trimmed.replace(/[一-鿿]/g, ' ')
  const englishWords = (withoutChinese.match(/\b[a-zA-Z]+\b/g) || []).length
  const numbers = (withoutChinese.match(/\b\d+\b/g) || []).length
  return chineseChars + englishWords + numbers
}
