// components/letter-paper/index.js — 信纸容器组件
const dateUtil = require('../../utils/date')

Component({
  properties: {
    letter: {
      type: Object,
      value: null
    }
  },

  data: {
    lineCount: 20,
    dateDisplay: ''
  },

  observers: {
    'letter': function (letter) {
      if (letter && letter.created_at) {
        this.setData({ dateDisplay: dateUtil.formatDate(letter.created_at, 'YYYY年MM月DD日') })
      }
    }
  },

  methods: {}
})
