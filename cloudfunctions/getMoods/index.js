// cloudfunctions/getMoods/index.js — 获取指定月份情绪列表
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const { year, month } = event
    if (!year || !month) {
      return { code: 9001, data: null, message: '年份和月份不能为空' }
    }

    const mm = String(month).padStart(2, '0')
    const startDate = `${year}-${mm}-01`
    const endDate = `${year}-${mm}-31`

    const res = await db.collection('moods')
      .where({
        uid: OPENID,
        date: db.command.gte(startDate).and(db.command.lte(endDate))
      })
      .orderBy('date', 'asc')
      .get()

    return { code: 0, data: res.data || [], message: 'ok' }
  } catch (err) {
    console.error('[getMoods] error:', err)
    return { code: 9001, data: null, message: err.message }
  }
}
