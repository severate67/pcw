// utils/date.js — 日期格式化工具

/**
 * 格式化日期
 * 支持的格式符：YYYY MM DD HH mm ss
 * @param {Date|string|number} date
 * @param {string} fmt 格式模板，默认 'YYYY-MM-DD'
 * @returns {string}
 */
const formatDate = (date, fmt) => {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''

  const format = fmt || 'YYYY-MM-DD'
  const map = {
    YYYY: d.getFullYear(),
    MM: String(d.getMonth() + 1).padStart(2, '0'),
    DD: String(d.getDate()).padStart(2, '0'),
    HH: String(d.getHours()).padStart(2, '0'),
    mm: String(d.getMinutes()).padStart(2, '0'),
    ss: String(d.getSeconds()).padStart(2, '0')
  }

  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, (matched) => map[matched])
}

/**
 * 相对时间描述
 * @param {Date|string|number} date
 * @returns {string} 例：'刚刚' '3分钟前' '2小时前' '3天前' '2026-01-05'
 */
const relativeTime = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''

  const now = Date.now()
  const diff = now - d.getTime() // 毫秒差

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`

  // 超过 30 天显示具体日期
  return formatDate(d, 'YYYY-MM-DD')
}

/**
 * 判断是否在最近 7 天内活跃
 * @param {Date|string|number} date
 * @returns {boolean}
 */
const isActiveRecently = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return false

  const diff = Date.now() - d.getTime()
  const days = diff / (1000 * 60 * 60 * 24)
  return days <= 7
}

module.exports = {
  formatDate,
  relativeTime,
  isActiveRecently
}
