export const getChartOptions = ({
  devicePixelRatio,
  gridColor,
  tickColor,
}: ChartOptionsPlot): ChartOptions<"scatter"> => ({
  scales: {
    x: {
      type: "linear",
      display: true, // 确保X轴显示
      grid: {
        display: false, // 关闭X轴网格线
        color: gridColor
      },
      ticks: {
        font: {
          family: fontMonospace,
          size: 10,
        },
        color: tickColor,
        maxRotation: 0,
        crossAlign: 'center' // 标签居中
      },
    },
    y: {
      type: "linear",
      display: true, // 确保Y轴显示
      position: 'left',   // Y轴固定在左侧
      grid: {
        display: false,  // 关闭Y轴网格线
        color: gridColor,
      },
      ticks: {
        font: {
          family: fontMonospace,
          size: 10,
        },
        color: tickColor,
        padding: 0,
        precision: 3,
      },
    },
  },
});