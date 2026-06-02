// pages/journey/index/index.js — 情绪旅程
const api = require('../../../utils/api')
const dateUtil = require('../../../utils/date')

const EMOTION_LABELS = { happy: '开心', calm: '平静', sad: '难过', anxious: '焦虑', mixed: '复杂' }
const VISIBILITY_LABELS = { private: '🔒 仅自己', friends: '✉️ 笔友', public: '🌍 公开' }

Page({
  data: {
    activeTab: 'mine',       // 'mine' | 'feed'
    moods: [],
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    trend: [],
    loading: false,
    selectedDay: null,
    selectedMood: null,
    today: '',

    // 编辑模式
    editingToday: false,

    // 评论面板
    commentsOpen: false,
    commentMoodId: null,
    commentMoodIsMine: false,
    comments: [],
    commentInput: '',
    replyToCommentId: null,
    replyToNickname: '',
    sendingComment: false,

    // 广场
    feedList: [],
    feedLoading: false,
    feedPage: 0,
    feedHasMore: true
  },

  onLoad() {
    const today = dateUtil.formatDate(new Date(), 'YYYY-MM-DD')
    this.setData({ today })
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
        const enriched = (res.data || []).map(m => ({
          ...m,
          emotionLabel: EMOTION_LABELS[m.emotion] || m.emotion,
          visibilityLabel: VISIBILITY_LABELS[m.visibility] || VISIBILITY_LABELS.private
        }))
        this.setData({ moods: enriched })

        // 如果当前选中了某天，刷新选中的 mood 对象
        if (this.data.selectedDay) {
          const refreshed = enriched.find(m => m.date === this.data.selectedDay)
          this.setData({ selectedMood: refreshed || null })
        }
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

  // Tab 切换
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    if (tab === 'feed' && this.data.feedList.length === 0) {
      this._loadFeed(true)
    }
  },

  // 广场加载
  async _loadFeed(reset) {
    if (this.data.feedLoading) return
    this.setData({ feedLoading: true })
    const page = reset ? 0 : this.data.feedPage
    try {
      const res = await api.getPublicMoods(page)
      if (res.code === 0) {
        const list = res.data || []
        const enriched = list.map(m => ({
          ...m,
          emotionLabel: EMOTION_LABELS[m.emotion] || m.emotion
        }))
        this.setData({
          feedList: reset ? enriched : [...this.data.feedList, ...enriched],
          feedPage: page + 1,
          feedHasMore: list.length === 10
        })
      }
    } catch (err) {
      console.error('[journey] _loadFeed error:', err)
    } finally {
      this.setData({ feedLoading: false })
    }
  },

  onFeedReachBottom() {
    if (this.data.feedHasMore) {
      this._loadFeed(false)
    }
  },

  // 月份切换
  prevMonth() {
    let { currentYear, currentMonth } = this.data
    currentMonth -= 1
    if (currentMonth < 1) { currentMonth = 12; currentYear -= 1 }
    this.setData({ currentYear, currentMonth, moods: [], selectedDay: null, selectedMood: null })
    this._loadMoods()
  },

  nextMonth() {
    let { currentYear, currentMonth } = this.data
    const now = new Date()
    if (currentYear === now.getFullYear() && currentMonth >= now.getMonth() + 1) return
    currentMonth += 1
    if (currentMonth > 12) { currentMonth = 1; currentYear += 1 }
    this.setData({ currentYear, currentMonth, moods: [], selectedDay: null, selectedMood: null })
    this._loadMoods()
  },

  // 点击日历某天
  onDayTap(e) {
    const { date, mood } = e.detail
    const enrichedMood = mood
      ? { ...mood, emotionLabel: EMOTION_LABELS[mood.emotion] || mood.emotion, visibilityLabel: VISIBILITY_LABELS[mood.visibility] || VISIBILITY_LABELS.private }
      : null
    this.setData({ selectedDay: date, selectedMood: enrichedMood, editingToday: false })
  },

  // 修改今日心情（从详情面板触发）
  onEditTodayMood() {
    this.setData({ editingToday: true })
  },

  onCancelEditMood() {
    this.setData({ editingToday: false })
  },

  // 情绪记录/更新完成
  onMoodSaved(e) {
    this.setData({ editingToday: false })
    this._loadMoods()
    this._loadTrend()
  },

  // 打开评论面板
  async openComments(e) {
    const moodId = e.currentTarget.dataset.moodId || (this.data.selectedMood && this.data.selectedMood._id)
    if (!moodId) return
    this.setData({ commentsOpen: true, commentMoodId: moodId, comments: [], replyToCommentId: null, replyToNickname: '' })
    await this._loadComments(moodId)
  },

  closeComments() {
    this.setData({ commentsOpen: false, commentMoodId: null, commentInput: '', replyToCommentId: null, replyToNickname: '' })
  },

  async _loadComments(moodId) {
    try {
      const res = await api.getMoodComments(moodId, 0)
      if (res.code === 0) {
        this.setData({
          comments: res.data.comments || [],
          commentMoodIsMine: res.data.isMoodMine || false
        })
      }
    } catch (err) {
      console.error('[journey] _loadComments error:', err)
    }
  },

  onCommentInput(e) {
    this.setData({ commentInput: e.detail.value })
  },

  // 点击"回复"某条评论
  onReplyTap(e) {
    const { commentId, nickname } = e.currentTarget.dataset
    this.setData({ replyToCommentId: commentId, replyToNickname: nickname })
  },

  cancelReply() {
    this.setData({ replyToCommentId: null, replyToNickname: '' })
  },

  async sendComment() {
    const { commentInput, commentMoodId, replyToCommentId, sendingComment } = this.data
    if (!commentInput.trim() || sendingComment) return

    this.setData({ sendingComment: true })
    try {
      const res = await api.commentOnMood({
        moodId: commentMoodId,
        content: commentInput.trim(),
        parentId: replyToCommentId || null
      })

      if (res.code === 0) {
        this.setData({ commentInput: '', replyToCommentId: null, replyToNickname: '' })
        await this._loadComments(commentMoodId)

        if (res.data && res.data.isPenfriend) {
          wx.showModal({
            title: '已成为笔友',
            content: '你们因心情共鸣而相遇，现在可以互相写信了！',
            showCancel: false,
            confirmText: '太好了'
          })
        }

        // 刷新广场评论数
        if (this.data.activeTab === 'feed') {
          this._loadFeed(true)
        }
      } else {
        wx.showToast({ title: res.message || '发送失败', icon: 'none' })
      }
    } catch (err) {
      console.error('[journey] sendComment error:', err)
      wx.showToast({ title: '网络异常', icon: 'none' })
    } finally {
      this.setData({ sendingComment: false })
    }
  }
})
