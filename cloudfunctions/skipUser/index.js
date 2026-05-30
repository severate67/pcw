// cloudfunctions/skipUser/index.js — 跳过推荐用户
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const { targetUid } = event
    if (!targetUid) {
      return { code: 9001, data: null, message: '目标用户ID不能为空' }
    }

    // 更新 matches 记录状态为 skipped
    const matchRes = await db.collection('matches')
      .where({
        uid_a: OPENID,
        uid_b: targetUid
      })
      .get()

    if (matchRes.data && matchRes.data.length > 0) {
      await db.collection('matches').doc(matchRes.data[0]._id).update({
        data: {
          status: 'skipped',
          updated_at: db.serverDate()
        }
      })
    } else {
      // 如果没有匹配记录，创建一条 skipped 状态的记录
      await db.collection('matches').add({
        data: {
          uid_a: OPENID,
          uid_b: targetUid,
          score: -1,
          tags_common: [],
          status: 'skipped',
          updated_at: db.serverDate()
        }
      })
    }

    return { code: 0, data: null, message: 'ok' }
  } catch (err) {
    console.error('[skipUser] error:', err)
    return { code: 9001, data: null, message: err.message }
  }
}
