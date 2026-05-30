// app.js — PingChang 平常
App({
  onLaunch() {
    wx.cloud.init({ env: 'cloud1-d0gh5vk6m6766834f', traceUser: true })
    this._checkUser()
  },

  async _checkUser() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.cloud.callFunction({
          name: 'getUser',
          data: {},
          success: r => resolve(r.result),
          fail: reject
        })
      })
      if (res.code === 0) {
        this.globalData.userInfo = res.data
      } else {
        // 用户未注册，跳转注册引导
        wx.reLaunch({ url: '/pages/onboarding/index/index' })
      }
    } catch (err) {
      console.error('[app] _checkUser error:', err)
    }
  },

  globalData: {
    userInfo: null
  }
})
