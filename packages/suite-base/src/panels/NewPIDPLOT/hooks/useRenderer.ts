// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { useEffect, useState } from "react";
import { OffscreenCanvasRenderer } from "@lichtblick/suite-base/panels/Plot/OffscreenCanvasRenderer";

export default function useRenderer(
  canvasDiv: HTMLDivElement | ReactNull,
  theme: any,
): OffscreenCanvasRenderer | undefined {
  const [renderer, setRenderer] = useState<OffscreenCanvasRenderer | undefined>(undefined);

  useEffect(() => {
    if (!canvasDiv) {
      return;
    }

    const canvas = canvasDiv.querySelector("canvas");
    if (!canvas) {
      return;
    }

    const offscreenCanvas = canvas.transferControlToOffscreen();
    const newRenderer = new OffscreenCanvasRenderer(offscreenCanvas, theme);

    setRenderer(newRenderer);

    return () => {
      // renderer没有destroy方法，所以这里不需要调用
    };
  }, [canvasDiv, theme]);

  return renderer;
}
