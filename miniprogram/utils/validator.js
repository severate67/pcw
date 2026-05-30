// utils/validator.js — 字数校验工具
// 禁止在各页面重复写校验逻辑，统一使用本文件的函数

/**
 * 计算文本字数
 * 规则：去除首尾空格，中文字符每个计 1 字，英文单词每个计 1 字，数字组每个计 1 字，不计标点、空格
 * @param {string} text
 * @returns {number}
 */
const countWords = (text) => {
  if (!text || typeof text !== 'string') return 0

  const trimmed = text.trim()
  if (!trimmed) return 0

  // 统计中文字符数
  const chineseChars = (trimmed.match(/[一-龥]/g) || []).length

  // 去掉中文字符后统计英文单词数和独立数字组
  const withoutChinese = trimmed.replace(/[一-龥]/g, ' ')
  const englishWords = (withoutChinese.match(/\b[a-zA-Z]+\b/g) || []).length
  const numbers = (withoutChinese.match(/\b\d+\b/g) || []).length

  return chineseChars + englishWords + numbers
}

/**
 * 校验信件正文
 * @param {string} text 信件内容
 * @param {boolean} isFirst 是否为陌生人首封信（true=150字门槛，false=100字门槛）
 * @returns {{valid: boolean, count: number, required: number}}
 */
const validateLetter = (text, isFirst) => {
  const required = isFirst ? 150 : 100
  const count = countWords(text)
  return {
    valid: count >= required,
    count,
    required
  }
}

/**
 * 校验一句话介绍（注册时填写）
 * 要求：20–60 字
 * @param {string} text
 * @returns {{valid: boolean, count: number, min: number, max: number}}
 */
const validateIntro = (text) => {
  const count = countWords(text)
  return {
    valid: count >= 20 && count <= 60,
    count,
    min: 20,
    max: 60
  }
}

/**
 * 校验心情日记（选填）
 * 如果提供内容，要求 >= 30 字
 * @param {string} text
 * @returns {{valid: boolean, count: number, required: number}}
 */
const validateMoodDiary = (text) => {
  if (!text || !text.trim()) {
    // 日记为选填，未填视为合法
    return { valid: true, count: 0, required: 30 }
  }
  const count = countWords(text)
  return {
    valid: count >= 30,
    count,
    required: 30
  }
}

module.exports = {
  countWords,
  validateLetter,
  validateIntro,
  validateMoodDiary
}
