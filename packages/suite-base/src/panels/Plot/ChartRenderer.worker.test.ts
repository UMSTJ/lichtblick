/** @jest-environment jsdom */
// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { Chart } from "chart.js";

jest.mock("chart.js", () => ({
  Chart: {
    register: jest.fn(),
  },
  Interaction: {
    modes: {},
  },
}));

describe("ChartJSManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should register required Chart.js components", async () => {
    await import("@lichtblick/suite-base/components/Chart/worker/ChartJSManager");

    const registerSpy = jest.spyOn(Chart, "register");
    expect(registerSpy).toHaveBeenCalled();
  });
});
