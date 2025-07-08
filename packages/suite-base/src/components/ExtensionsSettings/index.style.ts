// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { makeStyles } from "tss-react/mui";

export const useStyles = makeStyles()(() => ({
  searchBarDiv: {
    position: "sticky",
    top: 0,
    zIndex: 1,
  },
  searchBarPadding: {
    paddingBottom: 13,
  },
}));
