// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as _ from "lodash-es";
import { useEffect } from "react";
import { useDebounce } from "use-debounce";

import { useDeepMemo } from "@lichtblick/hooks";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import { EventsStore, useEvents } from "@lichtblick/suite-base/context/EventsContext";
import { PLAYER_CAPABILITIES } from "@lichtblick/suite-base/players/constants";
import { AppURLState, updateAppURLState } from "@lichtblick/suite-base/util/appURLState";

const selectCanSeek = (ctx: MessagePipelineContext) =>
  ctx.playerState.capabilities.includes(PLAYER_CAPABILITIES.playbackControl);
const selectCurrentTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.currentTime;
const selectUrlState = (ctx: MessagePipelineContext) => ctx.playerState.urlState;
const selectSelectedEventId = (store: EventsStore) => store.selectedEventId;

function updateUrl(newState: AppURLState) {
  const newStateUrl = updateAppURLState(new URL(window.location.href), newState);
  window.history.replaceState(undefined, "", decodeURIComponent(newStateUrl.href));
}

/**
 * Syncs our current player state and time with the URL in the address bar.
 */
export function useStateToURLSynchronization(): void {
  const playerUrlState = useMessagePipeline(selectUrlState);
  const stablePlayerUrlState = useDeepMemo(playerUrlState);
  const canSeek = useMessagePipeline(selectCanSeek);
  const currentTime = useMessagePipeline(selectCurrentTime);
  const [debouncedCurrentTime] = useDebounce(currentTime, 500, { maxWait: 500 });
  const selectedEventId = useEvents(selectSelectedEventId);

  // Sync current time with the url.
  useEffect(() => {
    updateUrl({
      time: canSeek ? debouncedCurrentTime : undefined,
    });
  }, [canSeek, debouncedCurrentTime]);

  // Sync player state with the url.
  useEffect(() => {
    if (stablePlayerUrlState == undefined) {
      return;
    }

    updateUrl({
      ds: stablePlayerUrlState.sourceId,
      dsParams: _.pickBy(
        {
          ...stablePlayerUrlState.parameters,
          eventId: selectedEventId,
        },
        _.isString,
      ),
      dsParamsArray: _.pickBy(
        stablePlayerUrlState.parameters,

        _.isArray,
      ),
    });
  }, [selectedEventId, stablePlayerUrlState]);
}
