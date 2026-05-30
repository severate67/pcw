// components/emotion-calendar/index.js — 情绪月历组件
const dateUtil = require('../../utils/date')

const EMOTION_COLOR = {
  happy: '#C4622D',
  calm: '#2E6E65',
  sad: '#5A3D7A',
  anxious: '#8C5E00',
  mixed: '#7A5C3E'
}

const EMOTION_LABEL = {
  happy: '开心',
  calm: '平静',
  sad: '难过',
  anxious: '焦虑',
  mixed: '复杂'
}

Component({
  properties: {
    moods: {
      type: Array,
      value: []
    },
    year: {
      type: Number,
      value: new Date().getFullYear()
    },
    month: {
      type: Number,
      value: new Date().getMonth() + 1
    }
  },

  data: {
    weeks: [],
    weekDays: ['日', '一', '二', '三', '四', '五', '六']
  },

  observers: {
    'moods, year, month': function () {
      this._buildCalendar()
    }
  },

  lifetimes: {
    attached() {
      this._buildCalendar()
    }
  },

  methods: {
    _buildCalendar() {
      const { year, month, moods } = this.properties

      // 建立 mood 查找表 date -> mood
      const moodMap = {}
      moods.forEach(m => {
        moodMap[m.date] = m
      })

      const firstDay = new Date(year, month - 1, 1)
      const daysInMonth = new Date(year, month, 0).getDate()
      const startWeekday = firstDay.getDay() // 0=周日

      const today = dateUtil.formatDate(new Date(), 'YYYY-MM-DD')
      const days = []

      // 填充前缀空格
      for (let i = 0; i < startWeekday; i++) {
        days.push({ empty: true })
      }

      // 填充日期
      for (let d = 1; d <= daysInMonth; d++) {
        const mm = String(month).padStart(2, '0')
        const dd = String(d).padStart(2, '0')
        const dateStr = `${year}-${mm}-${dd}`
        const mood = moodMap[dateStr] || null

        days.push({
          day: d,
          date: dateStr,
          isToday: dateStr === today,
          isFuture: dateStr > today,
          mood: mood ? {
            emotion: mood.emotion,
            intensity: mood.intensity,
            diary: mood.diary,
            emotionLabel: EMOTION_LABEL[mood.emotion] || mood.emotion
          } : null,
          color: mood ? EMOTION_COLOR[mood.emotion] : null,
          empty: false
        })
      }

      // 按7个一组分周
      const weeks = []
      for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7))
      }

      this.setData({ weeks })
    },

    onDayTap(e) {
      const { date, mood } = e.currentTarget.dataset
      if (!date) return
      this.triggerEvent('dayTap', { date, mood })
    }
  }
})
