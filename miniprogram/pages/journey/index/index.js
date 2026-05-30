// pages/journey/index/index.js — 情绪旅程
const api = require('../../../utils/api')

Page({
  data: {
    moods: [],
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    trend: [],
    loading: false,
    selectedDay: null,
    selectedMood: null
  },

  onLoad() {
    this._loadMoods()
    this._loadTrend()
  },

  onShow() {
    this._loadMoods()
  },

  async _loadMoods() {
    this.setData({ loading: true })
    try {
      const res = await api.getMoods(this.data.currentYear, this.data.currentMonth)
      if (res.code === 0) {
        this.setData({ moods: res.data || [] })
      }
    } catch (err) {
      console.error('[journey] _loadMoods error:', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  async _loadTrend() {
    try {
      const res = await api.getMoodTrend()
      if (res.code === 0) {
        this.setData({ trend: res.data || [] })
      }
    } catch (err) {
      console.error('[journey] _loadTrend error:', err)
    }
  },

  // 切换上一个月
  prevMonth() {
    let { currentYear, currentMonth } = this.data
    currentMonth -= 1
    if (currentMonth < 1) {
      currentMonth = 12
      currentYear -= 1
    }
    this.setData({ currentYear, currentMonth, moods: [] })
    this._loadMoods()
  },

  // 切换下一个月
  nextMonth() {
    let { currentYear, currentMonth } = this.data
    const now = new Date()
    // 不允许切换到未来月份
    if (currentYear === now.getFullYear() && currentMonth >= now.getMonth() + 1) return

    currentMonth += 1
    if (currentMonth > 12) {
      currentMonth = 1
      currentYear += 1
    }
    this.setData({ currentYear, currentMonth, moods: [] })
    this._loadMoods()
  },

  // 点击日历某天
  onDayTap(e) {
    const { date, mood } = e.detail
    this.setData({ selectedDay: date, selectedMood: mood || null })
  }
})
