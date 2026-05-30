// pages/match/profile/index.js — 对方主页
const api = require('../../../utils/api')

Page({
  data: {
    profile: null,
    loading: true,
    targetUid: null
  },

  onLoad(options) {
    const { targetUid } = options
    if (!targetUid) {
      wx.showToast({ title: '用户不存在', icon: 'none' })
      wx.navigateBack()
      return
    }
    this.setData({ targetUid })
    this._loadProfile(targetUid)
  },

  async _loadProfile(targetUid) {
    this.setData({ loading: true })
    try {
      const res = await api.getPublicProfile(targetUid)
      if (res.code === 0) {
        this.setData({ profile: res.data })
      } else {
        wx.showToast({ title: res.message || '用户不存在', icon: 'none' })
        wx.navigateBack()
      }
    } catch (err) {
      console.error('[match/profile] _loadProfile error:', err)
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  goToWrite() {
    const { targetUid, profile } = this.data
    if (!targetUid || !profile) return
    wx.navigateTo({
      url: `/pages/letters/write/index?targetUid=${targetUid}&targetNickname=${profile.nickname}&isFirst=true`
    })
  },

  async onSkip() {
    const { targetUid } = this.data
    try {
      await api.skipUser(targetUid)
      wx.showToast({ title: '已跳过', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (err) {
      console.error('[match/profile] onSkip error:', err)
    }
  }
})
