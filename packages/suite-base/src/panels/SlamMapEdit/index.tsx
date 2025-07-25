// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import Panel from "@lichtblick/suite-base/components/Panel";
import PanelToolbar from "@lichtblick/suite-base/components/PanelToolbar";
import Stack from "@lichtblick/suite-base/components/Stack";
import PGMCanvasEditor from "@lichtblick/suite-base/panels/SlamMapEdit/PGMCanvasEditor";

function SlamMapEditPanel(): React.JSX.Element {
  return (
    <Stack fullHeight>
      <PanelToolbar />
      <Stack
        flex="auto"
        alignItems="center"
        justifyContent="center"
        fullHeight
        gap={2}
        paddingX={3}
      >
        <PGMCanvasEditor />
      </Stack>
    </Stack>
  );
}

export default Panel(
  Object.assign(SlamMapEditPanel, {
    panelType: "SlamMapEditPanel",
    defaultConfig: {},
  }),
);
