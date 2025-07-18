// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Immutable } from "@lichtblick/suite";
import { MessageEvent } from "@lichtblick/suite-base/players/types";
import { PANEL_TITLE_CONFIG_KEY } from "@lichtblick/suite-base/util/layout";
import { TimestampMethod } from "@lichtblick/suite-base/util/time";

export type Messages = Record<string, MessageEvent[]>;

export type BasePlotPath = {
  value: string;
  enabled: boolean;
};

export type PlotPath = BasePlotPath & {
  color?: string;
  label?: string;
  timestampMethod: TimestampMethod;
  showLine?: boolean;
  lineSize?: number;
};

export type PIDParameterPath = BasePlotPath & {
  color?: string;
  label?: string;
  timestampMethod: TimestampMethod;
  showLine?: boolean;
  lineSize?: number;
  parameterType: "kp" | "ki" | "kd" | "setpoint" | "feedback" | "output";
  rosParameter?: string; // ROS参数名称，用于读取和修改参数
};

export type PlotXAxisVal =
  | "timestamp"
  | "index"
  | "custom"
  | "currentCustom";

/**
 * A "reference line" plot path is a numeric value. It creates a horizontal line on the plot at the
 * specified value.
 * @returns true if the series config is a reference line
 */
export function isReferenceLinePlotPathType(path: Immutable<PlotPath>): boolean {
  return !isNaN(Number.parseFloat(path.value));
}

/**
 * Coalesces null, undefined and empty string to undefined.
 */
function presence<T>(value: undefined | T): undefined | T {
  if (value === "") {
    return undefined;
  }

  return value ?? undefined;
}

export function plotPathDisplayName(path: Readonly<PlotPath>, index: number): string {
  return presence(path.label) ?? presence(path.value) ?? `Series ${index + 1}`;
}

type DeprecatedPlotConfig = {
  showSidebar?: boolean;
  sidebarWidth?: number;
};

export type PlotLegendDisplay = "floating" | "top" | "left" | "none";

export type NewPIDPLOTConfig = DeprecatedPlotConfig & {
  paths: PIDParameterPath[];
  minXValue?: number;
  maxXValue?: number;
  minYValue?: string | number;
  maxYValue?: string | number;
  showLegend: boolean;
  legendDisplay: PlotLegendDisplay;
  showPlotValuesInLegend: boolean;
  showXAxisLabels: boolean;
  showYAxisLabels: boolean;
  isSynced: boolean;
  xAxisVal: PlotXAxisVal;
  xAxisPath?: BasePlotPath;
  followingViewWidth?: number;
  sidebarDimension: number;
  [PANEL_TITLE_CONFIG_KEY]?: string;
  // PID控制参数
  pidParameters: {
    kp: number;
    ki: number;
    kd: number;
    rosParameterPrefix?: string; // ROS参数前缀，如 "/pid_controller/"
  };
  // 参数设置面板配置
  showParameterPanel: boolean;
  parameterPanelPosition: "left" | "right";
};
