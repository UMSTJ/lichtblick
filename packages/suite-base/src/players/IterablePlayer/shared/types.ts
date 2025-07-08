// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import {
  IIterableSource,
  Initialization,
} from "@lichtblick/suite-base/players/IterablePlayer/IIterableSource";

export type MultiSource = { type: "files"; files: Blob[] } | { type: "urls"; urls: string[] };

export type IterableSourceConstructor<T extends IIterableSource, P> = new (args: P) => T;

export type InitMetadata = Initialization["metadata"];

export type InitTopicStatsMap = Initialization["topicStats"];
