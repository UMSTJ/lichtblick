// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  LayoutColumnOneThirdLeft24Regular,
  LayoutColumnOneThirdLeft24Filled,
} from "@fluentui/react-icons";
import { Button, Tag } from "antd";
import { useState } from "react";
import tc from "tinycolor2";
import { makeStyles } from "tss-react/mui";

import { AppSetting } from "@lichtblick/suite-base/AppSetting";
import { DataSource, InfoContent } from "@lichtblick/suite-base/components/AppBar/DataSource";
import { MemoryUseIndicator } from "@lichtblick/suite-base/components/MemoryUseIndicator";
import Stack from "@lichtblick/suite-base/components/Stack";
import { useAppContext } from "@lichtblick/suite-base/context/AppContext";
import {
  WorkspaceContextStore,
  useWorkspaceStore,
} from "@lichtblick/suite-base/context/Workspace/WorkspaceContext";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";
import { useAppConfigurationValue } from "@lichtblick/suite-base/hooks";

import { AddPanelMenu } from "./AddPanelMenu";
import { AppBarContainer } from "./AppBarContainer";
import { CustomWindowControls, CustomWindowControlsProps } from "./CustomWindowControls";
import { SettingsMenu } from "./SettingsMenu";

const useStyles = makeStyles<{ debugDragRegion?: boolean }, "avatar">()((
  theme,
  { debugDragRegion = false },
  classes,
) => {
  const NOT_DRAGGABLE_STYLE: Record<string, string> = { WebkitAppRegion: "no-drag" };
  if (debugDragRegion) {
    NOT_DRAGGABLE_STYLE.backgroundColor = "red";
  }
  return {
    toolbar: {
      display: "grid",
      width: "100%",
      gridTemplateAreas: `"start middle end"`,
      gridTemplateColumns: "1fr auto 1fr",
      alignItems: "center",
    },
    // eslint-disable-next-line tss-unused-classes/unused-classes
    logo: {
      padding: theme.spacing(0.75, 0.5),
      fontSize: "2rem",
      color: theme.palette.appBar.primary,
      borderRadius: 0,

      "svg:not(.MuiSvgIcon-root)": {
        fontSize: "1em",
      },
      "&:hover": {
        backgroundColor: tc(theme.palette.common.white).setAlpha(0.08).toRgbString(),
      },
      "&.Mui-selected": {
        backgroundColor: theme.palette.appBar.primary,
        color: theme.palette.common.white,
      },
      "&.Mui-disabled": {
        color: "currentColor",
        opacity: theme.palette.action.disabledOpacity,
      },
    },
    // eslint-disable-next-line tss-unused-classes/unused-classes
    dropDownIcon: {
      fontSize: "12px !important",
    },
    start: {
      gridArea: "start",
      display: "flex",
      flex: 1,
      alignItems: "center",
    },
    startInner: {
      display: "flex",
      alignItems: "center",
      ...NOT_DRAGGABLE_STYLE, // make buttons clickable for desktop app
    },
    middle: {
      gridArea: "middle",
      justifySelf: "center",
      overflow: "hidden",
      maxWidth: "100%",
      margin: 2,
      ...NOT_DRAGGABLE_STYLE, // make buttons clickable for desktop app
    },
    end: {
      gridArea: "end",
      flex: 1,
      display: "flex",
      justifyContent: "flex-end",
    },
    endInner: {
      display: "flex",
      alignItems: "center",
      ...NOT_DRAGGABLE_STYLE, // make buttons clickable for desktop app
    },
    // eslint-disable-next-line tss-unused-classes/unused-classes
    keyEquivalent: {
      fontFamily: theme.typography.fontMonospace,
      background: tc(theme.palette.common.white).darken(45).toString(),
      padding: theme.spacing(0, 0.5),
      aspectRatio: 1,
      borderRadius: theme.shape.borderRadius,
      marginLeft: theme.spacing(1),
    },
    // eslint-disable-next-line tss-unused-classes/unused-classes
    tooltip: {
      marginTop: `${theme.spacing(0.5)} !important`,
    },
    avatar: {
      color: theme.palette.common.white,
      backgroundColor: tc(theme.palette.appBar.main).lighten().toString(),
      height: theme.spacing(3.5),
      width: theme.spacing(3.5),
    },
    // eslint-disable-next-line tss-unused-classes/unused-classes
    iconButton: {
      padding: theme.spacing(1),
      borderRadius: 0,

      "&:hover": {
        backgroundColor: tc(theme.palette.common.white).setAlpha(0.08).toString(),

        [`.${classes.avatar}`]: {
          backgroundColor: tc(theme.palette.appBar.main).lighten(20).toString(),
        },
      },
      "&.Mui-selected": {
        backgroundColor: theme.palette.appBar.primary,

        [`.${classes.avatar}`]: {
          backgroundColor: tc(theme.palette.appBar.main).setAlpha(0.3).toString(),
        },
      },
    },
  };
});

export type AppBarProps = CustomWindowControlsProps & {
  leftInset?: number;
  onDoubleClick?: () => void;
  debugDragRegion?: boolean;
};

// const selectHasCurrentLayout = (state: LayoutState) => state.selectedLayout != undefined;
const selectLeftSidebarOpen = (store: WorkspaceContextStore) => store.sidebars.left.open;

export function AppBar(props: AppBarProps): React.JSX.Element {
  const {
    debugDragRegion,
    isMaximized,
    leftInset,
    onCloseWindow,
    onDoubleClick,
    onMaximizeWindow,
    onMinimizeWindow,
    onUnmaximizeWindow,
    showCustomWindowControls = false,
  } = props;
  const { classes } = useStyles({ debugDragRegion });
  // const { t } = useTranslation("appBar");

  const { appBarLayoutButton } = useAppContext();
  const [enableMemoryUseIndicator = false] = useAppConfigurationValue<boolean>(
    AppSetting.ENABLE_MEMORY_USE_INDICATOR,
  );

  // const hasCurrentLayout = useCurrentLayoutSelector(selectHasCurrentLayout);

  const leftSidebarOpen = useWorkspaceStore(selectLeftSidebarOpen);
  //const rightSidebarOpen = useWorkspaceStore(selectRightSidebarOpen);

  const { sidebarActions } = useWorkspaceActions();
  const [userAnchorEl, setUserAnchorEl] = useState<undefined | HTMLElement>(undefined);
  const [panelAnchorEl, setPanelAnchorEl] = useState<undefined | HTMLElement>(undefined);

  const userMenuOpen = Boolean(userAnchorEl);
  const panelMenuOpen = Boolean(panelAnchorEl);

  return (
    <>
      <AppBarContainer onDoubleClick={onDoubleClick} leftInset={leftInset}>
        <div className={classes.toolbar}>
          <div className={classes.start}>
            <div className={classes.startInner}>
              <DataSource />
              <Button
                type="text"
                style={{ marginTop: 5, marginLeft: 10, marginRight: 3, height: 22 }}
                // type="primary"
                icon={
                  leftSidebarOpen ? (
                    <LayoutColumnOneThirdLeft24Filled />
                  ) : (
                    <LayoutColumnOneThirdLeft24Regular />
                  )
                }
                onClick={() => {
                  sidebarActions.left.setOpen(!leftSidebarOpen);
                }}
              ></Button>

              {/* <IconButton
                className={cx(classes.logo, { "Mui-selected": appMenuOpen })}
                color="inherit"
                id="app-menu-button"
                data-testid="AppMenuButton"
                title="Menu"
                aria-controls={appMenuOpen ? "app-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={appMenuOpen ? "true" : undefined}
                data-tourid="app-menu-button"
                onClick={(event) => {
                  setAppMenuEl(event.currentTarget);
                }}
              >
                <LichtblickLogo fontSize="inherit" color="inherit" />
                <ChevronDown12Regular
                  className={classes.dropDownIcon}
                  primaryFill={theme.palette.common.white}
                />
              </IconButton> */}
              {/* <AppMenu
                open={appMenuOpen}
                anchorEl={appMenuEl}
                handleClose={() => {
                  setAppMenuEl(undefined);
                }}
              />
              <AppBarIconButton
                className={cx({ "Mui-selected": panelMenuOpen })}
                color="inherit"
                disabled={!hasCurrentLayout}
                id="add-panel-button"
                data-testid="AddPanelButton"
                data-tourid="add-panel-button"
                title={t("addPanel")}
                aria-label="Add panel button"
                aria-controls={panelMenuOpen ? "add-panel-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={panelMenuOpen ? "true" : undefined}
                onClick={(event) => {
                  setPanelAnchorEl(event.currentTarget);
                }}
              >
                <SlideAdd24Regular />
              </AppBarIconButton> */}
            </div>
          </div>

          <div className={classes.middle}>
            <Tag
              style={{
                minWidth: 300,
                height: 26,
                marginTop: 2,
                paddingLeft: 15,
                paddingRight: 15,
                paddingTop: 1,
                paddingBottom: 1,
                textAlign: "center",
              }}
              // bordered={false}
            >
              <InfoContent />
            </Tag>
            {/* <Input
              style={{
                minWidth: 300,

                height: 22,
                marginTop: 5,
                textAlign: "center",
              }}
              placeholder={InfoContent()}
              variant="filled"
            /> */}
          </div>

          <div className={classes.end}>
            <div className={classes.endInner}>
              {enableMemoryUseIndicator && <MemoryUseIndicator />}
              {appBarLayoutButton}
              <Stack direction="row" alignItems="center" data-tourid="sidebar-button-group">
                {/* <AppBarIconButton
                  title={
                    <>
                      {leftSidebarOpen ? t("hideLeftSidebar") : t("showLeftSidebar")}{" "}
                      <kbd className={classes.keyEquivalent}>[</kbd>
                    </>
                  }
                  aria-label={leftSidebarOpen ? t("hideLeftSidebar") : t("showLeftSidebar")}
                  onClick={() => {
                    sidebarActions.left.setOpen(!leftSidebarOpen);
                  }}
                  data-tourid="left-sidebar-button"
                  data-testid="left-sidebar-button"
                >
                  {leftSidebarOpen ? <PanelLeft24Filled /> : <PanelLeft24Regular />}
                </AppBarIconButton>
                <AppBarIconButton
                  title={
                    <>
                      {rightSidebarOpen ? t("hideRightSidebar") : t("showRightSidebar")}{" "}
                      <kbd className={classes.keyEquivalent}>]</kbd>
                    </>
                  }
                  aria-label={rightSidebarOpen ? t("hideRightSidebar") : t("showRightSidebar")}
                  onClick={() => {
                    sidebarActions.right.setOpen(!rightSidebarOpen);
                  }}
                  data-tourid="right-sidebar-button"
                  data-testid="right-sidebar-button"
                >
                  {rightSidebarOpen ? <PanelRight24Filled /> : <PanelRight24Regular />}
                </AppBarIconButton> */}
              </Stack>
              {/* <Tooltip classes={{ tooltip: classes.tooltip }} title="Profile" arrow={false}>
                <IconButton
                  className={cx(classes.iconButton, { "Mui-selected": userMenuOpen })}
                  aria-label="User profile menu button"
                  color="inherit"
                  id="user-button"
                  data-tourid="user-button"
                  aria-controls={userMenuOpen ? "user-menu" : undefined}
                  aria-haspopup="true"
                  aria-expanded={userMenuOpen ? "true" : undefined}
                  onClick={(event) => {
                    setUserAnchorEl(event.currentTarget);
                  }}
                  data-testid="user-button"
                >
                  <Avatar className={classes.avatar} variant="rounded" />
                </IconButton>
              </Tooltip> */}
              {/* <Button
                type="text"
                style={{ marginTop: 5, marginLeft: 10, marginRight: 10, height: 22 }}
                // type="primary"
                icon={
                  leftSidebarOpen ? (
                    <LayoutColumnOneThirdLeft24Filled />
                  ) : (
                    <LayoutColumnOneThirdLeft24Regular />
                  )
                }
                onClick={() => {
                  sidebarActions.left.setOpen(!leftSidebarOpen);
                }}
              ></Button>
              <Button
                type="text"
                style={{
                  marginTop: 5,
                  marginRight: isRunningInElectron() ? 64 : 10,
                  width: 22,
                  height: 22,
                }}
                // type="primary"
                icon={
                  rightSidebarOpen ? (
                    <LayoutColumnOneThirdRight24Filled />
                  ) : (
                    <LayoutColumnOneThirdRight24Regular />
                  )
                }
                onClick={() => {
                  sidebarActions.right.setOpen(!rightSidebarOpen);
                }}
              /> */}
              {showCustomWindowControls && (
                <CustomWindowControls
                  onMinimizeWindow={onMinimizeWindow}
                  isMaximized={isMaximized}
                  onUnmaximizeWindow={onUnmaximizeWindow}
                  onMaximizeWindow={onMaximizeWindow}
                  onCloseWindow={onCloseWindow}
                />
              )}
            </div>
          </div>
        </div>
      </AppBarContainer>
      <AddPanelMenu
        anchorEl={panelAnchorEl}
        open={panelMenuOpen}
        handleClose={() => {
          setPanelAnchorEl(undefined);
        }}
      />
      <SettingsMenu
        anchorEl={userAnchorEl}
        open={userMenuOpen}
        handleClose={() => {
          setUserAnchorEl(undefined);
        }}
      />
    </>
  );
}
