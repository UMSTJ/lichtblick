// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import Panel from "@lichtblick/suite-base/components/Panel";
import DiagnosticSummary from "@lichtblick/suite-base/panels/DiagnosticSummary/DiagnosticSummary";
import { DEFAULT_CONFIG } from "@lichtblick/suite-base/panels/DiagnosticSummary/constants";

export default Panel(
  Object.assign(DiagnosticSummary, {
    panelType: "DiagnosticSummary",
    defaultConfig: DEFAULT_CONFIG,
  }),
);
