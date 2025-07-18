// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { NewPIDPLOTConfig } from "./config";

// 测试Y轴范围设置
export function testYBounds() {
  const testConfig: NewPIDPLOTConfig = {
    paths: [],
    minXValue: 0,
    maxXValue: 10,
    minYValue: -16,
    maxYValue: 16,
    showLegend: true,
    legendDisplay: "floating",
    showPlotValuesInLegend: false,
    showXAxisLabels: true,
    showYAxisLabels: true,
    isSynced: true,
    xAxisVal: "timestamp",
    sidebarDimension: 240,
    pidParameters: {
      kp: 1.0,
      ki: 0.1,
      kd: 0.01,
      rosParameterPrefix: "/pid_controller/",
    },
    showParameterPanel: true,
    parameterPanelPosition: "right",
  };

  // 测试数字类型
  console.log("测试数字类型Y轴范围:");
  console.log("minYValue:", testConfig.minYValue, "类型:", typeof testConfig.minYValue);
  console.log("maxYValue:", testConfig.maxYValue, "类型:", typeof testConfig.maxYValue);

  // 测试字符串类型
  const testConfigString: NewPIDPLOTConfig = {
    ...testConfig,
    minYValue: "-16",
    maxYValue: "16",
  };

  console.log("\n测试字符串类型Y轴范围:");
  console.log("minYValue:", testConfigString.minYValue, "类型:", typeof testConfigString.minYValue);
  console.log("maxYValue:", testConfigString.maxYValue, "类型:", typeof testConfigString.maxYValue);

  // 测试类型转换
  const minYValue = typeof testConfigString.minYValue === 'string'
    ? parseFloat(testConfigString.minYValue)
    : testConfigString.minYValue;
  const maxYValue = typeof testConfigString.maxYValue === 'string'
    ? parseFloat(testConfigString.maxYValue)
    : testConfigString.maxYValue;

  console.log("\n转换后的Y轴范围:");
  console.log("minYValue:", minYValue, "类型:", typeof minYValue);
  console.log("maxYValue:", maxYValue, "类型:", typeof maxYValue);

  return {
    testConfig,
    testConfigString,
    convertedBounds: { minYValue, maxYValue }
  };
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testYBounds();
}
