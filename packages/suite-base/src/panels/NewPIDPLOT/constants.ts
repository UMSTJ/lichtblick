// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { AnnotationOptions } from "chartjs-plugin-annotation";

import { NewPIDPLOTConfig, PIDParameterPath } from "./config";
import { MathFunction } from "@lichtblick/suite-base/panels/Plot/utils/mathFunctions";

export const MATH_FUNCTIONS: { [fn: string]: MathFunction } = {
  abs: Math.abs,
  acos: Math.acos,
  asin: Math.asin,
  atan: Math.atan,
  ceil: Math.ceil,
  cos: Math.cos,
  log: Math.log,
  log1p: Math.log1p,
  log2: Math.log2,
  log10: Math.log10,
  round: Math.round,
  sign: Math.sign,
  sin: Math.sin,
  sqrt: Math.sqrt,
  tan: Math.tan,
  trunc: Math.trunc,
};

export const DEFAULT_SIDEBAR_DIMENSION = 240;

export const DEFAULT_ANNOTATION: AnnotationOptions = {
  type: "line",
  display: true,
  drawTime: "beforeDatasetsDraw",
  scaleID: "y",
  borderWidth: 1,
  borderDash: [5, 5],
};

// 默认PID参数路径配置
export const DEFAULT_PID_PARAMETER_PATHS: PIDParameterPath[] = [
  {
    // value: "/pid_controller/setpoint",
    value: "/cmd_vel_chassis.linear.x",
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
    // value: "/pid_controller/feedback",
    value: "/cmd_vel_chassis.linear.y",
    enabled: true,
    label: "反馈值",
    timestampMethod: "receiveTime",
    parameterType: "feedback",
    rosParameter: "/pid_controller/feedback",
    color: "#00ff00",
    showLine: true,
    lineSize: 2,
  },
  {
    // value: "/pid_controller/output",
    value: "/cmd_vel_chassis.linear.z",
    enabled: true,
    label: "输出值",
    timestampMethod: "receiveTime",
    parameterType: "output",
    rosParameter: "/pid_controller/output",
    color: "#0000ff",
    showLine: true,
    lineSize: 2,
  },
];

export const DEFAULT_NEWPIDPLOT_CONFIG: NewPIDPLOTConfig = {
  paths: DEFAULT_PID_PARAMETER_PATHS,
  minXValue: 0,
  // maxXValue: 10,image.png
  minYValue: -16,
  maxYValue: 16,
  showXAxisLabels: true,
  showYAxisLabels: true,
  showLegend: true,
  legendDisplay: "floating",
  showPlotValuesInLegend: false,
  isSynced: true,
  xAxisVal: "timestamp",
  sidebarDimension: DEFAULT_SIDEBAR_DIMENSION,
  pidParameters: {
    kp: 1.0,
    ki: 0.1,
    kd: 0.01,
    rosParameterPrefix: "/pid_controller/",
  },
  showParameterPanel: true,
  parameterPanelPosition: "right",
};

export const DEFAULT_PLOT_PATH: PIDParameterPath = Object.freeze({
  timestampMethod: "receiveTime",
  value: "",
  enabled: true,
  parameterType: "setpoint",
});
