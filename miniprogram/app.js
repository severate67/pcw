// app.js — PingChang 平常
App({
  onLaunch() {
    wx.cloud.init({ env: 'cloud1-d0gh5vk6m6766834f', traceUser: true })
    this._checkUser()
  },

  async _checkUser() {
    try {
      const res = await wx.cloud.callFunction({ name: 'getUser', data: {} })
      if (res.result && res.result.code === 0) {
        this.globalData.userInfo = res.result.data
      } else {
        // 未注册用户，标记为新用户
        this.globalData.isNewUser = true
      }
    } catch (e) {
      console.error('[app] _checkUser error:', e)
    }
  },

  globalData: {
    userInfo: null,
    isNewUser: false
  }
})
