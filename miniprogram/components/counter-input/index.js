// components/counter-input/index.js — 字数计数输入框组件
const validator = require('../../utils/validator')

Component({
  properties: {
    value: {
      type: String,
      value: ''
    },
    minCount: {
      type: Number,
      value: 0
    },
    placeholder: {
      type: String,
      value: '请输入内容...'
    }
  },

  data: {
    wordCount: 0,
    isValid: false
  },

  observers: {
    'value': function (val) {
      const count = validator.countWords(val || '')
      this.setData({
        wordCount: count,
        isValid: count >= this.properties.minCount
      })
    }
  },

  methods: {
    onInput(e) {
      const text = e.detail.value
      const count = validator.countWords(text)
      this.setData({
        wordCount: count,
        isValid: count >= this.properties.minCount
      })
      this.triggerEvent('change', { value: text, count, isValid: count >= this.properties.minCount })
    }
  }
})
