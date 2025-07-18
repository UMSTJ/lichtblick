// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { StatusLevel } from "@foxglove/ws-protocol";

import { PlayerAlert } from "@lichtblick/suite-base/players/types";

export function dataTypeToFullName(dataType: string): string {
  const parts = dataType.split("/");
  if (parts.length === 2) {
    return `${parts[0]}/msg/${parts[1]}`;
  }
  return dataType;
}

export function statusLevelToAlertSeverity(level: StatusLevel): PlayerAlert["severity"] {
  if (level === StatusLevel.INFO) {
    return "info";
  } else if (level === StatusLevel.WARNING) {
    return "warn";
  } else {
    return "error";
  }
}
