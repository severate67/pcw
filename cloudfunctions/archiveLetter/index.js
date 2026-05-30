const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    const { id } = event
    if (!id) {
      return { code: 9001, data: null, message: '信件ID不能为空' }
    }

    const letterRes = await db.collection('letters').doc(id).get()
    const letter = letterRes.data

    if (!letter) {
      return { code: 9001, data: null, message: '信件不存在' }
    }

    if (letter.from_uid !== OPENID) {
      return { code: 9001, data: null, message: '只有发件人可以归档信件' }
    }

    if (letter.status === 'archived') {
      return { code: 0, data: { _id: id }, message: 'ok' }
    }

    await db.collection('letters').doc(id).update({
      data: { status: 'archived' }
    })

    return { code: 0, data: { _id: id }, message: 'ok' }
  } catch (err) {
    console.error('[archiveLetter] error:', err)
    return { code: 9001, data: null, message: err.message }
  }
}
