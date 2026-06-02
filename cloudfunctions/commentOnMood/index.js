// cloudfunctions/commentOnMood/index.js — 对公开心情发表评论/回复
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const MAX_CONTENT_LEN = 200

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const { moodId, content, parentId } = event

    if (!moodId || !content || !content.trim()) {
      return { code: 9001, data: null, message: '参数不完整' }
    }
    if (content.trim().length > MAX_CONTENT_LEN) {
      return { code: 9001, data: null, message: `评论不能超过${MAX_CONTENT_LEN}字` }
    }

    // 校验目标心情是否公开
    const moodRes = await db.collection('moods')
      .doc(moodId)
      .field({ _id: true, uid: true, visibility: true })
      .get()
    if (!moodRes.data) {
      return { code: 9001, data: null, message: '心情记录不存在' }
    }

    const mood = moodRes.data
    // 心情作者自己也可以回复，且允许查看非公开但自己的记录评论
    if (mood.visibility !== 'public' && mood.uid !== OPENID) {
      return { code: 9001, data: null, message: '该心情不是公开状态' }
    }

    // 内容安全检查
    const modResult = await cloud.callFunction({
      name: 'moderateContent',
      data: { content: content.trim() }
    })
    if (modResult.result && modResult.result.code !== 0) {
      return { code: 1001, data: null, message: '内容包含违规信息，请修改' }
    }

    const commentData = {
      mood_id: moodId,
      mood_uid: mood.uid,
      from_uid: OPENID,
      parent_id: parentId || null,
      content: content.trim(),
      created_at: db.serverDate()
    }

    const addRes = await db.collection('mood_comments').add({ data: commentData })

    // 自动成为笔友：当心情作者回复了他人的评论时
    const isAuthorReply = OPENID === mood.uid && parentId
    if (isAuthorReply) {
      try {
        // 获取被回复评论的发送者
        const parentRes = await db.collection('mood_comments')
          .doc(parentId)
          .field({ from_uid: true })
          .get()

        if (parentRes.data && parentRes.data.from_uid !== OPENID) {
          const penfriendUid = parentRes.data.from_uid
          // upsert matches 双向记录（uid_a < uid_b 排序保持唯一性）
          const [uidA, uidB] = OPENID < penfriendUid
            ? [OPENID, penfriendUid]
            : [penfriendUid, OPENID]

          const existingMatch = await db.collection('matches')
            .where({ uid_a: uidA, uid_b: uidB })
            .get()

          if (existingMatch.data && existingMatch.data.length > 0) {
            if (existingMatch.data[0].status === 'pending') {
              await db.collection('matches').doc(existingMatch.data[0]._id).update({
                data: { status: 'active', updated_at: db.serverDate() }
              })
            }
          } else {
            await db.collection('matches').add({
              data: {
                uid_a: uidA,
                uid_b: uidB,
                score: 60,       // 因心情共鸣而结识，给予基础匹配分
                tags_common: [],
                status: 'active',
                source: 'mood_comment',
                updated_at: db.serverDate()
              }
            })
          }
        }
      } catch (e) {
        console.error('[commentOnMood] pen-pal creation error:', e)
      }
    }

    return {
      code: 0,
      data: { _id: addRes._id, isPenfriend: isAuthorReply },
      message: 'ok'
    }
  } catch (err) {
    console.error('[commentOnMood] error:', err)
    return { code: 9001, data: null, message: err.message }
  }
}
