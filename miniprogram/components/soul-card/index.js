// components/soul-card/index.js — 灵魂匹配卡组件
Component({
  properties: {
    profile: {
      type: Object,
      value: null
    },
    score: {
      type: Number,
      value: 0
    },
    commonTags: {
      type: Array,
      value: []
    }
  },

  data: {
    scoreColor: ''
  },

  observers: {
    'score': function (score) {
      let color = ''
      if (score >= 80) color = '#2E6E65'
      else if (score >= 60) color = '#C4622D'
      else color = '#7A5C3E'
      this.setData({ scoreColor: color })
    }
  },

  methods: {
    onTap() {
      if (!this.properties.profile) return
      this.triggerEvent('tap', { targetUid: this.properties.profile._id })
    }
  }
})
