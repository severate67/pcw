// cloudfunctions/getInbox/index.js — 获取收件箱
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const PAGE_SIZE = 10

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const page = Math.max(0, parseInt(event.page) || 0)
    const skip = page * PAGE_SIZE

    const res = await db.collection('letters')
      .where({
        to_uid: OPENID,
        status: db.command.neq('archived')
      })
      .orderBy('created_at', 'desc')
      .skip(skip)
      .limit(PAGE_SIZE)
      .field({ _id: true, from_uid: true, title: true, word_count: true, status: true, is_first: true, created_at: true, read_at: true })
      .get()

    // 批量获取发件人昵称
    const letters = res.data || []
    const fromUids = [...new Set(letters.map(l => l.from_uid))]
    const senderMap = {}

    if (fromUids.length > 0) {
      try {
        const sendersRes = await db.collection('users')
          .where({ _id: db.command.in(fromUids) })
          .field({ _id: true, nickname: true })
          .get()
        sendersRes.data.forEach(u => {
          senderMap[u._id] = u.nickname
        })
      } catch (e) {}
    }

    const enrichedLetters = letters.map(l => ({
      ...l,
      senderNickname: senderMap[l.from_uid] || '陌生人'
    }))

    return { code: 0, data: enrichedLetters, message: 'ok' }
  } catch (err) {
    console.error('[getInbox] error:', err)
    return { code: 9001, data: null, message: err.message }
  }
}
