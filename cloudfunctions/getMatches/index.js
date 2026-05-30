// cloudfunctions/getMatches/index.js — 计算用户匹配分（定时触发：每日 0 点）
// 使用 Jaccard 相似度算法 + 加权修正
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    // 获取当前用户资料
    const userRes = await db.collection('users').doc(OPENID).get()
    if (!userRes.data) {
      return { code: 9001, data: null, message: '用户不存在' }
    }
    const userA = userRes.data

    // 获取所有其他用户（分批处理，避免超时）
    const limit = 100
    const usersRes = await db.collection('users')
      .where({ _id: db.command.neq(OPENID) })
      .limit(limit)
      .get()

    const allUsers = usersRes.data || []

    // 获取已有通信关系（不推荐已通信用户）
    const lettersRes = await db.collection('letters')
      .where({
        from_uid: OPENID
      })
      .field({ to_uid: true })
      .get()
    const contactedUids = new Set((lettersRes.data || []).map(l => l.to_uid))

    // 计算匹配分并写入 matches 集合
    const batch = db.batch ? db.batch() : null
    const now = new Date()

    for (const userB of allUsers) {
      if (contactedUids.has(userB._id)) continue // 已有通信，跳过

      const score = calcScore(userA, userB)
      if (score < 0) continue

      const tagsCommon = getCommonTags(userA.tags || [], userB.tags || [])

      // upsert 到 matches 集合
      const existingMatch = await db.collection('matches')
        .where({
          uid_a: OPENID,
          uid_b: userB._id
        })
        .get()

      const matchData = {
        uid_a: OPENID,
        uid_b: userB._id,
        score,
        tags_common: tagsCommon,
        status: 'pending',
        updated_at: db.serverDate()
      }

      if (existingMatch.data && existingMatch.data.length > 0) {
        const matchId = existingMatch.data[0]._id
        // 只更新状态不是 skipped 的记录
        if (existingMatch.data[0].status !== 'skipped') {
          await db.collection('matches').doc(matchId).update({ data: matchData })
        }
      } else {
        await db.collection('matches').add({ data: matchData })
      }
    }

    return { code: 0, data: { matched: allUsers.length }, message: 'ok' }
  } catch (err) {
    console.error('[getMatches] error:', err)
    return { code: 9001, data: null, message: err.message }
  }
}

function calcScore(userA, userB) {
  const setA = new Set(userA.tags || [])
  const setB = new Set(userB.tags || [])
  const intersection = [...setA].filter(t => setB.has(t)).length
  const union = new Set([...setA, ...setB]).size
  let score = union === 0 ? 0 : Math.round((intersection / union) * 100)

  if (userA.active_time && userA.active_time === userB.active_time) score += 10
  if (userA.letter_freq && userA.letter_freq === userB.letter_freq) score += 5
  if (isActiveRecently(userB.last_active)) score += 8

  return Math.min(score, 100)
}

function getCommonTags(tagsA, tagsB) {
  const setB = new Set(tagsB)
  return tagsA.filter(t => setB.has(t))
}

function isActiveRecently(lastActive) {
  if (!lastActive) return false
  const d = lastActive instanceof Date ? lastActive : new Date(lastActive)
  const diff = Date.now() - d.getTime()
  return diff <= 7 * 24 * 60 * 60 * 1000
}
