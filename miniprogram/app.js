// app.js — PingChang 平常
App({
  onLaunch() {
    wx.cloud.init({ env: 'your-env-id', traceUser: true })
  },
  globalData: {
    userInfo: null
  }
})
