// tests/validator.test.js — validator.js 单元测试
// 运行方式：node tests/run.js

const { countWords, validateLetter, validateIntro, validateMoodDiary } = require('../miniprogram/utils/validator')

const tests = []

function test(name, fn) {
  tests.push({ name, fn })
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    },
    toEqual(expected) {
      const a = JSON.stringify(actual)
      const e = JSON.stringify(expected)
      if (a !== e) throw new Error(`Expected ${e}, got ${a}`)
    }
  }
}

// ─── countWords ───────────────────────────────────────────────

test('countWords: null/undefined 返回 0', () => {
  expect(countWords(null)).toBe(0)
  expect(countWords(undefined)).toBe(0)
  expect(countWords('')).toBe(0)
  expect(countWords('   ')).toBe(0)
})

test('countWords: 纯中文字符', () => {
  expect(countWords('你好世界')).toBe(4)
  expect(countWords('  你好世界  ')).toBe(4)
})

test('countWords: 纯英文单词', () => {
  expect(countWords('hello world')).toBe(2)
  expect(countWords('Hello World foo')).toBe(3)
})

test('countWords: 纯数字组', () => {
  expect(countWords('123 456')).toBe(2)
  expect(countWords('2024')).toBe(1)
})

test('countWords: 中英混合', () => {
  expect(countWords('我喜欢 JavaScript')).toBe(4)
  expect(countWords('Hello 世界')).toBe(3)
})

test('countWords: 中英数字混合', () => {
  expect(countWords('我有3只猫')).toBe(5)   // 我+有+3+只+猫
  expect(countWords('版本 2024 已发布')).toBe(6) // 版+本+2024+已+发+布
})

test('countWords: 标点和空格不计入字数', () => {
  expect(countWords('你好，世界！')).toBe(4)
  expect(countWords('hello, world!')).toBe(2)
  expect(countWords('你好。今天、天气很好。')).toBe(8) // 你+好+今+天+天+气+很+好
})

test('countWords: 150字以下内容', () => {
  const text = '你'.repeat(149)
  expect(countWords(text)).toBe(149)
})

test('countWords: 恰好150字', () => {
  const text = '你'.repeat(150)
  expect(countWords(text)).toBe(150)
})

// ─── validateLetter ───────────────────────────────────────────

test('validateLetter: 首封信 < 150 字不合法', () => {
  const result = validateLetter('你'.repeat(149), true)
  expect(result.valid).toBe(false)
  expect(result.count).toBe(149)
  expect(result.required).toBe(150)
})

test('validateLetter: 首封信 = 150 字合法', () => {
  const result = validateLetter('你'.repeat(150), true)
  expect(result.valid).toBe(true)
})

test('validateLetter: 首封信 > 150 字合法', () => {
  const result = validateLetter('你'.repeat(200), true)
  expect(result.valid).toBe(true)
})

test('validateLetter: 回信 < 100 字不合法', () => {
  const result = validateLetter('你'.repeat(99), false)
  expect(result.valid).toBe(false)
  expect(result.required).toBe(100)
})

test('validateLetter: 回信 = 100 字合法', () => {
  const result = validateLetter('你'.repeat(100), false)
  expect(result.valid).toBe(true)
})

// ─── validateIntro ─────────────────────────────────────────────

test('validateIntro: < 20 字不合法', () => {
  const result = validateIntro('你'.repeat(19))
  expect(result.valid).toBe(false)
  expect(result.min).toBe(20)
  expect(result.max).toBe(60)
})

test('validateIntro: 20-60 字合法', () => {
  expect(validateIntro('你'.repeat(20)).valid).toBe(true)
  expect(validateIntro('你'.repeat(40)).valid).toBe(true)
  expect(validateIntro('你'.repeat(60)).valid).toBe(true)
})

test('validateIntro: > 60 字不合法', () => {
  expect(validateIntro('你'.repeat(61)).valid).toBe(false)
})

// ─── validateMoodDiary ─────────────────────────────────────────

test('validateMoodDiary: 空内容合法（选填）', () => {
  expect(validateMoodDiary('').valid).toBe(true)
  expect(validateMoodDiary(null).valid).toBe(true)
  expect(validateMoodDiary('   ').valid).toBe(true)
})

test('validateMoodDiary: 有内容但 < 30 字不合法', () => {
  const result = validateMoodDiary('今天心情不错')
  expect(result.valid).toBe(false)
  expect(result.required).toBe(30)
})

test('validateMoodDiary: >= 30 字合法', () => {
  expect(validateMoodDiary('你'.repeat(30)).valid).toBe(true)
  expect(validateMoodDiary('你'.repeat(50)).valid).toBe(true)
})

module.exports = { tests }
