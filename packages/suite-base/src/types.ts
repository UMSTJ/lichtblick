// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { AppBarProps } from "@lichtblick/suite-base/components/AppBar";
import { CustomWindowControlsProps } from "@lichtblick/suite-base/components/AppBar/CustomWindowControls";
import { SidebarItem } from "@lichtblick/suite-base/components/Sidebars/types";
import { SidebarItemKey } from "@lichtblick/suite-base/context/Workspace/WorkspaceContext";

export type InjectedSidebarItem = [SidebarItemKey, SidebarItem];

export type WorkspaceProps = CustomWindowControlsProps & {
  deepLinks?: readonly string[];
  appBarLeftInset?: number;
  onAppBarDoubleClick?: () => void;

  disablePersistenceForStorybook?: boolean;
  AppBarComponent?: (props: AppBarProps) => React.JSX.Element;
};
