// pages/letters/sent/index.js — 已发出
const api = require('../../../utils/api')

Page({
  data: {
    letters: [],
    loading: false,
    page: 0,
    hasMore: true
  },

  onLoad() {
    this._loadSent()
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return
    this._loadSent()
  },

  onPullDownRefresh() {
    this.setData({ page: 0, hasMore: true, letters: [] })
    this._loadSent().then(() => wx.stopPullDownRefresh())
  },

  async _loadSent() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const res = await api.getSent(this.data.page)
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
      console.error('[sent] _loadSent error:', err)
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  goToDetail(e) {
    const { letterId } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/letters/detail/index?letterId=${letterId}` })
  },

  goToInbox() {
    wx.navigateBack()
  },

  goToWrite() {
    wx.navigateTo({ url: '/pages/letters/write/index' })
  }
})
