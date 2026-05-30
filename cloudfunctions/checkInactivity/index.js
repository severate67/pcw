// cloudfunctions/checkInactivity/index.js — 检查不活跃通信（定时触发：每日 9 点）
// 识别 7/14/30 天未回应的信件，可用于订阅消息提醒
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const now = new Date()

    const thresholds = [
      { days: 7, label: '7天未回应' },
      { days: 14, label: '14天未回应' },
      { days: 30, label: '30天未回应' }
    ]

    const inactiveLetters = []

    for (const threshold of thresholds) {
      const cutoff = new Date(now.getTime() - threshold.days * 24 * 60 * 60 * 1000)

      // 查找 status 为 'sent' 且 created_at 超过阈值的信件
      const res = await db.collection('letters')
        .where({
          status: 'sent',
          created_at: db.command.lte(cutoff)
        })
        .limit(20)
        .get()

      if (res.data && res.data.length > 0) {
        inactiveLetters.push({
          threshold: threshold.label,
          letters: res.data.map(l => ({ _id: l._id, to_uid: l.to_uid, from_uid: l.from_uid }))
        })
      }
    }

    // TODO: 发送订阅消息提醒收件人查看信件

    return {
      code: 0,
      data: { checked: inactiveLetters.length, inactiveLetters },
      message: 'ok'
    }
  } catch (err) {
    console.error('[checkInactivity] error:', err)
    return { code: 9001, data: null, message: err.message }
  }
}
