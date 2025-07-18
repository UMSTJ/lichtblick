// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { CameraInfo, ICameraModel } from "@lichtblick/suite";

import { PinholeCameraModel } from "./PinholeCameraModel";
import { CameraModelsMap } from "./types";

export const selectCameraModel = (
  cameraInfo: CameraInfo,
  cameraModels: CameraModelsMap,
): ICameraModel => {
  const cameraModel = cameraModels.get(cameraInfo.distortion_model);
  if (cameraModel) {
    return cameraModel.modelBuilder(cameraInfo);
  }
  return new PinholeCameraModel(cameraInfo);
};
