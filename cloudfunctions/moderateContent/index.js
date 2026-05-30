// cloudfunctions/moderateContent/index.js — 内容安全审核
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const { content } = event
    if (!content || !content.trim()) {
      return { code: 0, data: { pass: true }, message: 'ok' }
    }

    // 调用微信内容安全 API
    const result = await cloud.openapi.security.msgSecCheck({
      content: content.trim(),
      version: 2,
      scene: 2, // 1:资料，2:评论，3:论坛，4:社交日志
      openid: OPENID
    })

    // result.result.suggest: 'pass' | 'review' | 'risky'
    const suggest = result.result && result.result.suggest
    if (suggest === 'risky') {
      return { code: 1001, data: { suggest }, message: '内容包含违规信息' }
    }

    return { code: 0, data: { suggest: suggest || 'pass' }, message: 'ok' }
  } catch (err) {
    console.error('[moderateContent] error:', err)
    // 安全 API 异常时放行（避免影响正常用户），但记录日志
    return { code: 0, data: { suggest: 'pass', error: err.message }, message: 'ok' }
  }
}
