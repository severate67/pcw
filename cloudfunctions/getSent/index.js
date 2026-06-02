// cloudfunctions/getSent/index.js — 获取已发出列表
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
      .where({ from_uid: OPENID, status: db.command.neq('archived') })
      .orderBy('created_at', 'desc')
      .skip(skip)
      .limit(PAGE_SIZE)
      .field({ _id: true, to_uid: true, title: true, word_count: true, status: true, is_first: true, created_at: true, read_at: true })
      .get()

    // 批量获取收件人昵称
    const letters = res.data || []
    const toUids = [...new Set(letters.map(l => l.to_uid))]
    const receiverMap = {}

    if (toUids.length > 0) {
      try {
        const receiversRes = await db.collection('users')
          .where({ _id: db.command.in(toUids) })
          .field({ _id: true, nickname: true })
          .get()
        receiversRes.data.forEach(u => {
          receiverMap[u._id] = u.nickname
        })
      } catch (e) {}
    }

    const enrichedLetters = letters.map(l => ({
      ...l,
      receiverNickname: receiverMap[l.to_uid] || '陌生人'
    }))

    return { code: 0, data: enrichedLetters, message: 'ok' }
  } catch (err) {
    console.error('[getSent] error:', err)
    return { code: 9001, data: null, message: err.message }
  }
}
