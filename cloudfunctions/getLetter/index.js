// cloudfunctions/getLetter/index.js — 获取信件详情
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const { id } = event
    if (!id) {
      return { code: 9001, data: null, message: '信件ID不能为空' }
    }

    const letterRes = await db.collection('letters').doc(id).get()
    const letter = letterRes.data

    if (!letter) {
      return { code: 9001, data: null, message: '信件不存在' }
    }

    // 权限校验：只有发件人或收件人可读取
    if (letter.from_uid !== OPENID && letter.to_uid !== OPENID) {
      return { code: 9001, data: null, message: '无权限查看此信件' }
    }

    // 如果是收件人首次读取，更新状态为 read
    if (letter.to_uid === OPENID && letter.status === 'sent') {
      await db.collection('letters').doc(id).update({
        data: { status: 'read', read_at: db.serverDate() }
      })
      letter.status = 'read'
    }

    const isRecipient = letter.to_uid === OPENID

    // 并行获取发件人和收件人昵称
    const [senderRes, receiverRes] = await Promise.all([
      db.collection('users').doc(letter.from_uid).field({ _id: true, nickname: true }).get().catch(() => ({ data: null })),
      isRecipient
        ? Promise.resolve({ data: null })
        : db.collection('users').doc(letter.to_uid).field({ _id: true, nickname: true }).get().catch(() => ({ data: null }))
    ])

    const senderNickname = senderRes.data ? senderRes.data.nickname : '陌生人'
    const replyToUid = isRecipient ? letter.from_uid : letter.to_uid
    const replyToNickname = isRecipient
      ? senderNickname
      : (receiverRes.data ? receiverRes.data.nickname : '陌生人')

    return {
      code: 0,
      data: {
        ...letter,
        senderNickname,
        replyToUid,
        replyToNickname,
        isRecipient
      },
      message: 'ok'
    }
  } catch (err) {
    console.error('[getLetter] error:', err)
    return { code: 9001, data: null, message: err.message }
  }
}
