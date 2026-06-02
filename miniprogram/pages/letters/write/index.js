// pages/letters/write/index.js — 写信页
const api = require('../../../utils/api')
const validator = require('../../../utils/validator')

Page({
  data: {
    title: '',
    content: '',
    wordCount: 0,
    canSend: false,
    isFirst: true,
    targetUid: null,
    targetNickname: '',
    sending: false,
    required: 150,
    parentId: null,
    // 草稿相关
    draftSaved: false,
    draftSavedAt: ''
  },

  _autoSaveTimer: null,

  onLoad(options) {
    const { targetUid, targetNickname, isFirst, parentId } = options
    const isFirstBool = isFirst !== 'false'
    this.setData({
      targetUid: targetUid || null,
      targetNickname: decodeURIComponent(targetNickname || '对方'),
      isFirst: isFirstBool,
      required: isFirstBool ? 150 : 100,
      parentId: parentId || null
    })
    this._checkDraft(targetUid, parentId)
  },

  onHide() {
    this._saveDraft()
  },

  onUnload() {
    if (this._autoSaveTimer) clearTimeout(this._autoSaveTimer)
    this._saveDraft()
  },

  // ─── 草稿相关 ──────────────────────────────────────────────

  _draftKey() {
    const { targetUid, parentId } = this.data
    return `letter_draft_${targetUid || 'reply'}_${parentId || 'new'}`
  },

  _checkDraft(targetUid, parentId) {
    const key = `letter_draft_${targetUid || 'reply'}_${parentId || 'new'}`
    try {
      const draft = wx.getStorageSync(key)
      if (draft && draft.content) {
        const savedDate = new Date(draft.savedAt)
        const dateStr = `${savedDate.getMonth() + 1}/${savedDate.getDate()} ${String(savedDate.getHours()).padStart(2, '0')}:${String(savedDate.getMinutes()).padStart(2, '0')}`
        wx.showModal({
          title: '发现未完成的草稿',
          content: `上次保存于 ${dateStr}，是否继续编辑？`,
          confirmText: '继续写',
          cancelText: '重新写',
          success: res => {
            if (res.confirm) {
              this._restoreDraft(draft)
            } else {
              wx.removeStorageSync(key)
            }
          }
        })
      }
    } catch (e) {}
  },

  _restoreDraft(draft) {
    const result = validator.validateLetter(draft.content, this.data.isFirst)
    this.setData({
      title: draft.title || '',
      content: draft.content || '',
      wordCount: result.count,
      canSend: result.valid,
      draftSaved: true,
      draftSavedAt: this._formatSavedAt(draft.savedAt)
    })
  },

  _saveDraft() {
    const { title, content, targetUid, parentId } = this.data
    if (!content) return
    const key = `letter_draft_${targetUid || 'reply'}_${parentId || 'new'}`
    const savedAt = Date.now()
    try {
      wx.setStorageSync(key, { title, content, savedAt })
      this.setData({
        draftSaved: true,
        draftSavedAt: this._formatSavedAt(savedAt)
      })
    } catch (e) {}
  },

  _clearDraft() {
    try {
      wx.removeStorageSync(this._draftKey())
    } catch (e) {}
    this.setData({ draftSaved: false, draftSavedAt: '' })
  },

  _formatSavedAt(ts) {
    const d = new Date(ts)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} 已存`
  },

  _scheduleAutoSave() {
    if (this._autoSaveTimer) clearTimeout(this._autoSaveTimer)
    if (!this.data.content) return
    this._autoSaveTimer = setTimeout(() => { this._saveDraft() }, 1500)
  },

  onSaveDraft() {
    if (!this.data.content) {
      wx.showToast({ title: '请先写点内容', icon: 'none' })
      return
    }
    this._saveDraft()
    wx.showToast({ title: '草稿已保存', icon: 'success' })
  },

  // ─── 输入处理 ──────────────────────────────────────────────

  onTitleInput(e) {
    this.setData({ title: e.detail.value, draftSaved: false })
    this._scheduleAutoSave()
  },

  onContentInput(e) {
    const content = e.detail.value
    const result = validator.validateLetter(content, this.data.isFirst)
    this.setData({
      content,
      wordCount: result.count,
      canSend: result.valid,
      draftSaved: false
    })
    this._scheduleAutoSave()
  },

  // ─── 发送 ──────────────────────────────────────────────────

  async onSend() {
    if (!this.data.canSend || this.data.sending) return

    if (!this.data.parentId && !this.data.targetUid) {
      wx.showToast({ title: '请先选择收信人', icon: 'none' })
      return
    }

    this.setData({ sending: true })
    try {
      const moderateRes = await api.moderateContent(this.data.content)
      if (moderateRes.code !== 0) {
        wx.showToast({ title: '内容包含违规信息，请修改后重新发送', icon: 'none', duration: 3000 })
        return
      }

      let res
      if (this.data.parentId) {
        res = await api.replyLetter({
          parentId: this.data.parentId,
          content: this.data.content,
          title: this.data.title
        })
      } else {
        res = await api.sendLetter({
          title: this.data.title,
          content: this.data.content,
          targetUid: this.data.targetUid,
          isFirst: this.data.isFirst
        })
      }

      if (res.code === 0) {
        this._clearDraft()
        wx.showToast({ title: '信件已寄出', icon: 'success' })
        setTimeout(() => { wx.navigateBack() }, 1500)
      } else {
        wx.showToast({ title: res.message || '发送失败', icon: 'none' })
      }
    } catch (err) {
      console.error('[write] onSend error:', err)
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
    } finally {
      this.setData({ sending: false })
    }
  }
})
