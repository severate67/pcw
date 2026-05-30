// pages/onboarding/index/index.js — 注册引导（精神身份证）
const api = require('../../../utils/api')
const validator = require('../../../utils/validator')

const PRESET_TAGS = [
  '文学', '诗歌', '哲学', '历史', '音乐', '电影', '摄影', '绘画',
  '旅行', '美食', '自然', '心理', '科幻', '悬疑', '动漫', '游戏',
  '运动', '瑜伽', '冥想', '园艺', '手工', '烹饪', '茶道', '书法',
  '天文', '生物', '经济', '社会学', '建筑', '时尚'
]

Page({
  data: {
    step: 1,
    totalSteps: 3,
    // Step 1: 基本信息
    nickname: '',
    intro: '',
    introCount: 0,
    introValid: false,
    // Step 2: 标签
    presetTags: PRESET_TAGS,
    tags: [],
    // Step 3: 偏好
    activeTime: '',
    letterFreq: '',
    // 提交状态
    submitting: false
  },

  onLoad() {},

  // ─── Step 1 ───────────────────────────────────────────────

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value })
  },

  onIntroInput(e) {
    const intro = e.detail.value
    const result = validator.validateIntro(intro)
    this.setData({
      intro,
      introCount: result.count,
      introValid: result.valid
    })
  },

  goStep2() {
    if (!this.data.nickname.trim()) {
      wx.showToast({ title: '请填写昵称', icon: 'none' })
      return
    }
    if (!this.data.introValid) {
      wx.showToast({ title: '一句话介绍需在20-60字之间', icon: 'none' })
      return
    }
    this.setData({ step: 2 })
  },

  // ─── Step 2 ───────────────────────────────────────────────

  toggleTag(e) {
    const tag = e.currentTarget.dataset.tag
    const { tags } = this.data
    const idx = tags.indexOf(tag)
    if (idx >= 0) {
      tags.splice(idx, 1)
    } else {
      if (tags.length >= 5) {
        wx.showToast({ title: '最多选5个标签', icon: 'none' })
        return
      }
      tags.push(tag)
    }
    this.setData({ tags: [...tags] })
  },

  goStep3() {
    if (this.data.tags.length < 3) {
      wx.showToast({ title: '至少选择3个标签', icon: 'none' })
      return
    }
    this.setData({ step: 3 })
  },

  goBackStep1() {
    this.setData({ step: 1 })
  },

  // ─── Step 3 ───────────────────────────────────────────────

  onActiveTimeChange(e) {
    this.setData({ activeTime: e.currentTarget.dataset.value })
  },

  onLetterFreqChange(e) {
    this.setData({ letterFreq: e.currentTarget.dataset.value })
  },

  goBackStep2() {
    this.setData({ step: 2 })
  },

  async onSubmit() {
    if (!this.data.activeTime) {
      wx.showToast({ title: '请选择常在时段', icon: 'none' })
      return
    }
    if (!this.data.letterFreq) {
      wx.showToast({ title: '请选择书信频率', icon: 'none' })
      return
    }
    if (this.data.submitting) return

    this.setData({ submitting: true })
    try {
      // 内容安全检查（用于 intro）
      const moderateRes = await api.moderateContent(this.data.intro)
      if (moderateRes.code !== 0) {
        wx.showToast({ title: '介绍内容包含违规信息，请修改', icon: 'none', duration: 3000 })
        this.setData({ submitting: false, step: 1 })
        return
      }

      const res = await api.createUser({
        nickname: this.data.nickname,
        intro: this.data.intro,
        tags: this.data.tags,
        activeTime: this.data.activeTime,
        letterFreq: this.data.letterFreq
      })

      if (res.code === 0) {
        getApp().globalData.userInfo = res.data
        wx.showToast({ title: '精神身份证已建立', icon: 'success' })
        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' })
        }, 1500)
      } else {
        wx.showToast({ title: res.message || '注册失败', icon: 'none' })
      }
    } catch (err) {
      console.error('[onboarding] onSubmit error:', err)
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
