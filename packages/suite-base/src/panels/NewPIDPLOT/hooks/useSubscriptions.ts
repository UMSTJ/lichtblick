// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { useCallback, useEffect } from "react";

import { filterMap } from "@lichtblick/den/collection";
import { parseMessagePath } from "@lichtblick/message-path";
import { fillInGlobalVariablesInPath } from "@lichtblick/suite-base/components/MessagePathSyntax/useCachedGetMessagePathDataItems";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import useGlobalVariables from "@lichtblick/suite-base/hooks/useGlobalVariables";
import { SubscriptionPreloadType } from "@lichtblick/suite-base/players/types";

import { NewPIDPLOTConfig } from "../config";
import { pathToSubscribePayload } from "@lichtblick/suite-base/panels/Plot/utils/subscription";

export default function useSubscriptions(config: NewPIDPLOTConfig, subscriberId: string): void {
  const { paths, xAxisVal } = config;
  const { globalVariables } = useGlobalVariables();

  const setSubscriptions = useMessagePipeline(
    useCallback(
      ({ setSubscriptions: pipelineSetSubscriptions }: MessagePipelineContext) =>
        pipelineSetSubscriptions,
      [],
    ),
  );

  // 设置订阅
  useEffect(() => {
    // 对于timestamp模式，使用full预加载类型
    const preloadType: SubscriptionPreloadType = "full";

    const subscriptions = filterMap(paths, (item) => {
      if (!item.enabled) {
        return;
      }

      const parsedPath = parseMessagePath(item.value);
      if (!parsedPath) {
        console.warn(`[NewPIDPLOT] 无法解析路径: ${item.value}`);
        return;
      }

      console.log(`[NewPIDPLOT] 订阅话题: ${item.value} -> ${parsedPath.topicName}`);
      return pathToSubscribePayload(
        fillInGlobalVariablesInPath(parsedPath, globalVariables),
        preloadType,
      );
    });

    console.log(`[NewPIDPLOT] 设置订阅:`, subscriptions);
    setSubscriptions(subscriberId, subscriptions);
  }, [config, xAxisVal, paths, globalVariables, setSubscriptions, subscriberId]);

  // 只在组件卸载时取消订阅
  useEffect(() => {
    return () => {
      setSubscriptions(subscriberId, []);
    };
  }, [subscriberId, setSubscriptions]);
}
