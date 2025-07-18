// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { useEffect } from "react";

import { NewPIDPLOTCoordinator } from "../NewPIDPLOTCoordinator";

export default function useGlobalSync(
  coordinator: NewPIDPLOTCoordinator | undefined,
  setCanReset: (canReset: boolean) => void,
  { shouldSync }: { shouldSync: boolean },
  _subscriberId: string,
): void {
  useEffect(() => {
    if (!coordinator) {
      return;
    }

    coordinator.setShouldSync({ shouldSync });
  }, [coordinator, shouldSync]);

  useEffect(() => {
    if (!coordinator) {
      return;
    }

    const handleGlobalSync = () => {
      setCanReset(true);
    };

    coordinator.on("globalSync", handleGlobalSync);

    return () => {
      coordinator.off("globalSync", handleGlobalSync);
    };
  }, [coordinator, setCanReset]);
}
