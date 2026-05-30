// pages/letters/write/index.js — 写信页
const api = require('../../../utils/api')
const validator = require('../../../utils/validator')

Page({
  data: {
    title: '',
    content: '',
    wordCount: 0,
    canSend: false,
    isFirst: true,
    targetUid: null,
    targetNickname: '',
    sending: false,
    required: 150
  },

  onLoad(options) {
    const { targetUid, targetNickname, isFirst } = options
    const isFirstBool = isFirst !== 'false'
    this.setData({
      targetUid: targetUid || null,
      targetNickname: targetNickname || '对方',
      isFirst: isFirstBool,
      required: isFirstBool ? 150 : 100
    })
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  onContentInput(e) {
    const content = e.detail.value
    const result = validator.validateLetter(content, this.data.isFirst)
    this.setData({
      content,
      wordCount: result.count,
      canSend: result.valid
    })
  },

  async onSend() {
    if (!this.data.canSend || this.data.sending) return
    if (!this.data.targetUid) {
      wx.showToast({ title: '请先选择收信人', icon: 'none' })
      return
    }

    this.setData({ sending: true })
    try {
      // 内容安全检查
      const moderateRes = await api.moderateContent(this.data.content)
      if (moderateRes.code !== 0) {
        wx.showToast({ title: '内容包含违规信息，请修改后重新发送', icon: 'none', duration: 3000 })
        return
      }

      const res = await api.sendLetter({
        title: this.data.title,
        content: this.data.content,
        targetUid: this.data.targetUid,
        isFirst: this.data.isFirst
      })

      if (res.code === 0) {
        wx.showToast({ title: '信件已寄出', icon: 'success' })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({ title: res.message || '发送失败', icon: 'none' })
      }
    } catch (err) {
      console.error('[write] onSend error:', err)
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
    } finally {
      this.setData({ sending: false })
    }
  }
})
