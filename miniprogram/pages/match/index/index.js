// pages/match/index/index.js — 灵魂匹配
const api = require('../../../utils/api')

Page({
  data: {
    recommendations: [],
    loading: false,
    allUsed: false
  },

  onLoad() {
    this._loadRecommendations()
  },

  onShow() {
    // 从对方主页返回时刷新（可能发生了跳过操作）
    this._loadRecommendations()
  },

  async _loadRecommendations() {
    this.setData({ loading: true })
    try {
      const res = await api.getDailyRecommend()
      if (res.code === 0) {
        const recs = res.data || []
        this.setData({
          recommendations: recs,
          allUsed: recs.length === 0
        })
      } else if (res.code === 1004) {
        this.setData({ allUsed: true, recommendations: [] })
      } else {
        wx.showToast({ title: res.message || '加载失败', icon: 'none' })
      }
    } catch (err) {
      console.error('[match] _loadRecommendations error:', err)
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async onSkip(e) {
    const { targetUid } = e.currentTarget.dataset
    try {
      const res = await api.skipUser(targetUid)
      if (res.code === 0) {
        // 从列表移除
        const recs = this.data.recommendations.filter(r => r.profile._id !== targetUid)
        this.setData({
          recommendations: recs,
          allUsed: recs.length === 0
        })
        wx.showToast({ title: '已跳过', icon: 'none' })
      }
    } catch (err) {
      console.error('[match] onSkip error:', err)
    }
  },

  goToProfile(e) {
    const targetUid = e.detail ? e.detail.targetUid : e.currentTarget.dataset.targetUid
    if (!targetUid) return
    wx.navigateTo({ url: `/pages/match/profile/index?targetUid=${targetUid}` })
  },

  goToWrite(e) {
    const targetUid = e.detail ? e.detail.targetUid : e.currentTarget.dataset.targetUid
    const targetNickname = e.detail ? e.detail.targetNickname : e.currentTarget.dataset.targetNickname
    if (!targetUid) return
    wx.navigateTo({ url: `/pages/letters/write/index?targetUid=${targetUid}&targetNickname=${encodeURIComponent(targetNickname || '')}&isFirst=true` })
  }
})
