// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { act } from "@testing-library/react";

import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";

import { useInstallingExtensionsStore } from "./useInstallingExtensionsStore";

describe("useInstallingExtensionsStore", () => {
  afterEach(() => {
    useInstallingExtensionsStore.getState().resetInstallingProgress();
  });

  it("starts installation progress", () => {
    const extensionsNumber = BasicBuilder.number({ min: 0, max: 150 });

    act(() => {
      useInstallingExtensionsStore.getState().startInstallingProgress(extensionsNumber);
    });

    const state = useInstallingExtensionsStore.getState();
    expect(state.installingProgress).toEqual({
      installed: 0,
      total: extensionsNumber,
      inProgress: true,
    });
  });

  it("sets installing progress correctly", () => {
    const extensionsInstalled = BasicBuilder.number({ min: 0, max: 150 });

    act(() => {
      useInstallingExtensionsStore.getState().setInstallingProgress((prev) => ({
        ...prev,
        installed: prev.installed + extensionsInstalled,
      }));
    });

    expect(useInstallingExtensionsStore.getState().installingProgress.installed).toBe(
      extensionsInstalled,
    );
  });

  it("resets installation progress", () => {
    act(() => {
      useInstallingExtensionsStore.getState().resetInstallingProgress();
    });

    expect(useInstallingExtensionsStore.getState().installingProgress).toEqual({
      installed: 0,
      total: 0,
      inProgress: false,
    });
  });
});
