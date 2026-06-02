// pages/profile/index/index.js — 我的
const api = require('../../../utils/api')

Page({
  data: {
    userInfo: null,
    stats: {
      lettersSent: 0,
      lettersReceived: 0,
      moodDays: 0
    },
    loading: true
  },

  onLoad() {
    this._loadProfile()
  },

  onShow() {
    if (this.data.userInfo) {
      // 已有数据时后台静默刷新，不显示 loading
      this._loadProfile(true)
    } else {
      this._loadProfile(false)
    }
  },

  async _loadProfile(silent) {
    if (!silent) {
      this.setData({ loading: true })
    }
    try {
      const res = await api.getUser()
      if (res.code === 0) {
        const user = res.data
        this.setData({
          userInfo: user,
          loading: false,
          stats: {
            lettersSent: user.lettersSent || 0,
            lettersReceived: user.lettersReceived || 0,
            moodDays: user.moodDays || 0
          }
        })
        getApp().globalData.userInfo = user
      } else {
        wx.redirectTo({ url: '/pages/onboarding/index/index' })
      }
    } catch (err) {
      console.error('[profile] _loadProfile error:', err)
      if (!silent) {
        wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
      }
    } finally {
      if (!silent) {
        this.setData({ loading: false })
      }
    }
  },

  goToEdit() {
    wx.navigateTo({ url: '/pages/profile/edit/index' })
  },

  goToSent() {
    wx.navigateTo({ url: '/pages/letters/sent/index' })
  },

  goToInbox() {
    wx.switchTab({ url: '/pages/letters/inbox/index' })
  },

  goToJourney() {
    wx.switchTab({ url: '/pages/journey/index/index' })
  },

  goToPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/index' })
  }
})
