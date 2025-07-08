// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { DISPLAY_EMPTY_STATE } from "@lichtblick/suite-base/panels/DiagnosticStatus/constants";

export function getDisplayName(hardwareId: string, name: string): string {
  if (name && hardwareId) {
    return `${hardwareId}: ${name}`;
  }
  if (name) {
    return name;
  }
  if (hardwareId) {
    return hardwareId;
  }

  return DISPLAY_EMPTY_STATE;
}
