/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { formatKeyboardShortcut } from "./formatKeyboardShortcut";

describe("formatKeyboardShortcut", () => {
  let userAgent: jest.SpyInstance<string, []>;

  beforeEach(() => {
    userAgent = jest.spyOn(window.navigator, "userAgent", "get");
  });

  it("formats shortcuts correctly for Windows", () => {
    userAgent.mockReturnValue("Windows");
    expect(formatKeyboardShortcut("O", ["Shift", "Meta"])).toBe("Shift+Ctrl+O");
    expect(formatKeyboardShortcut("O", ["Shift", "Shift", "Shift"])).toBe("Shift+Shift+Shift+O");
    expect(formatKeyboardShortcut("O", [])).toBe("O");
  });

  it("formats shortcuts correctly Linux", () => {
    userAgent.mockReturnValue("Linux");
    expect(formatKeyboardShortcut("O", ["Shift", "Meta"])).toBe("Shift+Ctrl+O");
    expect(formatKeyboardShortcut("O", ["Shift", "Shift", "Shift"])).toBe("Shift+Shift+Shift+O");
    expect(formatKeyboardShortcut("O", [])).toBe("O");
  });

  it("formats shortcuts correctly Mac", () => {
    userAgent.mockReturnValue("Mac");
    expect(formatKeyboardShortcut("O", ["Shift", "Meta"])).toBe("⇧⌘O");
    expect(formatKeyboardShortcut("O", ["Shift", "Shift", "Shift"])).toBe("⇧⇧⇧O");
    expect(formatKeyboardShortcut("O", [])).toBe("O");
  });
});
