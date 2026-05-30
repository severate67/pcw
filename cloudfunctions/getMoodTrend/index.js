// cloudfunctions/getMoodTrend/index.js — 获取过去30天情绪趋势
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    // 计算30天前的日期
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const startDate = thirtyDaysAgo.toISOString().slice(0, 10)
    const endDate = now.toISOString().slice(0, 10)

    const res = await db.collection('moods')
      .where({
        uid: OPENID,
        date: db.command.gte(startDate).and(db.command.lte(endDate))
      })
      .orderBy('date', 'asc')
      .get()

    // 返回 {date, intensity, emotion} 格式，用于折线图渲染
    const trend = (res.data || []).map(m => ({
      date: m.date,
      intensity: m.intensity,
      emotion: m.emotion
    }))

    return { code: 0, data: trend, message: 'ok' }
  } catch (err) {
    console.error('[getMoodTrend] error:', err)
    return { code: 9001, data: null, message: err.message }
  }
}
