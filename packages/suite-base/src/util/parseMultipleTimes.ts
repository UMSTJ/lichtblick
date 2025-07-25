// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { fromSec, Time } from "@lichtblick/rostime";
import { parseTimeStr } from "@lichtblick/suite-base/util/formatTime";

export const parseTimestampStr = (timeStr: string): Time | undefined => {
  if (!timeStr.trim()) {
    return undefined;
  } // Handle empty strings explicitly

  const timeNumber = Number(timeStr);

  if (!isNaN(timeNumber)) {
    // If input is a number, assume it's a Unix timestamp in seconds
    return fromSec(timeNumber);
  }

  return parseTimeStr(timeStr);
};
