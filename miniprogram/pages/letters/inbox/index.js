// pages/letters/inbox/index.js — 收件箱
const api = require('../../../utils/api')

Page({
  data: {
    letters: [],
    loading: false,
    page: 0,
    hasMore: true
  },

  onLoad() {
    this._loadInbox()
  },

  onShow() {
    // 每次切换到信箱时刷新第一页
    this.setData({ page: 0, hasMore: true, letters: [] })
    this._loadInbox()
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return
    this._loadInbox()
  },

  onPullDownRefresh() {
    this.setData({ page: 0, hasMore: true, letters: [] })
    this._loadInbox().then(() => wx.stopPullDownRefresh())
  },

  async _loadInbox() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const res = await api.getInbox(this.data.page)
      if (res.code === 0) {
        const newLetters = res.data || []
        this.setData({
          letters: this.data.page === 0 ? newLetters : this.data.letters.concat(newLetters),
          page: this.data.page + 1,
          hasMore: newLetters.length >= 10
        })
      } else {
        wx.showToast({ title: res.message || '加载失败', icon: 'none' })
      }
    } catch (err) {
      console.error('[inbox] _loadInbox error:', err)
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  goToDetail(e) {
    const { letterId } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/letters/detail/index?letterId=${letterId}` })
  },

  goToSent() {
    wx.navigateTo({ url: '/pages/letters/sent/index' })
  },

  goToMatch() {
    wx.navigateTo({ url: '/pages/match/index/index' })
  },

  goToWrite() {
    wx.navigateTo({ url: '/pages/letters/write/index' })
  }
})
