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

Component({
  properties: {
    date: {
      type: String,
      value: ''
    }
  },

  data: {
    emotions: EMOTIONS,
    selectedEmotion: '',
    intensity: 3,
    diary: '',
    diaryCount: 0,
    diaryValid: true,
    saving: false,
    today: ''
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

    onIntensityChange(e) {
      this.setData({ intensity: parseInt(e.detail.value) })
    },

    onIntensityTap(e) {
      const { level } = e.currentTarget.dataset
      this.setData({ intensity: level })
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

      // 内容安全检查（如果有日记内容）
      if (this.data.diary) {
        try {
          const modRes = await api.moderateContent(this.data.diary)
          if (modRes.code !== 0) {
            wx.showToast({ title: '内容包含违规信息，请修改', icon: 'none' })
            this.setData({ saving: false })
            return
          }
        } catch (e) {
          console.error('[mood-widget] moderate error:', e)
        }
      }

      try {
        const res = await api.saveMood({
          emotion: this.data.selectedEmotion,
          intensity: this.data.intensity,
          diary: this.data.diary,
          date: this.data.today
        })

        if (res.code === 0) {
          this.triggerEvent('save', { mood: res.data })
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
