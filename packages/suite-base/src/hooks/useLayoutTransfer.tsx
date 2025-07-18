// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { enqueueSnackbar } from "notistack";
import path from "path";
import { useCallback } from "react";
import { useMountedState } from "react-use";

import {
  LayoutData,
  useCurrentLayoutActions,
} from "@lichtblick/suite-base/context/CurrentLayoutContext";
import useCallbackWithToast from "@lichtblick/suite-base/hooks/useCallbackWithToast";
import { useLayoutNavigation } from "@lichtblick/suite-base/hooks/useLayoutNavigation";
import { Layout } from "@lichtblick/suite-base/services/ILayoutStorage";
import { downloadTextFile } from "@lichtblick/suite-base/util/download";
import showOpenFilePicker from "@lichtblick/suite-base/util/showOpenFilePicker";

import { useAnalytics } from "../context/AnalyticsContext";
import { useLayoutManager } from "../context/LayoutManagerContext";
import { AppEvent } from "../services/IAnalytics";

type UseLayoutTransfer = {
  importLayout: () => Promise<void>;
  exportLayout: () => Promise<void>;
  parseAndInstallLayout: (file: File) => Promise<Layout | undefined>;
};

export function useLayoutTransfer(): UseLayoutTransfer {
  const isMounted = useMountedState();
  const layoutManager = useLayoutManager();
  const analytics = useAnalytics();
  const { promptForUnsavedChanges, onSelectLayout } = useLayoutNavigation();
  const { getCurrentLayoutState } = useCurrentLayoutActions();

  const parseAndInstallLayout = useCallback(
    async (file: File) => {
      const layoutName = path.basename(file.name, path.extname(file.name));
      const content = await file.text();

      if (!isMounted()) {
        return;
      }

      let parsedState: unknown;
      try {
        parsedState = JSON.parse(content);
      } catch (err: unknown) {
        enqueueSnackbar(`${file.name} is not a valid layout: ${(err as Error).message}`, {
          variant: "error",
        });
        return;
      }

      if (typeof parsedState !== "object" || !parsedState) {
        enqueueSnackbar(`${file.name} is not a valid layout`, { variant: "error" });
        return;
      }

      const data = parsedState as LayoutData;
      const newLayout = await layoutManager.saveNewLayout({
        name: layoutName,
        data,
        permission: "CREATOR_WRITE",
      });

      void onSelectLayout(newLayout);

      return newLayout;
    },
    [isMounted, layoutManager, onSelectLayout],
  );

  const importLayout = useCallbackWithToast(async () => {
    if (!(await promptForUnsavedChanges())) {
      return;
    }

    const fileHandles = await showOpenFilePicker({
      multiple: true,
      excludeAcceptAllOption: false,
      types: [
        {
          description: "JSON Files",
          accept: {
            "application/json": [".json"],
          },
        },
      ],
    });

    if (fileHandles.length === 0) {
      return;
    }

    await Promise.all(
      fileHandles.map(async (fileHandle) => {
        const file = await fileHandle.getFile();
        return await parseAndInstallLayout(file);
      }),
    );

    if (!isMounted()) {
      return;
    }

    void analytics.logEvent(AppEvent.LAYOUT_IMPORT, { numLayouts: fileHandles.length });
  }, [analytics, isMounted, parseAndInstallLayout, promptForUnsavedChanges]);

  const exportLayout = useCallbackWithToast(async () => {
    const item = getCurrentLayoutState().selectedLayout?.data;
    if (!item) {
      return;
    }

    const name = getCurrentLayoutState().selectedLayout?.name?.trim() ?? "";
    const layoutName = name.length > 0 ? name : "lichtblick-layout";
    const content = JSON.stringify(item, undefined, 2) ?? "";
    downloadTextFile(content, `${layoutName}.json`);
    void analytics.logEvent(AppEvent.LAYOUT_EXPORT);
  }, [analytics, getCurrentLayoutState]);

  return { importLayout, exportLayout, parseAndInstallLayout };
}
