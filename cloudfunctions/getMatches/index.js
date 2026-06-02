// cloudfunctions/getMatches/index.js — 计算用户匹配分（定时触发：每日 0 点）
// 使用 Jaccard 相似度算法 + 加权修正
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    // 并行获取：当前用户、所有其他用户、已发信件、已有匹配记录
    const [userRes, usersRes, lettersRes, existingMatchesRes] = await Promise.all([
      db.collection('users').doc(OPENID).get(),
      db.collection('users')
        .where({ _id: db.command.neq(OPENID) })
        .field({ _id: true, nickname: true, tags: true, active_time: true, letter_freq: true, last_active: true })
        .limit(100)
        .get(),
      db.collection('letters')
        .where({ from_uid: OPENID })
        .field({ to_uid: true })
        .get(),
      db.collection('matches')
        .where({ uid_a: OPENID })
        .field({ _id: true, uid_b: true, status: true })
        .get()
    ])

    if (!userRes.data) {
      return { code: 9001, data: null, message: '用户不存在' }
    }
    const userA = userRes.data
    const allUsers = usersRes.data || []

    const contactedUids = new Set((lettersRes.data || []).map(l => l.to_uid))

    // 已有匹配记录 map：uid_b -> { _id, status }
    const existingMatchMap = {}
    for (const m of (existingMatchesRes.data || [])) {
      existingMatchMap[m.uid_b] = { _id: m._id, status: m.status }
    }

    // 批量 upsert 匹配分
    const upsertPromises = []
    for (const userB of allUsers) {
      if (contactedUids.has(userB._id)) continue

      const score = calcScore(userA, userB)
      if (score < 0) continue

      const tagsCommon = getCommonTags(userA.tags || [], userB.tags || [])
      const existing = existingMatchMap[userB._id]

      if (existing) {
        // 只更新状态不是 skipped 的记录
        if (existing.status !== 'skipped') {
          upsertPromises.push(
            db.collection('matches').doc(existing._id).update({
              data: { score, tags_common: tagsCommon, status: 'pending', updated_at: db.serverDate() }
            })
          )
        }
      } else {
        upsertPromises.push(
          db.collection('matches').add({
            data: {
              uid_a: OPENID,
              uid_b: userB._id,
              score,
              tags_common: tagsCommon,
              status: 'pending',
              updated_at: db.serverDate()
            }
          })
        )
      }
    }

    // 并发执行，但限制并发数避免超时
    const BATCH_SIZE = 10
    for (let i = 0; i < upsertPromises.length; i += BATCH_SIZE) {
      await Promise.all(upsertPromises.slice(i, i + BATCH_SIZE))
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
  return Date.now() - d.getTime() <= 7 * 24 * 60 * 60 * 1000
}
