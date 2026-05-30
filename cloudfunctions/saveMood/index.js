// cloudfunctions/saveMood/index.js — 保存情绪记录
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const { emotion, intensity, diary, date } = event

    // 参数校验
    const validEmotions = ['happy', 'calm', 'sad', 'anxious', 'mixed']
    if (!emotion || !validEmotions.includes(emotion)) {
      return { code: 9001, data: null, message: '情绪类型不合法' }
    }
    if (!intensity || intensity < 1 || intensity > 5) {
      return { code: 9001, data: null, message: '情绪强度需在1-5之间' }
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { code: 9001, data: null, message: '日期格式不正确' }
    }

    // 日记字数校验（选填，如填写需 >= 30 字）
    if (diary && diary.trim()) {
      const wordCount = _countWords(diary)
      if (wordCount < 30) {
        return { code: 1002, data: null, message: `日记至少需要30字，当前${wordCount}字` }
      }

      // 内容安全检查
      const modResult = await cloud.callFunction({
        name: 'moderateContent',
        data: { content: diary }
      })
      if (modResult.result && modResult.result.code !== 0) {
        return { code: 1001, data: null, message: '内容包含违规信息，请修改' }
      }
    }

    const moodData = {
      uid: OPENID,
      emotion,
      intensity: parseInt(intensity),
      diary: (diary || '').trim(),
      date
    }

    // 同一天重复记录则覆盖（upsert）
    const existing = await db.collection('moods')
      .where({ uid: OPENID, date })
      .get()

    let result
    if (existing.data && existing.data.length > 0) {
      const docId = existing.data[0]._id
      await db.collection('moods').doc(docId).update({ data: moodData })
      result = { _id: docId, ...moodData }
    } else {
      const addRes = await db.collection('moods').add({ data: moodData })
      result = { _id: addRes._id, ...moodData }
    }

    return { code: 0, data: result, message: 'ok' }
  } catch (err) {
    console.error('[saveMood] error:', err)
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
