// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { Time } from "@lichtblick/suite";

export type BroadcastMessageEvent = { type: "play" | "pause" | "seek" | "playUntil"; time: Time };

export type ChannelListeners = Set<(message: BroadcastMessageEvent) => void>;
