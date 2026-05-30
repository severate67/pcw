// cloudfunctions/getDailyRecommend/index.js — 获取每日推荐列表
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 官方「平常信使」账号 openid（冷启动兜底）
const MESSENGER_UID = 'official_messenger_pingchang'

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    // 获取当前用户，判断是否会员
    const userRes = await db.collection('users').doc(OPENID).get()
    if (!userRes.data) {
      return { code: 9001, data: null, message: '用户不存在，请先完成注册' }
    }
    const isMember = userRes.data.is_member || false
    const limit = isMember ? 5 : 3

    // 查询 matches 集合中当前用户的 pending 推荐
    const matchRes = await db.collection('matches')
      .where({
        uid_a: OPENID,
        status: 'pending'
      })
      .orderBy('score', 'desc')
      .limit(limit)
      .get()

    const matches = matchRes.data || []

    // 批量获取推荐用户的公开信息
    const recommendations = []
    for (const match of matches) {
      try {
        const profileRes = await db.collection('users')
          .doc(match.uid_b)
          .field({ _id: true, nickname: true, intro: true, tags: true, active_time: true, letter_freq: true, last_active: true })
          .get()

        if (profileRes.data) {
          recommendations.push({
            _id: match._id,
            profile: profileRes.data,
            score: match.score,
            tagsCommon: match.tags_common || []
          })
        }
      } catch (e) {}
    }

    // 冷启动兜底：推荐不足时插入信使账号
    if (recommendations.length < 3) {
      try {
        const messengerRes = await db.collection('users').doc(MESSENGER_UID).get()
        if (messengerRes.data && !recommendations.find(r => r.profile._id === MESSENGER_UID)) {
          recommendations.push({
            _id: 'messenger_' + Date.now(),
            profile: messengerRes.data,
            score: 50,
            tagsCommon: []
          })
        }
      } catch (e) {}
    }

    if (recommendations.length === 0) {
      return { code: 1004, data: [], message: '今日推荐已用完，明天再来' }
    }

    return { code: 0, data: recommendations, message: 'ok' }
  } catch (err) {
    console.error('[getDailyRecommend] error:', err)
    return { code: 9001, data: null, message: err.message }
  }
}
