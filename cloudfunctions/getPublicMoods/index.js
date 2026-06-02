// cloudfunctions/getPublicMoods/index.js — 获取公开心情广场
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const PAGE_SIZE = 10
const EMOTION_LABELS = { happy: '开心', calm: '平静', sad: '难过', anxious: '焦虑', mixed: '复杂' }

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const page = Math.max(0, parseInt(event.page) || 0)
    const skip = page * PAGE_SIZE

    // 查询所有公开心情（不含当前用户自己的，以便看"他人"视角）
    const query = event.includeSelf
      ? { visibility: 'public' }
      : { visibility: 'public', uid: db.command.neq(OPENID) }

    const res = await db.collection('moods')
      .where(query)
      .orderBy('date', 'desc')
      .orderBy('_id', 'desc')
      .skip(skip)
      .limit(PAGE_SIZE)
      .field({ _id: true, uid: true, emotion: true, intensity: true, diary: true, date: true })
      .get()

    const moods = res.data || []
    if (moods.length === 0) {
      return { code: 0, data: [], message: 'ok' }
    }

    // 批量获取作者昵称
    const uids = [...new Set(moods.map(m => m.uid))]
    let authorMap = {}
    try {
      const authorRes = await db.collection('users')
        .where({ _id: db.command.in(uids) })
        .field({ _id: true, nickname: true })
        .get()
      authorRes.data.forEach(u => { authorMap[u._id] = u.nickname })
    } catch (e) {}

    // 批量获取评论数
    const moodIds = moods.map(m => m._id)
    let commentCountMap = {}
    try {
      // 逐条统计（云数据库暂不支持 group by，但 count + in 可以）
      await Promise.all(moods.map(async m => {
        const countRes = await db.collection('mood_comments')
          .where({ mood_id: m._id })
          .count()
        commentCountMap[m._id] = countRes.total || 0
      }))
    } catch (e) {}

    const enriched = moods.map(m => ({
      ...m,
      emotionLabel: EMOTION_LABELS[m.emotion] || m.emotion,
      authorNickname: authorMap[m.uid] || '陌生人',
      commentCount: commentCountMap[m._id] || 0,
      isMine: m.uid === OPENID
    }))

    return { code: 0, data: enriched, message: 'ok' }
  } catch (err) {
    console.error('[getPublicMoods] error:', err)
    return { code: 9001, data: null, message: err.message }
  }
}
