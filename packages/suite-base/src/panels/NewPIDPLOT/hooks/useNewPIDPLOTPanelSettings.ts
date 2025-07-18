// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { useEffect } from "react";

import { NewPIDPLOTConfig } from "../config";

export default function useNewPIDPLOTPanelSettings(
  config: NewPIDPLOTConfig,
  _saveConfig: (config: Partial<NewPIDPLOTConfig>) => void,
  focusedPath: string[] | undefined,
): void {
  useEffect(() => {
    // 处理面板设置相关的逻辑
    console.log("面板设置更新:", config);
  }, [config, focusedPath]);
}
