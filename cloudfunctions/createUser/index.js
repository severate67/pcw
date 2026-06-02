// cloudfunctions/createUser/index.js — 新用户注册
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const VALID_ACTIVE_TIMES = ['morning', 'afternoon', 'night', 'free']
const VALID_LETTER_FREQS = ['weekly', 'biweekly', 'free']
const MAX_TAG_LEN = 20
const MAX_TAGS = 5

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const { nickname, intro, tags, activeTime, letterFreq } = event

    // 参数校验
    if (!nickname || !nickname.trim()) {
      return { code: 9001, data: null, message: '昵称不能为空' }
    }
    if (nickname.trim().length > 20) {
      return { code: 9001, data: null, message: '昵称不能超过20字' }
    }
    if (!intro || !intro.trim()) {
      return { code: 9001, data: null, message: '一句话介绍不能为空' }
    }
    if (!Array.isArray(tags) || tags.length < 3 || tags.length > MAX_TAGS) {
      return { code: 9001, data: null, message: '标签需选择3-5个' }
    }

    // 标签合法性校验（非空字符串，长度限制）
    const sanitizedTags = tags.map(t => String(t).trim()).filter(Boolean)
    if (sanitizedTags.length < 3) {
      return { code: 9001, data: null, message: '标签内容不合法' }
    }
    if (sanitizedTags.some(t => t.length > MAX_TAG_LEN)) {
      return { code: 9001, data: null, message: `标签长度不能超过${MAX_TAG_LEN}字` }
    }

    // 字数校验（后端校验 intro 20-60 字）
    const introCount = _countWords(intro)
    if (introCount < 20 || introCount > 60) {
      return { code: 1002, data: null, message: `一句话介绍需在20-60字之间，当前${introCount}字` }
    }

    // 内容安全检查（昵称 + 介绍）
    for (const text of [nickname.trim(), intro.trim()]) {
      const modResult = await cloud.callFunction({
        name: 'moderateContent',
        data: { content: text }
      })
      if (modResult.result && modResult.result.code !== 0) {
        return { code: 1001, data: null, message: '内容包含违规信息，请修改' }
      }
    }

    // 检查是否已注册
    try {
      const existingUser = await db.collection('users').doc(OPENID).get()
      if (existingUser.data) {
        return { code: 9001, data: null, message: '用户已注册' }
      }
    } catch (e) {}

    const validatedActiveTime = VALID_ACTIVE_TIMES.includes(activeTime) ? activeTime : 'free'
    const validatedLetterFreq = VALID_LETTER_FREQS.includes(letterFreq) ? letterFreq : 'free'

    const userData = {
      _id: OPENID,
      nickname: nickname.trim().slice(0, 20),
      intro: intro.trim(),
      tags: sanitizedTags.slice(0, MAX_TAGS),
      active_time: validatedActiveTime,
      letter_freq: validatedLetterFreq,
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
  const numbers = (withoutChinese.match(/\b\d+\b/g) || []).length
  return chineseChars + englishWords + numbers
}
