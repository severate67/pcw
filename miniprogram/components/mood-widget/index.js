// components/mood-widget/index.js — 情绪记录组件
const api = require('../../utils/api')
const validator = require('../../utils/validator')
const dateUtil = require('../../utils/date')

const EMOTIONS = [
  { key: 'happy', label: '开心', color: '#C4622D' },
  { key: 'calm', label: '平静', color: '#2E6E65' },
  { key: 'sad', label: '难过', color: '#5A3D7A' },
  { key: 'anxious', label: '焦虑', color: '#8C5E00' },
  { key: 'mixed', label: '复杂', color: '#7A5C3E' }
]

const VISIBILITY_OPTIONS = [
  { key: 'private', label: '仅自己', icon: '🔒' },
  { key: 'friends', label: '笔友', icon: '✉️' },
  { key: 'public', label: '公开', icon: '🌍' }
]

Component({
  properties: {
    date: { type: String, value: '' },
    // 传入已有记录时进入编辑模式
    existingMood: { type: Object, value: null }
  },

  data: {
    emotions: EMOTIONS,
    visibilityOptions: VISIBILITY_OPTIONS,
    selectedEmotion: '',
    intensity: 3,
    diary: '',
    diaryCount: 0,
    diaryValid: true,
    visibility: 'private',
    saving: false,
    today: '',
    isEditMode: false
  },

  observers: {
    existingMood(mood) {
      if (mood && mood.emotion) {
        this.setData({
          isEditMode: true,
          selectedEmotion: mood.emotion,
          intensity: mood.intensity || 3,
          diary: mood.diary || '',
          diaryCount: validator.countWords(mood.diary || ''),
          diaryValid: true,
          visibility: mood.visibility || 'private'
        })
      }
    }
  },

  lifetimes: {
    attached() {
      const today = this.properties.date || dateUtil.formatDate(new Date(), 'YYYY-MM-DD')
      this.setData({ today })
    }
  },

  methods: {
    selectEmotion(e) {
      const { key } = e.currentTarget.dataset
      this.setData({ selectedEmotion: key })
    },

    onIntensityTap(e) {
      const { level } = e.currentTarget.dataset
      this.setData({ intensity: level })
    },

    selectVisibility(e) {
      const { key } = e.currentTarget.dataset
      this.setData({ visibility: key })
    },

    onDiaryInput(e) {
      const diary = e.detail.value
      const result = validator.validateMoodDiary(diary)
      this.setData({
        diary,
        diaryCount: result.count,
        diaryValid: result.valid
      })
    },

    async onSave() {
      if (!this.data.selectedEmotion) {
        wx.showToast({ title: '请选择一个情绪', icon: 'none' })
        return
      }
      if (!this.data.diaryValid) {
        wx.showToast({ title: '日记若填写需至少30字', icon: 'none' })
        return
      }
      if (this.data.saving) return

      this.setData({ saving: true })

      try {
        const res = await api.saveMood({
          emotion: this.data.selectedEmotion,
          intensity: this.data.intensity,
          diary: this.data.diary,
          date: this.data.today,
          visibility: this.data.visibility
        })

        if (res.code === 0) {
          this.triggerEvent('save', { mood: res.data })
          wx.showToast({ title: this.data.isEditMode ? '已更新' : '情绪已记录', icon: 'success' })
        } else {
          wx.showToast({ title: res.message || '保存失败', icon: 'none' })
        }
      } catch (err) {
        console.error('[mood-widget] onSave error:', err)
        wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
      } finally {
        this.setData({ saving: false })
      }
    }
  }
})
