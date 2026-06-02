// cloudfunctions/getMoodComments/index.js — 获取心情评论列表
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const PAGE_SIZE = 20

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const { moodId, page } = event
    if (!moodId) {
      return { code: 9001, data: null, message: '心情ID不能为空' }
    }

    // 校验心情是否可见（公开 or 自己的）
    const moodRes = await db.collection('moods')
      .doc(moodId)
      .field({ _id: true, uid: true, visibility: true })
      .get()
    if (!moodRes.data) {
      return { code: 9001, data: null, message: '心情记录不存在' }
    }
    const mood = moodRes.data
    if (mood.visibility !== 'public' && mood.uid !== OPENID) {
      return { code: 9001, data: null, message: '无权查看该心情的评论' }
    }

    const skip = Math.max(0, parseInt(page) || 0) * PAGE_SIZE

    const commentsRes = await db.collection('mood_comments')
      .where({ mood_id: moodId })
      .orderBy('created_at', 'asc')
      .skip(skip)
      .limit(PAGE_SIZE)
      .get()

    const comments = commentsRes.data || []
    if (comments.length === 0) {
      return { code: 0, data: { comments: [], moodUid: mood.uid }, message: 'ok' }
    }

    // 批量获取评论者昵称
    const fromUids = [...new Set(comments.map(c => c.from_uid))]
    let nicknameMap = {}
    try {
      const usersRes = await db.collection('users')
        .where({ _id: db.command.in(fromUids) })
        .field({ _id: true, nickname: true })
        .get()
      usersRes.data.forEach(u => { nicknameMap[u._id] = u.nickname })
    } catch (e) {}

    const enriched = comments.map(c => ({
      ...c,
      fromNickname: nicknameMap[c.from_uid] || '陌生人',
      isMine: c.from_uid === OPENID
    }))

    return {
      code: 0,
      data: { comments: enriched, moodUid: mood.uid, isMoodMine: mood.uid === OPENID },
      message: 'ok'
    }
  } catch (err) {
    console.error('[getMoodComments] error:', err)
    return { code: 9001, data: null, message: err.message }
  }
}
