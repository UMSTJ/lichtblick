// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";

import IAnalytics from "@lichtblick/suite-base/services/IAnalytics";
import NullAnalytics from "@lichtblick/suite-base/services/NullAnalytics";

const AnalyticsContext = createContext<IAnalytics>(new NullAnalytics());
AnalyticsContext.displayName = "AnalyticsContext";

export function useAnalytics(): IAnalytics {
  return useContext(AnalyticsContext);
}

export default AnalyticsContext;
