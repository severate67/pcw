// components/tag-picker/index.js — 标签选择器组件
const PRESET_TAGS = [
  '文学', '诗歌', '哲学', '历史', '音乐', '电影', '摄影', '绘画',
  '旅行', '美食', '自然', '心理', '科幻', '悬疑', '动漫', '游戏',
  '运动', '瑜伽', '冥想', '园艺', '手工', '烹饪', '茶道', '书法',
  '天文', '生物', '经济', '社会学', '建筑', '时尚'
]

Component({
  properties: {
    selected: {
      type: Array,
      value: []
    },
    max: {
      type: Number,
      value: 5
    },
    min: {
      type: Number,
      value: 3
    }
  },

  data: {
    presetTags: PRESET_TAGS
  },

  methods: {
    toggleTag(e) {
      const { tag } = e.currentTarget.dataset
      const selected = [...this.properties.selected]
      const idx = selected.indexOf(tag)

      if (idx >= 0) {
        selected.splice(idx, 1)
      } else {
        if (selected.length >= this.properties.max) {
          wx.showToast({ title: `最多选${this.properties.max}个标签`, icon: 'none' })
          return
        }
        selected.push(tag)
      }

      this.triggerEvent('change', { value: selected })
    }
  }
})
