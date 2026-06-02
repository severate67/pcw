// pages/index/index.js — 首页
const api = require('../../utils/api')
const dateUtil = require('../../utils/date')

Page({
  data: {
    userInfo: null,
    moodDone: false,
    todayMood: null,       // 今日已有的心情记录（用于编辑模式）
    editingMood: false,    // 是否展开编辑模式
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
      const userRes = await api.getUser()
      if (userRes.code !== 0) {
        wx.reLaunch({ url: '/pages/onboarding/index/index' })
        return
      }
      this.setData({ userInfo: userRes.data })
      getApp().globalData.userInfo = userRes.data

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
    if (!today) return
    try {
      const now = new Date()
      const res = await api.getMoods(now.getFullYear(), now.getMonth() + 1)
      if (res.code === 0 && res.data) {
        const todayMood = res.data.find(m => m.date === today)
        if (todayMood) {
          this.setData({ moodDone: true, todayMood })
        } else {
          this.setData({ moodDone: false, todayMood: null })
        }
      }
    } catch (e) {
      console.error('[index] _checkTodayMood error:', e)
    }
  },

  // 点击"修改今日心情"
  onEditMood() {
    this.setData({ editingMood: true })
  },

  // 取消编辑
  onCancelEdit() {
    this.setData({ editingMood: false })
  },

  // 情绪记录完成/更新回调
  onMoodSaved(e) {
    const EMOTION_LABEL = { happy: '开心', calm: '平静', sad: '难过', anxious: '焦虑', mixed: '复杂' }
    const mood = e.detail.mood
    if (mood) {
      mood.emotionLabel = EMOTION_LABEL[mood.emotion] || mood.emotion
    }
    this.setData({ moodDone: true, todayMood: mood || null, editingMood: false })
  },

  goToInbox() {
    wx.switchTab({ url: '/pages/letters/inbox/index' })
  },

  goToMatch() {
    wx.navigateTo({ url: '/pages/match/index/index' })
  },

  goToProfile(e) {
    const { targetUid } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/match/profile/index?targetUid=${targetUid}` })
  },

  goToDetail(e) {
    const { letterId } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/letters/detail/index?letterId=${letterId}` })
  },

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
