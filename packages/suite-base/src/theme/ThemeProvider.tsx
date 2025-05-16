// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
import { CssBaseline } from "@mui/material";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material";
import * as React from "react";
import { useEffect, useLayoutEffect, useMemo } from "react";

import { createMuiTheme } from "@lichtblick/theme";

// Make sure mui styles are loaded first so that our makeStyles customizations
// take precedence.
const muiCache = createCache({ key: "mui", prepend: true });

// By default the ThemeProvider adds an extra div to the DOM tree. We can disable this with a
// custom `as` component to FluentThemeProvider. The component must support a `ref` property
// otherwise we get react warnings.
const ThemeContainer = React.forwardRef((props: React.PropsWithChildren, _ref) => (
  <>{props.children}</>
));
ThemeContainer.displayName = "ThemeContainer";

export default function ThemeProvider({
  children,
  isDark,
}: React.PropsWithChildren<{ isDark: boolean }>): React.ReactElement | ReactNull {
  useEffect(() => {
    // Trick CodeEditor into sync with our theme
    document.documentElement.setAttribute("data-color-mode", isDark ? "dark" : "light");

    // remove styles set to prevent browser flash on init
    document.querySelector("#loading-styles")?.remove();
  }, [isDark]);

  const baseTheme = useMemo(() => createMuiTheme(isDark ? "dark" : "light"), [isDark]);
  // 再在 baseTheme 上打补丁，注入全局组件样式覆盖
  const muiTheme = useMemo(() => {
    return {
      ...baseTheme,
      components: {
        // 保留原来可能已经在 createMuiTheme 里定义的
        ...baseTheme.components,
        MuiDrawer: {
          styleOverrides: {
            paper: ({ theme }: { theme: typeof baseTheme }) => ({
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              borderLeft: `1px solid ${
                theme.palette.mode === "light"
                  ? "rgba(0,0,0,0.12)"
                  : "rgba(255,255,255,0.12)"
              }`,
            }),
          },
        },
        MuiListItemButton: {
          styleOverrides: {
            root: ({ theme }: { theme: typeof baseTheme }) => ({
              "&.Mui-selected": {
                backgroundColor: theme.palette.action.selected,
                "& .MuiListItemText-primary": {
                  color: theme.palette.primary.main,
                },
              },
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }),
          },
        },
        MuiListItemIcon: {
          styleOverrides: {
            root: {
              color: "inherit",
            },
          },
        },
      },
    };
  }, [baseTheme]);


  useLayoutEffect(() => {
    // Set the theme color to match the sidebar and playback bar
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = muiTheme.palette.background.paper;
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, [muiTheme]);

  return (
    <CacheProvider value={muiCache}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </CacheProvider>
  );
}
