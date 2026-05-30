// cloudfunctions/createUser/index.js — 新用户注册
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const { nickname, intro, tags, activeTime, letterFreq } = event

    // 参数校验
    if (!nickname || !nickname.trim()) {
      return { code: 9001, data: null, message: '昵称不能为空' }
    }
    if (!intro || !intro.trim()) {
      return { code: 9001, data: null, message: '一句话介绍不能为空' }
    }
    if (!tags || tags.length < 3 || tags.length > 5) {
      return { code: 9001, data: null, message: '标签需选择3-5个' }
    }

    // 字数校验（后端校验 intro 20-60 字）
    const introCount = _countWords(intro)
    if (introCount < 20 || introCount > 60) {
      return { code: 1002, data: null, message: `一句话介绍需在20-60字之间，当前${introCount}字` }
    }

    // 内容安全检查
    const modResult = await cloud.callFunction({
      name: 'moderateContent',
      data: { content: intro }
    })
    if (modResult.result && modResult.result.code !== 0) {
      return { code: 1001, data: null, message: '介绍内容包含违规信息，请修改' }
    }

    // 检查是否已注册
    try {
      const existingUser = await db.collection('users').doc(OPENID).get()
      if (existingUser.data) {
        return { code: 9001, data: null, message: '用户已注册' }
      }
    } catch (e) {}

    const userData = {
      _id: OPENID,
      nickname: nickname.trim().slice(0, 20),
      intro: intro.trim(),
      tags: tags.slice(0, 5),
      active_time: activeTime || 'free',
      letter_freq: letterFreq || 'free',
      created_at: db.serverDate(),
      last_active: db.serverDate(),
      is_member: false,
      member_expire: null
    }

    await db.collection('users').add({ data: userData })

    return { code: 0, data: userData, message: 'ok' }
  } catch (err) {
    console.error('[createUser] error:', err)
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
  return chineseChars + englishWords
}
