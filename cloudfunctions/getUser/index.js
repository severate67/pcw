// cloudfunctions/getUser/index.js — 获取当前用户信息
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const userRes = await db.collection('users').doc(OPENID).get()

    if (!userRes.data) {
      return { code: 9001, data: null, message: '用户不存在，请先完成注册' }
    }

    // 更新最后活跃时间
    await db.collection('users').doc(OPENID).update({
      data: { last_active: db.serverDate() }
    })

    // 统计数据
    let lettersSent = 0, lettersReceived = 0, moodDays = 0
    try {
      const sentRes = await db.collection('letters').where({ from_uid: OPENID }).count()
      lettersSent = sentRes.total || 0

      const receivedRes = await db.collection('letters').where({ to_uid: OPENID }).count()
      lettersReceived = receivedRes.total || 0

      const moodRes = await db.collection('moods').where({ uid: OPENID }).count()
      moodDays = moodRes.total || 0
    } catch (e) {}

    return {
      code: 0,
      data: {
        ...userRes.data,
        lettersSent,
        lettersReceived,
        moodDays
      },
      message: 'ok'
    }
  } catch (err) {
    console.error('[getUser] error:', err)
    return { code: 9001, data: null, message: err.message }
  }
}
