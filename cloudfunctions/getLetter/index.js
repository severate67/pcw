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
        data: {
          status: 'read',
          read_at: db.serverDate()
        }
      })
      letter.status = 'read'
    }

    // 获取发件人昵称（只返回安全字段）
    let senderNickname = '陌生人'
    try {
      const senderRes = await db.collection('users').doc(letter.from_uid).get()
      if (senderRes.data) {
        senderNickname = senderRes.data.nickname
      }
    } catch (e) {}

    // 计算回信目标（对方），前端不能直接比较 openid
    const isRecipient = letter.to_uid === OPENID
    const replyToUid = isRecipient ? letter.from_uid : letter.to_uid
    let replyToNickname = isRecipient ? senderNickname : '陌生人'

    if (!isRecipient) {
      // 当前用户是发件人，需要获取收件人昵称
      try {
        const receiverRes = await db.collection('users').doc(letter.to_uid).get()
        if (receiverRes.data) {
          replyToNickname = receiverRes.data.nickname
        }
      } catch (e) {}
    }

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
