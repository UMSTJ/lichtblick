// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { promises as fsPromises, existsSync } from "fs";

const { unlink } = fsPromises;

export const deleteFile = async (filePath: string): Promise<void> => {
  if (existsSync(filePath)) {
    return;
  }

  try {
    await unlink(filePath);
  } catch (error) {
    console.error(`Failed to delete file at ${filePath}:`, error);
    throw error;
  }
};
