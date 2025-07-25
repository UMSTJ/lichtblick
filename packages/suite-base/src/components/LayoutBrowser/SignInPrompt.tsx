// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import CloseIcon from "@mui/icons-material/Close";
import { ButtonBase, IconButton, Link, Typography } from "@mui/material";
import { makeStyles } from "tss-react/mui";

import { AppSetting } from "@lichtblick/suite-base/AppSetting";
import { useCurrentUser } from "@lichtblick/suite-base/context/CurrentUserContext";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";
import { useAppConfigurationValue } from "@lichtblick/suite-base/hooks";

type SignInPromptProps = {
  onDismiss?: () => void;
};

const useStyles = makeStyles()((theme) => ({
  root: {
    display: "flex",
    padding: theme.spacing(1.5, 1, 1.5, 2),
    gap: theme.spacing(1),
    backgroundColor: theme.palette.action.hover,
    position: "sticky",
    alignItems: "center",
    bottom: 0,

    "&:hover": {
      backgroundColor: theme.palette.action.focus,
    },
  },
  title: {
    maxWidth: 280,
  },
}));

export default function SignInPrompt(props: SignInPromptProps): React.JSX.Element {
  const { onDismiss } = props;
  const { signIn } = useCurrentUser();
  const { classes } = useStyles();
  const { openAccountSettings } = useWorkspaceActions();
  const [topNavEnabled = false] = useAppConfigurationValue<boolean>(AppSetting.ENABLE_NEW_TOPNAV);

  const action = topNavEnabled ? signIn : openAccountSettings;

  return (
    <ButtonBase className={classes.root} onClick={action}>
      <Typography align="left" className={classes.title} variant="body2">
        <Link color="inherit" onClick={action} underline="always">
          Sign in
        </Link>{" "}
        to sync layouts across multiple devices, and share them with your organization.
      </Typography>
      {onDismiss != undefined && (
        <IconButton
          aria-label="Dismiss"
          size="small"
          role="button"
          onClick={(event) => {
            event.stopPropagation();
            onDismiss();
          }}
        >
          <CloseIcon />
        </IconButton>
      )}
    </ButtonBase>
  );
}
