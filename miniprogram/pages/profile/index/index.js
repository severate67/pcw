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
    // 编辑资料返回后刷新
    this._loadProfile()
  },

  async _loadProfile() {
    this.setData({ loading: true })
    try {
      const res = await api.getUser()
      if (res.code === 0) {
        const user = res.data
        this.setData({
          userInfo: user,
          stats: {
            lettersSent: user.lettersSent || 0,
            lettersReceived: user.lettersReceived || 0,
            moodDays: user.moodDays || 0
          }
        })
        getApp().globalData.userInfo = user
      } else {
        // 未注册，跳转引导
        wx.redirectTo({ url: '/pages/onboarding/index/index' })
      }
    } catch (err) {
      console.error('[profile] _loadProfile error:', err)
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
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
  }
})
