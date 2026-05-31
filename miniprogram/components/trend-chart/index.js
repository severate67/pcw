// components/trend-chart/index.js — 情绪折线图组件（原生 Canvas）

const EMOTION_COLORS = {
  happy: '#C4622D',
  calm: '#2E6E65',
  sad: '#5A3D7A',
  anxious: '#8C5E00',
  mixed: '#7A5C3E'
}

Component({
  properties: {
    data: {
      type: Array,
      value: []
    }
  },

  data: {
    canvasId: 'trend-chart-canvas',
    chartInited: false
  },

  observers: {
    'data': function (data) {
      if (data && data.length > 0) {
        wx.nextTick(() => { this._renderChart(data) })
      }
    }
  },

  methods: {
    _renderChart(data) {
      if (!data || data.length === 0) return

      const sysInfo = wx.getSystemInfoSync()
      const windowWidth = sysInfo.windowWidth || 375
      const rpxToPx = windowWidth / 750

      // canvas 宽 = windowWidth - section margin(24rpx) * 2 - card padding(24rpx) * 2
      const canvasWidth = windowWidth - Math.round(96 * rpxToPx)
      const canvasHeight = Math.round(200 * rpxToPx)

      const pad = { top: 16, right: 12, bottom: 24, left: 22 }
      const cw = canvasWidth - pad.left - pad.right
      const ch = canvasHeight - pad.top - pad.bottom

      const ctx = wx.createCanvasContext(this.data.canvasId, this)

      // 背景
      ctx.setFillStyle('#EDE0C4')
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      // 横向网格（对应强度 5 到 1）
      ctx.setStrokeStyle('rgba(201,166,107,0.4)')
      ctx.setLineWidth(0.5)
      for (let i = 0; i <= 4; i++) {
        const y = pad.top + (i / 4) * ch
        ctx.beginPath()
        ctx.moveTo(pad.left, y)
        ctx.lineTo(pad.left + cw, y)
        ctx.stroke()
      }

      // Y 轴标签（5→1，从上到下）
      ctx.setFontSize(9)
      ctx.setFillStyle('#7A5C3E')
      ctx.setTextAlign('right')
      ;['5', '4', '3', '2', '1'].forEach((label, i) => {
        ctx.fillText(label, pad.left - 4, pad.top + (i / 4) * ch + 4)
      })

      // 计算30天日期范围
      const todayMs = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00').getTime()
      const startMs = todayMs - 29 * 24 * 60 * 60 * 1000

      const points = data
        .map(d => {
          const dt = new Date(d.date + 'T00:00:00').getTime()
          const dayIndex = Math.round((dt - startMs) / (24 * 60 * 60 * 1000))
          return {
            x: pad.left + (dayIndex / 29) * cw,
            y: pad.top + ((5 - d.intensity) / 4) * ch,
            emotion: d.emotion
          }
        })
        .filter(p => p.x >= pad.left - 1 && p.x <= pad.left + cw + 1)

      if (points.length === 0) {
        ctx.draw()
        return
      }

      // 连线
      ctx.setStrokeStyle('#C9A66B')
      ctx.setLineWidth(2)
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      ctx.stroke()

      // 数据点
      points.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
        ctx.setFillStyle(EMOTION_COLORS[p.emotion] || '#C9A66B')
        ctx.fill()
        ctx.setStrokeStyle('#fff')
        ctx.setLineWidth(1)
        ctx.stroke()
      })

      ctx.draw(false, () => {
        this.setData({ chartInited: true })
      })
    },

    onTouchStart(e) {},
    onTouchEnd(e) {}
  }
})
