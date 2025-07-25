// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useEffect } from "react";

import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";

const selectPlayerName = (ctx: MessagePipelineContext) => ctx.playerState.name;

/**
 * DocumentTitleAdapter sets the document title based on the currently selected player
 */
export default function DocumentTitleAdapter(): React.JSX.Element {
  const playerName = useMessagePipeline(selectPlayerName);

  useEffect(() => {
    if (!playerName) {
      window.document.title = "Autotblick";
      return;
    }
    window.document.title = navigator.userAgent.includes("Mac")
      ? playerName
      : `${playerName} – Autotblick`;
  }, [playerName]);

  return <></>;
}
