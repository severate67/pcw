// app.js — PingChang 平常
App({
  onLaunch() {
    wx.cloud.init({ env: 'cloud1-d0gh5vk6m6766834f', traceUser: true })
  },

  globalData: {
    userInfo: null
  }
})
