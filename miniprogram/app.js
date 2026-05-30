// app.js — PingChang 平常
App({
  onLaunch() {
    wx.cloud.init({ env: 'cloud1', traceUser: true })
  },
  globalData: {
    userInfo: null
  }
})
