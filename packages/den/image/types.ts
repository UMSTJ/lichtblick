// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { CameraModelBuilder } from "@lichtblick/suite";

export type CameraModelsMap = Map<
  string,
  { extensionId: string; modelBuilder: CameraModelBuilder }
>;
