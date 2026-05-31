// pages/index/index.js — 首页
const api = require('../../utils/api')
const dateUtil = require('../../utils/date')

Page({
  data: {
    userInfo: null,
    moodDone: false,
    recentLetters: [],
    memoryToday: null,
    dailyMatches: [],
    loading: true,
    today: ''
  },

  onLoad() {
    const today = dateUtil.formatDate(new Date(), 'YYYY-MM-DD')
    this.setData({ today })
    this._loadPageData()
  },

  onShow() {
    this._loadInbox()
    this._checkTodayMood()
  },

  async _loadPageData() {
    try {
      // 先确认用户身份，失败立即跳引导页
      const userRes = await api.getUser()
      if (userRes.code !== 0) {
        wx.reLaunch({ url: '/pages/onboarding/index/index' })
        return
      }
      this.setData({ userInfo: userRes.data })
      getApp().globalData.userInfo = userRes.data

      // 再并行加载其余数据，单项失败不阻塞页面
      const [memoryRes, recommendRes] = await Promise.all([
        api.getMemoryToday().catch(() => ({ code: -1 })),
        api.getDailyRecommend().catch(() => ({ code: -1 }))
      ])

      if (memoryRes.code === 0 && memoryRes.data) {
        const EMOTION_LABEL = { happy: '开心', calm: '平静', sad: '难过', anxious: '焦虑', mixed: '复杂' }
        const memory = memoryRes.data
        if (memory.type === 'mood') {
          memory.emotionLabel = EMOTION_LABEL[memory.emotion] || memory.emotion
          memory.displayDate = memory.date
          memory.displayText = memory.diary || '（未填写日记）'
        } else {
          memory.displayDate = dateUtil.formatDate(new Date(memory.created_at), 'YYYY-MM-DD')
          memory.displayText = memory.content || ''
        }
        this.setData({ memoryToday: memory })
      }
      if (recommendRes.code === 0) {
        this.setData({ dailyMatches: (recommendRes.data || []).slice(0, 2) })
      }
    } catch (err) {
      console.error('[index] _loadPageData error:', err)
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async _loadInbox() {
    try {
      const res = await api.getInbox(0)
      if (res.code === 0) {
        this.setData({ recentLetters: (res.data || []).slice(0, 2) })
      }
    } catch (err) {
      console.error('[index] _loadInbox error:', err)
    }
  },

  async _checkTodayMood() {
    const today = this.data.today
    if (!today || this.data.moodDone) return
    try {
      const now = new Date()
      const res = await api.getMoods(now.getFullYear(), now.getMonth() + 1)
      if (res.code === 0 && res.data) {
        const hasMood = res.data.some(m => m.date === today)
        if (hasMood) this.setData({ moodDone: true })
      }
    } catch (e) {
      console.error('[index] _checkTodayMood error:', e)
    }
  },

  // 情绪记录完成回调
  onMoodSaved(e) {
    this.setData({ moodDone: true })
    wx.showToast({ title: '情绪已记录', icon: 'success' })
  },

  // 跳转收件箱
  goToInbox() {
    wx.switchTab({ url: '/pages/letters/inbox/index' })
  },

  // 跳转灵魂匹配
  goToMatch() {
    wx.navigateTo({ url: '/pages/match/index/index' })
  },

  // 跳转对方主页
  goToProfile(e) {
    const { targetUid } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/match/profile/index?targetUid=${targetUid}` })
  },

  // 跳转信件详情
  goToDetail(e) {
    const { letterId } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/letters/detail/index?letterId=${letterId}` })
  },

  // 去年的今天跳转
  goToMemory() {
    const { memoryToday } = this.data
    if (!memoryToday) return
    if (memoryToday.type === 'letter') {
      wx.navigateTo({ url: `/pages/letters/detail/index?letterId=${memoryToday._id}` })
    } else {
      wx.switchTab({ url: '/pages/journey/index/index' })
    }
  }
})
