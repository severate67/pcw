// components/seal-stamp/index.js — 蜡封印章组件
Component({
  properties: {
    sealed: {
      type: Boolean,
      value: true
    }
  },

  data: {
    pressed: false,
    stampAnimation: null
  },

  methods: {
    onTap() {
      if (this.data.pressed) return

      // 印章按下动效：scale 1 → 0.9 → 1，150ms
      const anim = wx.createAnimation({ duration: 150, timingFunction: 'ease-out' })
      anim.scale(0.9).step({ duration: 80 })
      anim.scale(1).step({ duration: 80 })
      this.setData({ stampAnimation: anim.export(), pressed: true })

      setTimeout(() => {
        this.setData({ pressed: false })
      }, 200)

      this.triggerEvent('tap', { sealed: this.properties.sealed })
    }
  }
})
