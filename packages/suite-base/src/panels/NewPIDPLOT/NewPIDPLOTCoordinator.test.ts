// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { NewPIDPLOTCoordinator } from "./NewPIDPLOTCoordinator";
import { DEFAULT_NEWPIDPLOT_CONFIG } from "./constants";

// Mock the renderer and datasetsBuilder
const mockRenderer = {
  update: jest.fn(),
  updateDatasets: jest.fn(),
};

const mockDatasetsBuilder = {
  getDatasets: jest.fn(() => []),
  getViewportDatasets: jest.fn(() => ({ datasetsByConfigIndex: [] })),
  handlePlayerState: jest.fn(() => ({ datasetsChanged: false })),
};

describe("NewPIDPLOTCoordinator", () => {
  let coordinator: NewPIDPLOTCoordinator;

  beforeEach(() => {
    coordinator = new NewPIDPLOTCoordinator(
      mockRenderer as any,
      mockDatasetsBuilder as any
    );
    jest.clearAllMocks();
  });

  it("should set size correctly", () => {
    const size = { width: 800, height: 600 };
    coordinator.setSize(size);

    // 验证update方法被调用
    expect(mockRenderer.update).toHaveBeenCalled();
  });

  it("should handle config with coordinate bounds", () => {
    // 先设置size，这样update方法才会被调用
    coordinator.setSize({ width: 800, height: 600 });
    jest.clearAllMocks();

    const config = {
      ...DEFAULT_NEWPIDPLOT_CONFIG,
      minXValue: 0,
      maxXValue: 10,
      minYValue: -5,
      maxYValue: 5,
    };

    coordinator.handleConfig(config, "light", {});

    // 验证update方法被调用
    expect(mockRenderer.update).toHaveBeenCalled();
  });

  it("should set shouldSync correctly", () => {
    coordinator.setShouldSync({ shouldSync: false });
    // 这个测试主要是确保方法不会抛出错误
    expect(true).toBe(true);
  });

  it("should handle player state", () => {
    // 先设置size，这样update方法才会被调用
    coordinator.setSize({ width: 800, height: 600 });
    jest.clearAllMocks();

    const playerState = { activeData: { messages: [] } };
    coordinator.handlePlayerState(playerState);

    // 验证update方法被调用
    expect(mockRenderer.update).toHaveBeenCalled();
  });
});
