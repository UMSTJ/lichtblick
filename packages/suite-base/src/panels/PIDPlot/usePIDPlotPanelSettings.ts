// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { produce } from "immer";
import * as _ from "lodash-es";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ParameterValue, SettingsTreeAction, SettingsTreeActionUpdatePayload } from "@lichtblick/suite";
import { DEFAULT_PIDLINEPLOT_PATH, DEFAULT_PIDPLOT_PATH } from "@lichtblick/suite-base/panels/Plot/constants";
import { buildSettingsTree } from "@lichtblick/suite-base/panels/PIDPlot/buildSettingsTree";
import { usePanelSettingsTreeUpdate } from "@lichtblick/suite-base/providers/PanelStateContextProvider";
import { SaveConfig } from "@lichtblick/suite-base/types/panels";

import { PIDPlotConfig, PlotLegendDisplay } from "@lichtblick/suite-base/panels/Plot/utils/config";


export type HandleAction = {
  draft: PIDPlotConfig;
  setParameters?: (key: string, value: ParameterValue) => void,
};


export type HandleDeleteSeriesAction = HandleAction & {
  index: number;
};

export type HandleUpdateAction = HandleAction & Omit<SettingsTreeActionUpdatePayload, "input">;

export function handleUpdateAction({ draft, path, value, setParameters}: HandleUpdateAction): void {
  console.log("handleUpdateAction", draft,path, value);
  if(path[0] === "pidline"){

    // if (draft.pidline.length === 0) {
    //   console.log("现在插入")
    //   draft.pidline.push({ ...DEFAULT_PIDLINEPLOT_PATH });
    // }
    if (path[2] === "kp"){
      // console.log("更新参数")
      console.log("更新参数",value)
      console.log(typeof setParameters); // 应该是 "function"

      // 发送更新请求
      setParameters?.("/ums_fiction_driver_node.KP", value);
    }
    if (path[2] === "ki"){
      setParameters?.("/ums_fiction_driver_node.KI", value);
    }
    if (path[2] === "kd"){
      setParameters?.("/ums_fiction_driver_node.KD", value);
    }
    _.set(draft, path, value);
  }
  else if (_.isEqual(path, ["legend", "legendDisplay"])) {
    draft.legendDisplay = value as PlotLegendDisplay;
    draft.showLegend = true;
  } else if (_.isEqual(path, ["xAxis", "xAxisPath"])) {
    console.log("handleUpdateAction", path, value)
    _.set(draft, ["xAxisPath", "value"], value);
  } else {
    _.set(draft, path.slice(1), value);

    // X min/max and following width are mutually exclusive.
    if (path[1] === "followingViewWidth") {
      draft.minXValue = undefined;
      draft.maxXValue = undefined;
    } else if (path[1] === "minXValue" || path[1] === "maxXValue") {
      draft.followingViewWidth = undefined;
    }
  }
}

export function handleAddSeriesAction({ draft }: HandleAction): void {
  draft.paths.push({ ...DEFAULT_PIDPLOT_PATH });
}
// export function handleAddPIDSeriesAction({ draft }: HandleAction): void {
//   draft.pidline.push({ ...DEFAULT_PIDLINEPLOT_PATH });
// }

export function handleDeleteSeriesAction({ draft, index }: HandleDeleteSeriesAction): void {
  draft.paths.splice(Number(index), 1);
}
export function handleDeletePIDSeriesAction({ draft, index }: HandleDeleteSeriesAction): void {
  draft.pidline.splice(Number(index), 1);
}

export default function usePlotPanelSettings(
  config: PIDPlotConfig,
  saveConfig: SaveConfig<PIDPlotConfig>,
  focusedPath?: string[] | undefined,
  setParameters?: (key: string, value: ParameterValue) => void,
): void {
  const updatePanelSettingsTree = usePanelSettingsTreeUpdate();
  const { t } = useTranslation("plot");

  const actionHandler = useCallback(
    ({ action, payload }: SettingsTreeAction) => {
      console.log("actionHandler", action, payload);
      if (action === "update") {
        const { path, value } = payload;

        saveConfig(
          produce((draft: PIDPlotConfig) => {
            handleUpdateAction({ draft, path, value, setParameters });
          }),
        );
      }
      // else if (payload.id === "add-series") {
      //   saveConfig(
      //     produce<PIDPlotConfig>((draft: PIDPlotConfig) => {
      //       handleAddSeriesAction({ draft });
      //     }),
      //   );
      // } else if (payload.id === "delete-series") {
      //   saveConfig(
      //     produce<PIDPlotConfig>((draft) => {
      //       handleDeleteSeriesAction({ draft, index: Number(payload.path[1]) });
      //     }),
      //   );
      // }
      // else if (payload.id === "add-pidseries") {
      //   saveConfig(
      //     produce<PIDPlotConfig>((draft: PIDPlotConfig) => {
      //       handleAddPIDSeriesAction({ draft });
      //     }),
      //   );
      // } else if (payload.id === "delete-pidseries") {
      //   saveConfig(
      //     produce<PIDPlotConfig>((draft) => {
      //       handleDeletePIDSeriesAction({ draft, index: Number(payload.path[1]) });
      //     }),
      //   );
      // }
    },
    [saveConfig],
  );

  useEffect(() => {
    updatePanelSettingsTree({
      actionHandler,
      focusedPath,
      nodes: buildSettingsTree(config, t),
    });
  }, [actionHandler, config, focusedPath, updatePanelSettingsTree, t]);
}
