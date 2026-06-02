// app.js — PingChang 平常
App({
  onLaunch() {
    wx.cloud.init({ env: 'cloud1-d0gh5vk6m6766834f', traceUser: true })
    this._initPrivacy()
    this._checkUser()
  },

  _initPrivacy() {
    if (wx.onNeedPrivacyAuthorization) {
      wx.onNeedPrivacyAuthorization(resolve => {
        wx.showModal({
          title: '隐私保护提示',
          content: '在使用前，请阅读并同意《隐私政策》，我们将依法保护您的个人信息。',
          confirmText: '同意',
          cancelText: '查看政策',
          success: res => {
            if (res.confirm) {
              resolve({ buttonId: 'agree', event: 'agree' })
            } else {
              wx.navigateTo({ url: '/pages/privacy/index' })
            }
          }
        })
      })
    }
  },

  async _checkUser() {
    try {
      const res = await new Promise((resolve, reject) => {
        // 5秒超时，避免云函数超时阻塞启动
        const timer = setTimeout(() => reject(new Error('timeout')), 5000)
        wx.cloud.callFunction({
          name: 'getUser',
          data: {},
          success: r => { clearTimeout(timer); resolve(r.result) },
          fail: err => { clearTimeout(timer); reject(err) }
        })
      })
      if (res.code === 0) {
        this.globalData.userInfo = res.data
      } else {
        // 用户未注册，跳转注册引导
        wx.reLaunch({ url: '/pages/onboarding/index/index' })
      }
    } catch (err) {
      // 超时或网络错误时静默失败，不影响页面正常加载
      console.warn('[app] _checkUser failed:', err.message)
    }
  },

  globalData: {
    userInfo: null
  }
})
