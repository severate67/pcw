// components/envelope-card/index.js — 信封卡片组件
const dateUtil = require('../../utils/date')

Component({
  properties: {
    letter: {
      type: Object,
      value: null
    },
    showUnread: {
      type: Boolean,
      value: true
    }
  },

  computed: {},

  data: {
    timeDisplay: ''
  },

  observers: {
    'letter': function (letter) {
      if (letter && letter.created_at) {
        this.setData({
          timeDisplay: dateUtil.relativeTime(letter.created_at)
        })
      }
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('tap', { letterId: this.properties.letter._id })
    }
  }
})
