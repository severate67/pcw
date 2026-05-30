// pages/profile/edit/index.js — 编辑资料
const api = require('../../../utils/api')
const validator = require('../../../utils/validator')

Page({
  data: {
    nickname: '',
    intro: '',
    introCount: 0,
    introValid: false,
    tags: [],
    activeTime: '',
    letterFreq: '',
    saving: false,
    originalData: null
  },

  onLoad() {
    const userInfo = getApp().globalData.userInfo
    if (userInfo) {
      this._fillForm(userInfo)
    } else {
      this._loadUser()
    }
  },

  async _loadUser() {
    try {
      const res = await api.getUser()
      if (res.code === 0) {
        this._fillForm(res.data)
      }
    } catch (err) {
      console.error('[profile/edit] _loadUser error:', err)
    }
  },

  _fillForm(userInfo) {
    const introResult = validator.validateIntro(userInfo.intro || '')
    this.setData({
      nickname: userInfo.nickname || '',
      intro: userInfo.intro || '',
      introCount: introResult.count,
      introValid: introResult.valid,
      tags: userInfo.tags || [],
      activeTime: userInfo.active_time || '',
      letterFreq: userInfo.letter_freq || '',
      originalData: userInfo
    })
  },

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

  onTagsChange(e) {
    this.setData({ tags: e.detail.value })
  },

  onActiveTimeChange(e) {
    this.setData({ activeTime: e.currentTarget.dataset.value })
  },

  onLetterFreqChange(e) {
    this.setData({ letterFreq: e.currentTarget.dataset.value })
  },

  async onSave() {
    if (this.data.saving) return
    if (!this.data.nickname.trim()) {
      wx.showToast({ title: '请填写昵称', icon: 'none' })
      return
    }
    if (!this.data.introValid) {
      wx.showToast({ title: '一句话介绍需在20-60字之间', icon: 'none' })
      return
    }
    if (this.data.tags.length < 3) {
      wx.showToast({ title: '至少选择3个标签', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    try {
      const res = await api.updateUser({
        nickname: this.data.nickname,
        intro: this.data.intro,
        tags: this.data.tags,
        activeTime: this.data.activeTime,
        letterFreq: this.data.letterFreq
      })

      if (res.code === 0) {
        getApp().globalData.userInfo = res.data
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1000)
      } else {
        wx.showToast({ title: res.message || '保存失败', icon: 'none' })
      }
    } catch (err) {
      console.error('[profile/edit] onSave error:', err)
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  }
})
