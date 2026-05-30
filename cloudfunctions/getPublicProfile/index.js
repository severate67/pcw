// cloudfunctions/getPublicProfile/index.js — 获取他人公开资料
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

    // 只返回安全的公开字段，不返回 openid、手机号等隐私信息
    const userRes = await db.collection('users')
      .doc(targetUid)
      .field({
        _id: true,
        nickname: true,
        intro: true,
        tags: true,
        active_time: true,
        letter_freq: true,
        last_active: true,
        created_at: true
      })
      .get()

    if (!userRes.data) {
      return { code: 9001, data: null, message: '用户不存在' }
    }

    const profile = userRes.data

    // 判断是否近期活跃（7天内）
    const isActiveRecently = profile.last_active
      ? (Date.now() - new Date(profile.last_active).getTime()) <= 7 * 24 * 60 * 60 * 1000
      : false

    // 获取最近书写摘要（最多50字）
    let recentExcerpt = ''
    try {
      const recentLetterRes = await db.collection('letters')
        .where({ from_uid: targetUid })
        .orderBy('created_at', 'desc')
        .limit(1)
        .field({ content: true })
        .get()

      if (recentLetterRes.data && recentLetterRes.data.length > 0) {
        const content = recentLetterRes.data[0].content || ''
        // 取前50个字符作为摘要
        recentExcerpt = content.slice(0, 50) + (content.length > 50 ? '...' : '')
      }
    } catch (e) {}

    // 活跃时段和书信频率的可读标签
    const activeTimeLabels = { morning: '清晨', afternoon: '午后', night: '夜深' }
    const letterFreqLabels = { weekly: '每周一封', biweekly: '两周一封', free: '随缘' }

    return {
      code: 0,
      data: {
        ...profile,
        isActiveRecently,
        recentExcerpt,
        activeTimeLabel: activeTimeLabels[profile.active_time] || profile.active_time,
        letterFreqLabel: letterFreqLabels[profile.letter_freq] || profile.letter_freq
      },
      message: 'ok'
    }
  } catch (err) {
    console.error('[getPublicProfile] error:', err)
    return { code: 9001, data: null, message: err.message }
  }
}
