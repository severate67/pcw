// pages/letters/detail/index.js — 信件详情（含拆信动画）
const api = require('../../../utils/api')

const ANIM_STATE = {
  IDLE: 'idle',
  SEAL_FADE: 'sealFade',
  FLAP_OPEN: 'flapOpen',
  PAPER_SLIDE: 'paperSlide',
  TEXT_FADE: 'textFade',
  SIGN_FADE: 'signFade',
  DONE: 'done'
}

Page({
  data: {
    letter: null,
    animState: ANIM_STATE.IDLE,
    isAnimating: false,
    loading: true,
    letterId: null
  },

  onLoad(options) {
    const { letterId } = options
    if (!letterId) {
      wx.showToast({ title: '信件不存在', icon: 'none' })
      wx.navigateBack()
      return
    }
    this.setData({ letterId })
    this._loadLetter(letterId)
  },

  async _loadLetter(letterId) {
    this.setData({ loading: true })
    try {
      const res = await api.getLetter(letterId)
      if (res.code === 0) {
        this.setData({ letter: res.data })
        // 如果信件尚未打开（status === 'sent'），触发拆信动画
        if (res.data && res.data.status === 'sent') {
          this._startOpenAnimation()
        } else {
          this.setData({ animState: ANIM_STATE.DONE })
        }
      } else {
        wx.showToast({ title: res.message || '加载失败', icon: 'none' })
        wx.navigateBack()
      }
    } catch (err) {
      console.error('[detail] _loadLetter error:', err)
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  _startOpenAnimation() {
    if (this.data.isAnimating) return
    this.setData({ isAnimating: true, animState: ANIM_STATE.SEAL_FADE })
  },

  onAnimDone() {
    // 拆信动画完成回调（由 open-animation 组件触发）
    this.setData({ animState: ANIM_STATE.DONE, isAnimating: false })
  },

  onReply() {
    const { letter } = this.data
    if (!letter) return
    wx.navigateTo({
      url: `/pages/letters/write/index?targetUid=${letter.from_uid}&isFirst=false`
    })
  },

  goToProfile() {
    const { letter } = this.data
    if (!letter) return
    wx.navigateTo({ url: `/pages/match/profile/index?targetUid=${letter.from_uid}` })
  }
})
