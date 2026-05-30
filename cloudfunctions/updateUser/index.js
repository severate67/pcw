// cloudfunctions/updateUser/index.js — 更新用户资料
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const { nickname, intro, tags, activeTime, letterFreq } = event
    const updateData = {}

    if (nickname !== undefined) {
      if (!nickname.trim()) return { code: 9001, data: null, message: '昵称不能为空' }
      updateData.nickname = nickname.trim().slice(0, 20)
    }

    if (intro !== undefined) {
      const introCount = _countWords(intro)
      if (introCount < 20 || introCount > 60) {
        return { code: 1002, data: null, message: `介绍需在20-60字之间，当前${introCount}字` }
      }

      // 内容安全检查
      const modResult = await cloud.callFunction({
        name: 'moderateContent',
        data: { content: intro }
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
      updateData.tags = tags.slice(0, 5)
    }

    if (activeTime !== undefined) {
      const validTimes = ['morning', 'afternoon', 'night']
      if (validTimes.includes(activeTime)) {
        updateData.active_time = activeTime
      }
    }

    if (letterFreq !== undefined) {
      const validFreqs = ['weekly', 'biweekly', 'free']
      if (validFreqs.includes(letterFreq)) {
        updateData.letter_freq = letterFreq
      }
    }

    updateData.last_active = db.serverDate()

    if (Object.keys(updateData).length === 0) {
      return { code: 9001, data: null, message: '没有需要更新的字段' }
    }

    await db.collection('users').doc(OPENID).update({ data: updateData })

    // 返回更新后的完整用户数据
    const updatedUser = await db.collection('users').doc(OPENID).get()
    return { code: 0, data: updatedUser.data, message: 'ok' }
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
