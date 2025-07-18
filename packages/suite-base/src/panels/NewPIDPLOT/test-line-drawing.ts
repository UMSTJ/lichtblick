// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { PIDParameterPath } from "./config";

// 测试线段绘制配置
export function testLineDrawing() {
  const testPaths: PIDParameterPath[] = [
    {
      value: "/pcl_pose.pose.position.x",
      enabled: true,
      label: "设定值",
      timestampMethod: "receiveTime",
      parameterType: "setpoint",
      rosParameter: "/pid_controller/setpoint",
      color: "#ff0000",
      showLine: true,
      lineSize: 2,
    },
    {
      value: "/pcl_pose.pose.position.y",
      enabled: true,
      label: "反馈值",
      timestampMethod: "receiveTime",
      parameterType: "feedback",
      rosParameter: "/pid_controller/feedback",
      color: "#00ff00",
      showLine: true,
      lineSize: 3,
    },
    {
      value: "/pcl_pose.pose.position.z",
      enabled: true,
      label: "输出值",
      timestampMethod: "receiveTime",
      parameterType: "output",
      rosParameter: "/pid_controller/output",
      color: "#0000ff",
      showLine: false, // 测试不显示线段
      lineSize: 1,
    },
  ];

  console.log("测试线段绘制配置:");
  testPaths.forEach((path, index) => {
    console.log(`路径 ${index + 1}:`);
    console.log(`  话题: ${path.value}`);
    console.log(`  标签: ${path.label}`);
    console.log(`  颜色: ${path.color}`);
    console.log(`  显示线段: ${path.showLine}`);
    console.log(`  线宽: ${path.lineSize}`);
    console.log(`  启用: ${path.enabled}`);
    console.log("---");
  });

  // 验证配置
  const validPaths = testPaths.filter(path => {
    const isValid = path.enabled && path.showLine !== undefined;
    if (!isValid) {
      console.warn(`路径 ${path.value} 配置无效`);
    }
    return isValid;
  });

  console.log(`有效路径数量: ${validPaths.length}/${testPaths.length}`);

  return {
    testPaths,
    validPaths,
    lineDrawingEnabled: validPaths.some(path => path.showLine),
  };
}

// 测试不同的线段配置
export function testLineConfigurations() {
  const configurations = [
    {
      name: "默认配置",
      showLine: undefined,
      lineSize: undefined,
      expected: { showLine: true, lineSize: 2 }
    },
    {
      name: "显示线段",
      showLine: true,
      lineSize: 3,
      expected: { showLine: true, lineSize: 3 }
    },
    {
      name: "隐藏线段",
      showLine: false,
      lineSize: 1,
      expected: { showLine: false, lineSize: 1 }
    },
    {
      name: "粗线段",
      showLine: true,
      lineSize: 5,
      expected: { showLine: true, lineSize: 5 }
    }
  ];

  console.log("测试线段配置:");
  configurations.forEach(config => {
    const actualShowLine = config.showLine ?? true;
    const actualLineSize = config.lineSize ?? 2;

    console.log(`${config.name}:`);
    console.log(`  期望: showLine=${config.expected.showLine}, lineSize=${config.expected.lineSize}`);
    console.log(`  实际: showLine=${actualShowLine}, lineSize=${actualLineSize}`);
    console.log(`  匹配: ${actualShowLine === config.expected.showLine && actualLineSize === config.expected.lineSize}`);
    console.log("---");
  });

  return configurations;
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  console.log("=== 线段绘制功能测试 ===\n");
  testLineDrawing();
  console.log("\n=== 线段配置测试 ===\n");
  testLineConfigurations();
}
