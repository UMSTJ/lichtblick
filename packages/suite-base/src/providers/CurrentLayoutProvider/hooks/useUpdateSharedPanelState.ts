// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { MutableRefObject, useCallback } from "react";

import {
  ICurrentLayout,
  LayoutState,
  UpdatePanelState,
} from "@lichtblick/suite-base/context/CurrentLayoutContext";

type UseUpdateSharedPanelStateReturn = {
  updateSharedPanelState: UpdatePanelState;
};

const useUpdateSharedPanelState = (
  layoutStateRef: MutableRefObject<Readonly<LayoutState>>,
  setLayoutState: (state: LayoutState) => void,
): UseUpdateSharedPanelStateReturn => {
  const updateSharedPanelState = useCallback<ICurrentLayout["actions"]["updateSharedPanelState"]>(
    (type, newSharedState) => {
      if (layoutStateRef.current.selectedLayout?.data == undefined) {
        return;
      }

      setLayoutState({
        ...layoutStateRef.current,
        sharedPanelState: { ...layoutStateRef.current.sharedPanelState, [type]: newSharedState },
      });
    },
    [setLayoutState, layoutStateRef],
  );
  return { updateSharedPanelState };
};

export default useUpdateSharedPanelState;
