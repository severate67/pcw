// components/open-animation/index.js — 拆信动画组件（5阶段状态机）

const ANIM_STATE = {
  IDLE: 'idle',
  SEAL_FADE: 'sealFade',    // 阶段1：蜡封消失 0ms 280ms opacity+scale→0
  FLAP_OPEN: 'flapOpen',    // 阶段2：封口翻折 100ms 550ms rotateX→180deg
  PAPER_SLIDE: 'paperSlide',// 阶段3：信纸滑出 300ms 500ms scaleY→1
  TEXT_FADE: 'textFade',    // 阶段4：文字淡入 500ms 300ms opacity→1
  SIGN_FADE: 'signFade',    // 阶段5：签名淡入 650ms 300ms opacity→1
  DONE: 'done'
}

Component({
  properties: {
    letterId: {
      type: String,
      value: ''
    },
    animState: {
      type: String,
      value: ANIM_STATE.IDLE
    }
  },

  data: {
    isAnimating: false,
    sealAnimation: null,
    flapAnimation: null,
    paperAnimation: null,
    textAnimation: null,
    signAnimation: null,
    ANIM_STATE
  },

  observers: {
    'animState': function (state) {
      if (state === ANIM_STATE.SEAL_FADE && !this.data.isAnimating) {
        this._runAnimation()
      }
    }
  },

  methods: {
    _runAnimation() {
      if (this.data.isAnimating) return
      this.setData({ isAnimating: true })

      // 阶段1：蜡封消失（delay:0, duration:280ms, ease-out）
      const sealAnim = wx.createAnimation({ duration: 280, timingFunction: 'ease-out' })
      sealAnim.opacity(0).scale(0).step()
      this.setData({ sealAnimation: sealAnim.export() })

      // 阶段2：封口翻折（delay:100ms, duration:550ms, ease-in-out）
      setTimeout(() => {
        const flapAnim = wx.createAnimation({ duration: 550, timingFunction: 'ease-in-out' })
        flapAnim.rotateX(180).step()
        this.setData({ flapAnimation: flapAnim.export() })
      }, 100)

      // 阶段3：信纸滑出（delay:300ms, duration:500ms, cubic-bezier）
      setTimeout(() => {
        const paperAnim = wx.createAnimation({
          duration: 500,
          timingFunction: 'cubic-bezier(0.34, 1.1, 0.64, 1)'
        })
        paperAnim.scaleY(1).step()
        this.setData({ paperAnimation: paperAnim.export() })
      }, 300)

      // 阶段4：文字淡入（delay:500ms, duration:300ms, ease）
      setTimeout(() => {
        const textAnim = wx.createAnimation({ duration: 300, timingFunction: 'ease' })
        textAnim.opacity(1).step()
        this.setData({ textAnimation: textAnim.export() })
      }, 500)

      // 阶段5：签名淡入（delay:650ms, duration:300ms, ease）
      setTimeout(() => {
        const signAnim = wx.createAnimation({ duration: 300, timingFunction: 'ease' })
        signAnim.opacity(1).step()
        this.setData({ signAnimation: signAnim.export() })
      }, 650)

      // 动画结束（delay:650+300=950ms 后通知父组件）
      setTimeout(() => {
        this.setData({ isAnimating: false })
        this.triggerEvent('animDone')
      }, 1000)
    }
  }
})
