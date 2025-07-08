// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { ReactNode } from "react";

export type DataSourceOptionProps = {
  text: string;
  secondaryText: string;
  icon: React.JSX.Element;
  onClick: () => void;
  href?: string;
  target: "_blank";
};

export type SidebarItem = {
  id: string;
  title: string;
  text: ReactNode;
  actions?: ReactNode;
};
