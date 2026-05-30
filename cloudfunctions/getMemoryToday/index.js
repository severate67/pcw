// cloudfunctions/getMemoryToday/index.js — 获取「去年的今天」
// 触发方式：每日 8:00 定时触发 + 用户主动调用
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const today = new Date()
    const lastYear = today.getFullYear() - 1
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const lastYearToday = `${lastYear}-${mm}-${dd}`

    // 查找去年今天的情绪记录
    const moodRes = await db.collection('moods')
      .where({ uid: OPENID, date: lastYearToday })
      .get()

    if (!moodRes.data || moodRes.data.length === 0) {
      // 没有去年同日情绪记录，尝试找去年同日发出的信件
      const letterRes = await db.collection('letters')
        .where({
          from_uid: OPENID,
          created_at: db.command.gte(new Date(`${lastYearToday}T00:00:00.000Z`))
            .and(db.command.lte(new Date(`${lastYearToday}T23:59:59.999Z`)))
        })
        .limit(1)
        .get()

      if (letterRes.data && letterRes.data.length > 0) {
        return { code: 0, data: { type: 'letter', ...letterRes.data[0] }, message: 'ok' }
      }

      return { code: 0, data: null, message: 'no memory' }
    }

    return { code: 0, data: { type: 'mood', ...moodRes.data[0] }, message: 'ok' }
  } catch (err) {
    console.error('[getMemoryToday] error:', err)
    return { code: 9001, data: null, message: err.message }
  }
}
