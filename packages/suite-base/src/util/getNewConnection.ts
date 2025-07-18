// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.
import { isOverlapping } from "intervals-fn";

import { Range, isRangeCoveredByRanges, missingRanges } from "./ranges";

// Based on a number of properties this function determines if a new connection should be opened or
// not. It can be used for any type of ranges, be it bytes, timestamps, or something else.
export function getNewConnection(options: {
  currentRemainingRange?: Range; // The remaining range that the current connection (if any) is going to download.
  readRequestRange?: Range; // The range of the read request that we're trying to satisfy.
  downloadedRanges: Range[]; // Array of ranges that have been downloaded already.
  lastResolvedCallbackEnd?: number; // The range.end of the last read request that we resolved. Useful for reading ahead a bit.
  maxRequestSize: number; // The cache size. If equal to or larger than `fileSize` we will attempt to download the whole file.
  fileSize: number; // Size of the file.
  continueDownloadingThreshold: number; // Amount we're willing to wait downloading before opening a new connection.
}): Range | undefined {
  const { readRequestRange, currentRemainingRange, ...otherOptions } = options;
  if (readRequestRange) {
    return getNewConnectionWithExistingReadRequest({
      readRequestRange,
      currentRemainingRange,
      ...otherOptions,
    });
  } else if (!currentRemainingRange) {
    return getNewConnectionWithoutExistingConnection(otherOptions);
  }
  return undefined;
}

function getNewConnectionWithExistingReadRequest({
  currentRemainingRange,
  readRequestRange,
  downloadedRanges,
  maxRequestSize,
  fileSize,
  continueDownloadingThreshold,
}: {
  currentRemainingRange?: Range;
  readRequestRange: Range;
  downloadedRanges: Range[];
  lastResolvedCallbackEnd?: number;
  maxRequestSize: number;
  fileSize: number;
  continueDownloadingThreshold: number;
}): Range | undefined {
  // We have a requested range that we're trying to download.
  if (readRequestRange.end - readRequestRange.start > maxRequestSize) {
    // This should have been caught way earlier, but just as a sanity check.
    throw new Error(
      `Range ${readRequestRange.start}-${readRequestRange.end} exceeds max request size ${maxRequestSize} (file size ${fileSize})`,
    );
  }

  // Get the parts of the requested range that have not been downloaded yet.
  const notDownloadedRanges = missingRanges(readRequestRange, downloadedRanges);

  if (!notDownloadedRanges[0]) {
    // If there aren't any, then we should have never passed in `readRequestRange`.
    throw new Error(
      "Range for the first read request is fully downloaded, so it should have been deleted",
    );
  }

  // We want to start a new connection if:
  const startNewConnection = // 1. There is no current connection.
    !currentRemainingRange || // 2. Or if there is no overlap between the current connection and the requested range.
    !isOverlapping(notDownloadedRanges, [currentRemainingRange]) || // 3. Or if we'll reach the requested range at some point, but that would take too long.
    currentRemainingRange.start + continueDownloadingThreshold < notDownloadedRanges[0].start;

  if (!startNewConnection) {
    return;
  }
  if (maxRequestSize >= fileSize) {
    // If we're trying to download the whole file, read all the way up to the next range that we have already downloaded.
    const range = { start: notDownloadedRanges[0].start, end: fileSize };
    return missingRanges(range, downloadedRanges)[0];
  }

  if (notDownloadedRanges[0].end === readRequestRange.end) {
    // If we're downloading to the end of our range, do some reading ahead while we're at it.
    // Note that we might have already downloaded parts of this range, but we don't know when
    // they get evicted, so for now we just the entire range again.
    return {
      ...notDownloadedRanges[0],
      end: Math.min(readRequestRange.start + maxRequestSize, fileSize),
    };
  }

  // Otherwise, start reading from the first non-downloaded range.
  return notDownloadedRanges[0];
}

function getNewConnectionWithoutExistingConnection({
  downloadedRanges,
  lastResolvedCallbackEnd,
  maxRequestSize,
  fileSize,
}: {
  downloadedRanges: Range[];
  lastResolvedCallbackEnd?: number;
  maxRequestSize: number;
  fileSize: number;
}): Range | undefined {
  // If we don't have any read requests, and we also don't have an active connection, then start
  // reading ahead as much data as we can!
  let readAheadRange: Range | undefined;
  if (maxRequestSize >= fileSize) {
    // If we have an unlimited cache, we want to read the entire file, but still prefer downloading
    // first near where the last request happened.
    const potentialRange = { start: lastResolvedCallbackEnd ?? 0, end: fileSize };
    if (!isRangeCoveredByRanges(potentialRange, downloadedRanges)) {
      readAheadRange = potentialRange;
    } else {
      readAheadRange = { start: 0, end: fileSize };
    }
  } else if (lastResolvedCallbackEnd != undefined) {
    // Otherwise, if we have a limited cache, we want to read the data right after the last
    // read request, because usually read requests are sequential without gaps.
    readAheadRange = {
      start: lastResolvedCallbackEnd,
      end: Math.min(lastResolvedCallbackEnd + maxRequestSize, fileSize),
    };
  }
  if (readAheadRange) {
    // If we have a range that we want to read ahead, then create a new connection for the range
    // within it that has not already been downloaded.
    return missingRanges(readAheadRange, downloadedRanges)[0];
  }
  return undefined;
}
