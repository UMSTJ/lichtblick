// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { makeStyles } from "tss-react/mui";

export const useStyles = makeStyles()((theme) => ({
  iconButtonSmall: {
    padding: theme.spacing(0.91125), // round out the overall height to 30px
    borderRadius: 0,
  },
}));
