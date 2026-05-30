// components/trend-chart/index.js — 情绪折线图组件（使用 wx-charts）
// 注意：wx-charts 需在 project.config.json 中引入，不使用 ECharts

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
        this._renderChart(data)
      }
    }
  },

  methods: {
    _renderChart(data) {
      if (!data || data.length === 0) return

      // wx-charts 初始化（实际引入后取消注释）
      // const WxCharts = require('../../utils/wxcharts')
      // const chart = new WxCharts({
      //   canvasId: this.data.canvasId,
      //   type: 'line',
      //   categories: data.map(d => d.date),
      //   series: [{
      //     name: '情绪强度',
      //     data: data.map(d => d.intensity),
      //     format: (val) => val === 0 ? null : val
      //   }],
      //   yAxis: { min: 0, max: 5 },
      //   width: 650,
      //   height: 200,
      //   dataLabel: false,
      //   extra: { line: { type: 'straight', width: 2 } }
      // })

      this.setData({ chartInited: true })
    },

    onTouchStart(e) {
      // 预留：wx-charts 触摸交互
    },

    onTouchEnd(e) {
      // 预留：wx-charts 触摸交互
    }
  }
})
