// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { compare, Time } from "@lichtblick/rostime";
import { LEVELS } from "@lichtblick/suite-base/panels/DiagnosticSummary/constants";
import { UseDiagnosticsResult } from "@lichtblick/suite-base/panels/DiagnosticSummary/hooks/useDiagnostics";
import { DiagnosticsById } from "@lichtblick/suite-base/panels/DiagnosticSummary/types";

export function getDiagnosticsWithStales(
  diagnosticsByHardwareId: UseDiagnosticsResult | undefined,
  staleTime: Time,
): UseDiagnosticsResult {
  const ret = new Map<string, DiagnosticsById>();

  if (!diagnosticsByHardwareId) {
    return ret;
  }

  for (const [hardwareId, diagnosticsByName] of diagnosticsByHardwareId) {
    const newDiagnosticsByName: DiagnosticsById = new Map();
    ret.set(hardwareId, newDiagnosticsByName);

    for (const [name, diagnostic] of diagnosticsByName) {
      const markStale = compare(diagnostic.stamp, staleTime) < 0;
      const level = markStale ? LEVELS.STALE : diagnostic.status.level;
      newDiagnosticsByName.set(name, { ...diagnostic, status: { ...diagnostic.status, level } });
    }
  }

  return ret;
}
