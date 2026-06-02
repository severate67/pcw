// cloudfunctions/getDailyRecommend/index.js — 获取每日推荐列表
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const MESSENGER_UID = 'official_messenger_pingchang'

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    // 获取当前用户，判断是否会员
    const userRes = await db.collection('users')
      .doc(OPENID)
      .field({ _id: true, is_member: true })
      .get()
    if (!userRes.data) {
      return { code: 9001, data: null, message: '用户不存在，请先完成注册' }
    }
    const isMember = userRes.data.is_member || false
    const limit = isMember ? 5 : 3

    // 查询 matches 集合中当前用户的 pending 推荐
    const matchRes = await db.collection('matches')
      .where({ uid_a: OPENID, status: 'pending' })
      .orderBy('score', 'desc')
      .limit(limit)
      .get()

    const matches = matchRes.data || []

    // 并行批量获取推荐用户的公开信息
    const profileFields = { _id: true, nickname: true, intro: true, tags: true, active_time: true, letter_freq: true, last_active: true }
    const profileResults = await Promise.all(
      matches.map(match =>
        db.collection('users')
          .doc(match.uid_b)
          .field(profileFields)
          .get()
          .catch(() => ({ data: null }))
      )
    )

    const recommendations = []
    for (let i = 0; i < matches.length; i++) {
      const profileData = profileResults[i].data
      if (profileData) {
        recommendations.push({
          _id: matches[i]._id,
          profile: profileData,
          score: matches[i].score,
          tagsCommon: matches[i].tags_common || []
        })
      }
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
