// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0
/* eslint-disable filenames/match-exported */
import { STORAGE_STATE } from "./playwright.config";
import { deleteFile } from "../../fixtures/delete-file";

async function webTeardown(): Promise<void> {
  console.debug("Running web teardown...");

  await deleteFile(STORAGE_STATE);
}

export default webTeardown;
