// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { makeStyles } from "tss-react/mui";

export const useStyles = makeStyles()(() => ({
  verticalBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 1,
    marginLeft: -1,
    display: "block",
    pointerEvents: "none",
  },
  playbackBar: {
    backgroundColor: "#aaa",
  },
}));
