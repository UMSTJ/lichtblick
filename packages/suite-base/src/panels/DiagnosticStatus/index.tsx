// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import Panel from "@lichtblick/suite-base/components/Panel";
import DiagnosticStatusPanel from "@lichtblick/suite-base/panels/DiagnosticStatus/DiagnosticStatusPanel";
import { DEFAULT_CONFIG } from "@lichtblick/suite-base/panels/DiagnosticStatus/constants";

// Diagnostic - Detail
export default Panel(
  Object.assign(DiagnosticStatusPanel, {
    panelType: "DiagnosticStatusPanel",
    defaultConfig: DEFAULT_CONFIG,
  }),
);
