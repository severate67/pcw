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
    // 优先使用从推荐列表传递过来的缓存数据，避免云函数调用
    const app = getApp()
    const cached = app.globalData.viewingProfile
    if (cached && cached.uid === targetUid) {
      app.globalData.viewingProfile = null
      this._applyProfile(cached.data)
      return
    }

    this.setData({ loading: true })
    try {
      const res = await api.getPublicProfile(targetUid)
      if (res.code === 0) {
        this._applyProfile(res.data)
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

  _applyProfile(profileData) {
    const activeTimeLabels = { morning: '清晨', afternoon: '午后', night: '夜深' }
    const letterFreqLabels = { weekly: '每周一封', biweekly: '两周一封', free: '随缘' }
    const isActiveRecently = profileData.last_active
      ? (Date.now() - new Date(profileData.last_active).getTime()) <= 7 * 24 * 60 * 60 * 1000
      : false
    this.setData({
      loading: false,
      profile: {
        ...profileData,
        isActiveRecently,
        activeTimeLabel: activeTimeLabels[profileData.active_time] || profileData.active_time,
        letterFreqLabel: letterFreqLabels[profileData.letter_freq] || profileData.letter_freq
      }
    })
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
