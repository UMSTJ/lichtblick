// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0
import { IndicatorConfig } from "./types";

export const DEFAULT_CONFIG: IndicatorConfig = {
  path: "",
  style: "bulb",
  fallbackColor: "#a0a0a0",
  fallbackLabel: "False",
  rules: [{ operator: "=", rawValue: "true", color: "#68e24a", label: "True" }],
};
