// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { ChartOptions } from "chart.js";

import { ChartOptionsPlot } from "@lichtblick/suite-base/panels/Plot/types";
import { fontMonospace } from "@lichtblick/theme";

export const getChartOptions = ({
  devicePixelRatio,
  gridColor,
  tickColor,
}: ChartOptionsPlot): ChartOptions<"scatter"> => ({
  maintainAspectRatio: false,
  animation: false,
  elements: { line: { tension: 0 } },
  interaction: {
    intersect: false,
    mode: "x",
  },
  devicePixelRatio,
  font: {
    family: fontMonospace,
    size: 10,
  },
  responsive: false,

  scales: {
    x: {
      type: "linear",
      display: true,

      border: {
        display: false, // 禁用默认轴线绘制
        color: gridColor,
        width: 0        // 宽度设为0以完全隐藏默认线

      },
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
      display: true,
      position: 'left',   // Y轴固定在左侧
      border: {
        display: true,      // 强制显示X轴
        color: gridColor,   // 黄色轴线
        width: 2           // 加粗轴线
      },
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
  plugins: {
    decimation: {
      enabled: false,
    },
    tooltip: {
      enabled: false,
    },
    zoom: {
      zoom: {
        enabled: true,
        mode: "x",
        sensitivity: 3,
        speed: 0.1,
      },
      pan: {
        mode: "xy",
        enabled: true,
        speed: 20,
        threshold: 10,
      },
    },
  },
});
