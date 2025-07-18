// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { useMemo, useEffect } from "react";

import { parseMessagePath } from "@lichtblick/message-path";
import { fillInGlobalVariablesInPath } from "@lichtblick/suite-base/components/MessagePathSyntax/useCachedGetMessagePathDataItems";
import { NewPIDPLOTConfig } from "../config";
import { TimestampDatasetsBuilder } from "@lichtblick/suite-base/panels/Plot/builders/TimestampDatasetsBuilder";
import { getLineColor } from "@lichtblick/suite-base/util/plotColors";
import { SeriesConfigKey } from "@lichtblick/suite-base/panels/Plot/builders/IDatasetsBuilder";

export default function useNewPIDPLOTDataHandling(
  config: NewPIDPLOTConfig,
  globalVariables: Record<string, any>,
) {
  const datasetsBuilder = useMemo(() => {
    return new TimestampDatasetsBuilder();
  }, []);

  // 处理路径配置，包括线段设置
  useEffect(() => {
    console.log(`[NewPIDPLOT] 处理路径配置:`, config.paths);

    const seriesItems = config.paths
      .map((path, index) => {
        const parsed = parseMessagePath(path.value);
        if (!parsed) {
          console.warn(`[NewPIDPLOT] 无法解析路径: ${path.value}`);
          return null;
        }

        const filledPath = fillInGlobalVariablesInPath(parsed, globalVariables);
        const color = getLineColor(path.color, index);

        console.log(`[NewPIDPLOT] 路径 ${index}: ${path.value} -> 话题: ${filledPath.topicName}, 字段: ${filledPath.messagePath.map(p => p.type === 'name' ? p.name : p.type).join('.')}`);

        return {
          key: `${path.value}-${index}` as SeriesConfigKey,
          configIndex: index,
          messagePath: path.value,
          parsed: filledPath,
          color,
          contrastColor: color, // 可以设置为不同的对比色
          timestampMethod: path.timestampMethod,
          showLine: path.showLine ?? true, // 默认显示线段
          lineSize: path.lineSize ?? 2, // 默认线宽为2
          enabled: path.enabled,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    console.log(`[NewPIDPLOT] 设置系列配置:`, seriesItems);
    datasetsBuilder.setSeries(seriesItems);
  }, [config.paths, globalVariables, datasetsBuilder]);

  const colorsByDatasetIndex = useMemo(() => {
    const colors: Record<string, string> = {};
    config.paths.forEach((path, index) => {
      colors[index] = getLineColor(path.color, index);
    });
    return colors;
  }, [config.paths]);

  const labelsByDatasetIndex = useMemo(() => {
    const labels: Record<string, string> = {};
    config.paths.forEach((path, index) => {
      labels[index] = path.label || path.value || `Series ${index + 1}`;
    });
    return labels;
  }, [config.paths]);

  return {
    colorsByDatasetIndex,
    labelsByDatasetIndex,
    datasetsBuilder,
  };
}
