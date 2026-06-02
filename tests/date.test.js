// tests/date.test.js — date.js 单元测试
// 运行方式：node tests/run.js

const { formatDate, relativeTime, isActiveRecently } = require('../miniprogram/utils/date')

const tests = []

function test(name, fn) {
  tests.push({ name, fn })
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    },
    toMatch(pattern) {
      if (!pattern.test(actual)) throw new Error(`Expected ${JSON.stringify(actual)} to match ${pattern}`)
    }
  }
}

// ─── formatDate ───────────────────────────────────────────────

test('formatDate: Date 对象，默认格式 YYYY-MM-DD', () => {
  const d = new Date(2026, 0, 5)
  expect(formatDate(d)).toBe('2026-01-05')
})

test('formatDate: 字符串日期', () => {
  expect(formatDate('2026-06-02')).toBe('2026-06-02')
})

test('formatDate: 时间戳', () => {
  const ts = new Date(2026, 5, 2).getTime()
  expect(formatDate(ts)).toBe('2026-06-02')
})

test('formatDate: 自定义格式', () => {
  const d = new Date(2026, 0, 5, 14, 30, 0)
  expect(formatDate(d, 'YYYY/MM/DD HH:mm')).toBe('2026/01/05 14:30')
})

test('formatDate: 月份和日期补零', () => {
  const d = new Date(2026, 0, 5)
  expect(formatDate(d, 'MM-DD')).toBe('01-05')
})

test('formatDate: 无效日期返回空字符串', () => {
  expect(formatDate('invalid-date')).toBe('')
  expect(formatDate(null)).toBe('')
})

// ─── relativeTime ─────────────────────────────────────────────

test('relativeTime: 刚刚（< 60秒）', () => {
  const d = new Date(Date.now() - 30 * 1000)
  expect(relativeTime(d)).toBe('刚刚')
})

test('relativeTime: X分钟前（< 60分钟）', () => {
  const d = new Date(Date.now() - 5 * 60 * 1000)
  expect(relativeTime(d)).toBe('5分钟前')
})

test('relativeTime: X小时前（< 24小时）', () => {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000)
  expect(relativeTime(d)).toBe('3小时前')
})

test('relativeTime: X天前（< 7天）', () => {
  const d = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  expect(relativeTime(d)).toBe('3天前')
})

test('relativeTime: X周前（< 30天）', () => {
  const d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  expect(relativeTime(d)).toBe('2周前')
})

test('relativeTime: >= 30天显示日期', () => {
  const d = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
  expect(relativeTime(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

test('relativeTime: 无效日期返回空字符串', () => {
  expect(relativeTime('not-a-date')).toBe('')
})

// ─── isActiveRecently ─────────────────────────────────────────

test('isActiveRecently: 3天前活跃返回 true', () => {
  const d = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  expect(isActiveRecently(d)).toBe(true)
})

test('isActiveRecently: 恰好7天前活跃返回 true', () => {
  const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  expect(isActiveRecently(d)).toBe(true)
})

test('isActiveRecently: 8天前不活跃返回 false', () => {
  const d = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
  expect(isActiveRecently(d)).toBe(false)
})

test('isActiveRecently: 无效日期返回 false', () => {
  expect(isActiveRecently('invalid')).toBe(false)
})

module.exports = { tests }
