// ./src/panels/MotionState/index.tsx

import Panel from "@lichtblick/suite-base/components/Panel";
import { DEFAULT_TRIPLE_PLOT_CONFIG } from "./constants";
import TriplePlotPanel   from "@lichtblick/suite-base/components/TriplePlotPanel";
import {TriplePlotConfig} from "./constants";
// @ts-ignore
export default Panel<TriplePlotConfig>(
  Object.assign(TriplePlotPanel, {
    panelType: "Plot",
    defaultConfig: DEFAULT_TRIPLE_PLOT_CONFIG,
  }),
);
