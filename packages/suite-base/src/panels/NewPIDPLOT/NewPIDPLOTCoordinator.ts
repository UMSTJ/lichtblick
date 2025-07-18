// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { EventEmitter } from "events";

import { OffscreenCanvasRenderer } from "@lichtblick/suite-base/panels/Plot/OffscreenCanvasRenderer";
import { NewPIDPLOTConfig } from "./config";
import { TimestampDatasetsBuilder } from "@lichtblick/suite-base/panels/Plot/builders/TimestampDatasetsBuilder";
import { UpdateAction, ReferenceLine } from "@lichtblick/suite-base/panels/Plot/types";

export class NewPIDPLOTCoordinator extends EventEmitter {
  private renderer: OffscreenCanvasRenderer;
  private datasetsBuilder: TimestampDatasetsBuilder;
  private size: { width: number; height: number } = { width: 0, height: 0 };
  private config: NewPIDPLOTConfig | undefined;

  constructor(renderer: OffscreenCanvasRenderer, datasetsBuilder: TimestampDatasetsBuilder) {
    super();
    this.renderer = renderer;
    this.datasetsBuilder = datasetsBuilder;
  }

  setSize(size: { width: number; height: number }): void {
    this.size = size;
    this.update();
  }

  setShouldSync(_shouldSync: { shouldSync: boolean }): void {
  }

  handleConfig(config: NewPIDPLOTConfig, _themeMode: string, _globalVariables: Record<string, any>): void {
    // 处理配置更新
    console.log("处理配置:", config);
    console.log("Y轴范围:", { minYValue: config.minYValue, maxYValue: config.maxYValue });
    this.config = config;
    this.update();
  }

  handlePlayerState(playerState: any): void {
    // 处理播放器状态更新
    console.log("处理播放器状态:", playerState);

    // 检查接收到的消息
    if (playerState?.activeData?.messages) {
      console.log(`[NewPIDPLOT] 接收到 ${playerState.activeData.messages.length} 条消息:`);
      playerState.activeData.messages.forEach((msg: any, index: number) => {
        console.log(`[NewPIDPLOT] 消息 ${index}: 话题=${msg.topic}, 数据=`, msg.message);

        // 特别检查 /cmd_vel_chassis 话题的数据
        if (msg.topic === '/cmd_vel_chassis') {
          console.log(`[NewPIDPLOT] /cmd_vel_chassis 详细数据:`, {
            linear: msg.message?.linear,
            angular: msg.message?.angular,
            'linear.x': msg.message?.linear?.x,
            'linear.y': msg.message?.linear?.y,
            'linear.z': msg.message?.linear?.z,
            receiveTime: msg.receiveTime,
            startTime: playerState.activeData.startTime,
          });

          // 测试数据提取
          const { parseMessagePath } = require("@lichtblick/message-path");
          const { simpleGetMessagePathDataItems } = require("@lichtblick/suite-base/components/MessagePathSyntax/simpleGetMessagePathDataItems");
          const { isChartValue, getChartValue } = require("@lichtblick/suite-base/panels/Plot/utils/datum");

          const path = parseMessagePath('/cmd_vel_chassis.linear.x');
          if (path) {
            const items = simpleGetMessagePathDataItems(msg, path);
            console.log(`[NewPIDPLOT] 路径解析结果:`, {
              path: '/cmd_vel_chassis.linear.x',
              parsedPath: path,
              extractedItems: items,
              isChartValue: items.map((item: any) => isChartValue(item)),
              chartValues: items.map((item: any) => getChartValue(item)),
            });
          }
        }
      });
    }

    // 将播放器状态传递给数据集构建器
    const result = this.datasetsBuilder.handlePlayerState(playerState);
    console.log("数据集构建器结果:", result);

    this.update();
  }

    private async update(): Promise<void> {
    // 更新绘图
    if (this.size.width > 0 && this.size.height > 0) {
      try {
        // 根据配置设置坐标轴范围
        // X轴：从配置的minXValue开始，不设置上限，允许无限扩展
        const xBounds = {
          min: this.config?.minXValue ?? 0,
          max: undefined, // 不设置上限，允许无限扩展
        };

        // 处理Y轴值，确保转换为数字类型
        const minYValue = typeof this.config?.minYValue === 'string'
          ? parseFloat(this.config.minYValue)
          : this.config?.minYValue;
        const maxYValue = typeof this.config?.maxYValue === 'string'
          ? parseFloat(this.config.maxYValue)
          : this.config?.maxYValue;

        const yBounds = {
          min: minYValue ?? -16,
          max: maxYValue ?? 16,
        };

        console.log("设置的Y轴范围:", yBounds);

        // 设置参考线：只显示y=0参考线（水平线）
        // x=0参考线通过设置xBounds.min=0来实现
        const referenceLines: ReferenceLine[] = [
          { color: "#666666", value: 0 }, // y=0参考线（水平线）
        ];

        const updateAction: UpdateAction = {
          type: "update",
          size: this.size,
          showXAxisLabels: this.config?.showXAxisLabels ?? true,
          showYAxisLabels: this.config?.showYAxisLabels ?? true,
          xBounds,
          yBounds,
          referenceLines,
        };

        await this.renderer.update(updateAction);

        // 获取数据集并更新渲染器
        const viewport = {
          size: this.size,
          bounds: {
            x: xBounds,
            y: yBounds,
          },
        };

        const result = await this.datasetsBuilder.getViewportDatasets(viewport);
        const datasets = result.datasetsByConfigIndex.filter((dataset): dataset is NonNullable<typeof dataset> => dataset !== undefined);
        await this.renderer.updateDatasets(datasets);
      } catch (error) {
        console.error("更新绘图失败:", error);
      }
    }
  }

  destroy(): void {
    this.removeAllListeners();
    // renderer没有destroy方法，所以这里不需要调用
  }
}
