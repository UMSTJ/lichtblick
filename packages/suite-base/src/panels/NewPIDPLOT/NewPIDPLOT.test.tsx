// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { render, screen } from "@testing-library/react";
import { useTheme } from "@mui/material";
import { act } from "react-dom/test-utils";

import { DEFAULT_NEWPIDPLOT_CONFIG } from "./constants";
import NewPIDPLOT from "./NewPIDPLOT";

// Mock the theme
jest.mock("@mui/material", () => ({
  ...jest.requireActual("@mui/material"),
  useTheme: jest.fn(),
}));

// Mock the translation
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string) => defaultValue,
  }),
}));

describe("NewPIDPLOT", () => {
  const mockTheme = {
    palette: {
      mode: "light",
      divider: "#e0e0e0",
      text: {
        secondary: "#666666",
      },
    },
  };

  beforeEach(() => {
    (useTheme as jest.Mock).mockReturnValue(mockTheme);
  });

  it("renders without crashing", () => {
    const saveConfig = jest.fn();

    render(
      <NewPIDPLOT
        config={DEFAULT_NEWPIDPLOT_CONFIG}
        saveConfig={saveConfig}
      />
    );

    expect(screen.getByText("PID控制曲线")).toBeInTheDocument();
  });

  it("displays parameter panel when showParameterPanel is true", () => {
    const saveConfig = jest.fn();
    const config = {
      ...DEFAULT_NEWPIDPLOT_CONFIG,
      showParameterPanel: true,
    };

    render(
      <NewPIDPLOT
        config={config}
        saveConfig={saveConfig}
      />
    );

    expect(screen.getByText("PID参数控制")).toBeInTheDocument();
  });

  it("does not display parameter panel when showParameterPanel is false", () => {
    const saveConfig = jest.fn();
    const config = {
      ...DEFAULT_NEWPIDPLOT_CONFIG,
      showParameterPanel: false,
    };

    render(
      <NewPIDPLOT
        config={config}
        saveConfig={saveConfig}
      />
    );

    expect(screen.queryByText("PID参数控制")).not.toBeInTheDocument();
  });
});
