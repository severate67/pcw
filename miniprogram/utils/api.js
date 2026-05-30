// utils/api.js — 云函数调用封装
// 所有页面必须通过此文件调用云函数，禁止直接使用 wx.cloud.callFunction

/**
 * 基础云函数调用封装
 * @param {string} name 云函数名称
 * @param {object} data 入参
 * @returns {Promise<{code: number, data: any, message: string}>}
 */
const callCloud = (name, data) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data: data || {},
      success: res => {
        resolve(res.result)
      },
      fail: err => {
        console.error(`[api] callCloud(${name}) failed:`, err)
        reject(err)
      }
    })
  })
}

// ─── 书信相关 ────────────────────────────────────────────────

/**
 * 发送信件
 * @param {{title?: string, content: string, targetUid: string, isFirst: boolean}} data
 */
const sendLetter = (data) => callCloud('sendLetter', data)

/**
 * 获取信件详情
 * @param {string} id 信件 _id
 */
const getLetter = (id) => callCloud('getLetter', { id })

/**
 * 回复信件
 * @param {{parentId: string, content: string, title?: string}} data
 */
const replyLetter = (data) => callCloud('replyLetter', data)

/**
 * 获取收件箱列表（分页）
 * @param {number} page 页码，从 0 开始
 */
const getInbox = (page) => callCloud('getInbox', { page: page || 0 })

/**
 * 获取已发出列表（分页）
 * @param {number} page 页码，从 0 开始
 */
const getSent = (page) => callCloud('getSent', { page: page || 0 })

// ─── 情绪相关 ────────────────────────────────────────────────

/**
 * 保存情绪记录
 * @param {{emotion: string, intensity: number, diary?: string, date: string}} data
 */
const saveMood = (data) => callCloud('saveMood', data)

/**
 * 获取指定年月的情绪列表（用于月历）
 * @param {number} year
 * @param {number} month 1-12
 */
const getMoods = (year, month) => callCloud('getMoods', { year, month })

/**
 * 获取过去 30 天情绪趋势（用于折线图）
 */
const getMoodTrend = () => callCloud('getMoodTrend', {})

/**
 * 获取「去年的今天」记录
 */
const getMemoryToday = () => callCloud('getMemoryToday', {})

// ─── 匹配推荐相关 ────────────────────────────────────────────

/**
 * 获取每日灵魂推荐列表
 */
const getDailyRecommend = () => callCloud('getDailyRecommend', {})

/**
 * 跳过某推荐用户
 * @param {string} targetUid 目标用户 uid（匹配记录中的 uid）
 */
const skipUser = (targetUid) => callCloud('skipUser', { targetUid })

/**
 * 获取他人公开 profile
 * @param {string} targetUid
 */
const getPublicProfile = (targetUid) => callCloud('getPublicProfile', { targetUid })

// ─── 用户相关 ────────────────────────────────────────────────

/**
 * 新用户注册
 * @param {{nickname: string, intro: string, tags: string[], activeTime: string, letterFreq: string}} data
 */
const createUser = (data) => callCloud('createUser', data)

/**
 * 获取当前用户信息
 */
const getUser = () => callCloud('getUser', {})

/**
 * 更新用户资料
 * @param {{nickname?: string, intro?: string, tags?: string[], activeTime?: string, letterFreq?: string}} data
 */
const updateUser = (data) => callCloud('updateUser', data)

// ─── 内容安全 ────────────────────────────────────────────────

/**
 * 内容安全审核
 * @param {string} content 待审核文本
 */
const moderateContent = (content) => callCloud('moderateContent', { content })

module.exports = {
  callCloud,
  sendLetter,
  getLetter,
  replyLetter,
  getInbox,
  getSent,
  saveMood,
  getMoods,
  getMoodTrend,
  getMemoryToday,
  getDailyRecommend,
  skipUser,
  getPublicProfile,
  createUser,
  getUser,
  updateUser,
  moderateContent
}
