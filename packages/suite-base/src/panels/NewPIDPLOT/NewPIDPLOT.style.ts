// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { makeStyles } from "tss-react/mui";

export const useStyles = makeStyles()((theme) => ({
  container: {
    display: "flex",
    height: "100%",
    width: "100%",
  },
  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  parameterPanel: {
    width: 300,
    borderLeft: `1px solid ${theme.palette.divider}`,
    borderRight: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    overflow: "auto",
  },
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    position: "relative",
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    position: "relative",
  },
  plotContainer: {
    flex: 1,
    position: "relative",
    minHeight: 0,
    cursor: "crosshair",
  },
  canvas: {
    width: "100%",
    height: "100%",
    display: "block",
  },
  legend: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: theme.palette.background.default,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 4,
    padding: 8,
    maxWidth: 300,
    maxHeight: 200,
    overflow: "auto",
    zIndex: 1,
  },
  tooltip: {
    position: "absolute",
    pointerEvents: "none",
    zIndex: 2,
  },
}));
