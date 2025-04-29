// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import Hammer from "hammerjs";
import { useEffect } from "react";

import { PIDPlotCoordinator } from "@lichtblick/suite-base/panels/PIDPlot/PIDPlotCoordinator";

const usePanning = (
  canvasDiv: HTMLDivElement | ReactNull,
  coordinator: PIDPlotCoordinator | undefined,
  draggingRef: React.MutableRefObject<boolean>,
): void => {
  useEffect(() => {
    if (!canvasDiv || !coordinator) {
      return;
    }

    const hammerManager = new Hammer.Manager(canvasDiv);
    const threshold = 10;
    hammerManager.add(new Hammer.Pan({ threshold }));

    hammerManager.on("panstart", (event) => {
      draggingRef.current = true;
      const boundingRect = event.target.getBoundingClientRect();
      coordinator.addInteractionEvent({
        type: "panstart",
        cancelable: false,
        deltaY: event.deltaY,
        deltaX: event.deltaX,
        center: {
          x: event.center.x,
          y: event.center.y,
        },
        boundingClientRect: boundingRect.toJSON(),
      });
    });

    hammerManager.on("panmove", (event) => {
      // 只有在水平方向移动时才会触发逻辑
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        const boundingRect = event.target.getBoundingClientRect();
        coordinator.addInteractionEvent({
          type: "panmove",
          cancelable: false,
          deltaY: event.deltaY,
          deltaX: event.deltaX,
          boundingClientRect: boundingRect.toJSON(),
        });
      }
    });

    hammerManager.on("panend", (event) => {
      const boundingRect = event.target.getBoundingClientRect();
      coordinator.addInteractionEvent({
        type: "panend",
        cancelable: false,
        deltaY: event.deltaY,
        deltaX: event.deltaX,
        boundingClientRect: boundingRect.toJSON(),
      });

      setTimeout(() => {
        draggingRef.current = false;
      }, 0);
    });

    return () => {
      hammerManager.destroy();
    };
  }, [canvasDiv, coordinator, draggingRef]);
};

export default usePanning;
