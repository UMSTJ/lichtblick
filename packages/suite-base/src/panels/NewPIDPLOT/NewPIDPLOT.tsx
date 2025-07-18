// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Fade, useTheme, Typography } from "@mui/material";
import * as _ from "lodash-es";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";

import { Immutable } from "@lichtblick/suite";
import KeyListener from "@lichtblick/suite-base/components/KeyListener";
import {
  useMessagePipelineGetter,
  useMessagePipelineSubscribe,
} from "@lichtblick/suite-base/components/MessagePipeline";
import { usePanelContext } from "@lichtblick/suite-base/components/PanelContext";
import { PanelContextMenu } from "@lichtblick/suite-base/components/PanelContextMenu";
import PanelToolbar from "@lichtblick/suite-base/components/PanelToolbar";
import Stack from "@lichtblick/suite-base/components/Stack";
import TimeBasedChartTooltipContent from "@lichtblick/suite-base/components/TimeBasedChart/TimeBasedChartTooltipContent";
import useGlobalVariables from "@lichtblick/suite-base/hooks/useGlobalVariables";
import usePanning from "@lichtblick/suite-base/panels/Plot/hooks/usePanning";
import { TooltipStateSetter } from "@lichtblick/suite-base/panels/Plot/types";

import { NewPIDPLOTConfig } from "./config";
import { useStyles } from "./NewPIDPLOT.style";
import { NewPIDPLOTCoordinator } from "./NewPIDPLOTCoordinator";
import { NewPIDPLOTLegend } from "./NewPIDPLOTLegend";
import { PIDParameterPanel } from "./PIDParameterPanel";
import useGlobalSync from "./hooks/useGlobalSync";
import useNewPIDPLOTDataHandling from "./hooks/useNewPIDPLOTDataHandling";
import useNewPIDPLOTPanelSettings from "./hooks/useNewPIDPLOTPanelSettings";
import useRenderer from "./hooks/useRenderer";
import useSubscriptions from "./hooks/useSubscriptions";

export type NewPIDPLOTProps = {
  config: NewPIDPLOTConfig;
  saveConfig: (config: Partial<NewPIDPLOTConfig>) => void;
};

const NewPIDPLOT = (props: NewPIDPLOTProps): React.JSX.Element => {
  const { saveConfig, config } = props;
  // 这段代码是从config对象中解构出多个配置项，并为部分项设置了默认值
  // paths被重命名为series，表示要绘制的曲线（PID参数路径）数组
  // showLegend：是否显示图例
  // xAxisVal被重命名为xAxisMode，表示X轴的取值方式（如时间戳等）
  // legendDisplay：图例的显示方式，优先取config.showSidebar为true时为"left"，否则为"floating"
  // sidebarDimension：侧边栏宽度，优先取config.sidebarWidth，否则用默认宽度DEFAULT_SIDEBAR_DIMENSION
  // showParameterPanel：是否显示PID参数面板，默认true
  // parameterPanelPosition：参数面板的位置，默认"right"
  const {
    showLegend,
    legendDisplay = config.showSidebar === true ? "left" : "floating",
    showParameterPanel = true,
    parameterPanelPosition = "right",
  } = config;

  const { classes } = useStyles();
  const theme = useTheme();
  const { t } = useTranslation("plot");

  const { setMessagePathDropConfig } = usePanelContext();
  const draggingRef = useRef(false);

  // When true the user can reset the plot back to the original view
  const [, setCanReset] = useState(false);

  const [activeTooltip, setActiveTooltip] = useState<TooltipStateSetter>();

  const [subscriberId] = useState(() => uuidv4());
  const [canvasDiv, setCanvasDiv] = useState<HTMLDivElement | ReactNull>(ReactNull);
  const [coordinator, setCoordinator] = useState<NewPIDPLOTCoordinator | undefined>(undefined);
  const shouldSync = config.isSynced;
  const renderer = useRenderer(canvasDiv, theme);
  const { globalVariables } = useGlobalVariables();
  const getMessagePipelineState = useMessagePipelineGetter();
  const subscribeMessagePipeline = useMessagePipelineSubscribe();

  const {
    onMouseMove,
    onMouseOut,
    onWheel,
    onClick,
    onClickPath,
    focusedPath,
    keyDownHandlers,
    keyUphandlers,
    getPanelContextMenuItems,
  } = useNewPIDPLOTInteractionHandlers({
    config,
    coordinator,
    draggingRef,
    setActiveTooltip,
    renderer,
    shouldSync,
    subscriberId,
  });

  useNewPIDPLOTPanelSettings(config, saveConfig, focusedPath);
  useSubscriptions(config, subscriberId);
  // 由于 useGlobalSync 需要的是 PlotCoordinator 类型，但这里传入的是 NewPIDPLOTCoordinator，类型不兼容
  // 解决方法：仅在 coordinator 存在且类型断言为 any 时调用，或根据实际需要调整类型
  useGlobalSync(coordinator as any, setCanReset, { shouldSync }, subscriberId);
  usePanning(canvasDiv, coordinator as any, draggingRef);
  const { colorsByDatasetIndex, labelsByDatasetIndex, datasetsBuilder } = useNewPIDPLOTDataHandling(
    config,
    globalVariables,
  );

  useEffect(() => {
    setMessagePathDropConfig({
      getDropStatus(paths) {
        if (paths.some((path) => !path.isLeaf)) {
          return { canDrop: false };
        }
        return { canDrop: true, effect: "add" };
      },
      handleDrop(paths) {
        saveConfig({
          paths: [
            ...config.paths,
            ...paths.map((path) => ({
              value: path.path,
              enabled: true,
              timestampMethod: "receiveTime" as const,
              parameterType: "setpoint" as const,
            })),
          ],
        });
      },
    });
  }, [saveConfig, setMessagePathDropConfig, config.paths]);

  useEffect(() => {
    coordinator?.handleConfig(config, theme.palette.mode, globalVariables);
  }, [coordinator, config, globalVariables, theme.palette.mode]);

  // This effect must come after the one above it so the coordinator gets the latest config before
  // the latest player state and can properly initialize if the player state already contains the
  // data for display.
  useEffect(() => {
    if (!coordinator) {
      return;
    }

    const unsub = subscribeMessagePipeline((state) => {
      coordinator.handlePlayerState(state.playerState);
    });

    // Subscribing only gets us _new_ updates, so we feed the latest state into the chart
    coordinator.handlePlayerState(getMessagePipelineState().playerState);
    return unsub;
  }, [coordinator, getMessagePipelineState, subscribeMessagePipeline]);

  useEffect(() => {
    if (coordinator) {
      coordinator.setShouldSync({ shouldSync });
    }
  }, [coordinator, shouldSync]);

  useEffect(() => {
    if (!renderer || !canvasDiv) {
      return;
    }

    const contentRect = canvasDiv.getBoundingClientRect();

    const plotCoordinator = new NewPIDPLOTCoordinator(renderer, datasetsBuilder);
    setCoordinator(plotCoordinator);

    // 立即传递配置和设置大小
    plotCoordinator.handleConfig(config, theme.palette.mode, globalVariables);
    plotCoordinator.setSize({
      width: contentRect.width,
      height: contentRect.height,
    });

    const isCanvasTarget = (entry: Immutable<ResizeObserverEntry>) => entry.target === canvasDiv;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = _.findLast(entries, isCanvasTarget);
      if (entry != undefined) {
        plotCoordinator.setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    resizeObserver.observe(canvasDiv);

    return () => {
      resizeObserver.disconnect();
      plotCoordinator.destroy();
    };
  }, [canvasDiv, datasetsBuilder, renderer]);

  const numSeries = config.paths.length;
  const tooltipContent = useMemo(() => {
    return activeTooltip ? (
      <TimeBasedChartTooltipContent
        content={activeTooltip.data}
        multiDataset={numSeries > 1}
        colorsByConfigIndex={colorsByDatasetIndex}
        labelsByConfigIndex={labelsByDatasetIndex}
      />
    ) : undefined;
  }, [activeTooltip, colorsByDatasetIndex, labelsByDatasetIndex, numSeries]);

  const hoveredValuesBySeriesIndex = useMemo(() => {
    if (!config.showPlotValuesInLegend || !activeTooltip?.data) {
      return {};
    }

    const result: Record<number, string> = {};
    activeTooltip.data.forEach((datum) => {
      if (datum.configIndex != undefined) {
        result[datum.configIndex] = String(datum.value);
      }
    });
    return result;
  }, [activeTooltip?.data, config.showPlotValuesInLegend]);

  const mainContent = (
    <div className={classes.root}>
      <PanelToolbar>
        <Stack direction="row" alignItems="center" flex="auto">
          <Typography variant="body2" color="text.secondary">
            {t("newpidplot.title", "PID控制曲线")}
          </Typography>
        </Stack>
      </PanelToolbar>

      <div className={classes.content}>
        <div
          className={classes.plotContainer}
          ref={setCanvasDiv}
          onMouseMove={onMouseMove}
          onMouseOut={onMouseOut}
          onWheel={onWheel}
          onClick={onClick}
        >
          <canvas className={classes.canvas} />
        </div>

        {showLegend && legendDisplay === "floating" && (
          <Fade in={true} timeout={200}>
            <div className={classes.legend}>
              <NewPIDPLOTLegend
                paths={config.paths}
                onClickPath={onClickPath}
                focusedPath={focusedPath}
                hoveredValuesBySeriesIndex={hoveredValuesBySeriesIndex}
                colorsByDatasetIndex={colorsByDatasetIndex}
                labelsByDatasetIndex={labelsByDatasetIndex}
              />
            </div>
          </Fade>
        )}

        {tooltipContent && (
          <div
            className={classes.tooltip}
            style={{
              left: activeTooltip?.x ?? 0,
              top: activeTooltip?.y ?? 0,
            }}
          >
            {tooltipContent}
          </div>
        )}
      </div>

      <KeyListener global keyDownHandlers={keyDownHandlers} keyUpHandlers={keyUphandlers} />
      <PanelContextMenu getItems={getPanelContextMenuItems} />
    </div>
  );


  // 如果显示参数面板，则包装在布局中
  if (showParameterPanel) {
    return (
      <div className={classes.container}>
        {parameterPanelPosition === "left" && (
          <div className={classes.parameterPanel}>
            <PIDParameterPanel config={config} saveConfig={saveConfig} />
          </div>
        )}
        <div className={classes.mainContent}>
          {mainContent}
        </div>
        {parameterPanelPosition === "right" && (
          <div className={classes.parameterPanel}>
            <PIDParameterPanel config={config} saveConfig={saveConfig} />
          </div>
        )}
      </div>
    );
  }

  return mainContent;
};


const useNewPIDPLOTInteractionHandlers = ({}) => {
  // 临时实现，后续会完善
  return {
    onMouseMove: () => {},
    onMouseOut: () => {},
    onResetView: () => {},
    onWheel: () => {},
    onClick: () => {},
    onClickPath: () => {},
    focusedPath: undefined,
    keyDownHandlers: {},
    keyUphandlers: {},
    getPanelContextMenuItems: () => [],
  };
};

export default NewPIDPLOT;
