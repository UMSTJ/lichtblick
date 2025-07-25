/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2020-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.
import { getNodeAtPath, MosaicNode, MosaicParent, updateTree } from "react-mosaic-component";

import { TabPanelConfig } from "@lichtblick/suite-base/types/layouts";

import {
  getPanelTypeFromId,
  getSaveConfigsPayloadForAddedPanel,
  removePanelFromTabPanel,
  getPanelIdsInsideTabPanels,
  createAddUpdates,
  addPanelToTab,
  replaceAndRemovePanels,
  updateTabPanelLayout,
  validateTabPanelConfig,
  moveTabBetweenTabPanels,
  reorderTabWithinTabPanel,
  getPathFromNode,
  getParentTabPanelByPanelId,
} from "./layout";

const tabConfig = {
  title: "First tab",
  layout: { first: "Plot!1", second: "Plot!2", direction: "row" },
};
describe("layout", () => {
  describe("getSaveConfigsPayloadForAddedPanel", () => {
    it("properly map template panel IDs to new IDs when adding a Tab panel", () => {
      const firstPlotConfig = { paths: ["/abc"] };
      const secondPlotConfig = { paths: ["/def"] };
      const configsSaved = getSaveConfigsPayloadForAddedPanel({
        id: "Tab!abc",
        config: { tabs: [tabConfig] },
        savedProps: { "Plot!1": firstPlotConfig, "Plot!2": secondPlotConfig },
      }).configs;
      const newIdForFirstPlot = configsSaved[0]?.id;
      expect(configsSaved[0]?.config).toEqual(firstPlotConfig);
      expect(getPanelTypeFromId(newIdForFirstPlot!)).not.toEqual("Plot!1");
      expect(getPanelTypeFromId(newIdForFirstPlot!)).toEqual("Plot");

      const newIdForSecondPlot = configsSaved[1]?.id;
      expect(configsSaved[1]?.config).toEqual(secondPlotConfig);
      expect(getPanelTypeFromId(newIdForFirstPlot!)).not.toEqual("Plot!2");
      expect(getPanelTypeFromId(newIdForSecondPlot!)).toEqual("Plot");

      expect(configsSaved[2]?.config).toEqual({
        tabs: [
          {
            ...tabConfig,
            layout: { first: newIdForFirstPlot, second: newIdForSecondPlot, direction: "row" },
          },
        ],
      });
      expect(configsSaved[2]?.id).toEqual("Tab!abc");
    });
    it("works with single panel tab layouts", () => {
      const inputConfig = {
        id: "Tab!7arq0e",
        config: {
          activeTabIdx: 0,
          tabs: [
            { title: "1", layout: "DiagnosticSummary!3fktxti" },
            { title: "2", layout: undefined },
          ],
        },
        savedProps: {},
      };
      const { configs } = getSaveConfigsPayloadForAddedPanel(inputConfig);
      expect(inputConfig.config.tabs.length).toEqual(
        (configs[0]?.config as TabPanelConfig).tabs.length,
      );

      const inputLayout = inputConfig.config.tabs[0]?.layout;
      const outputLayout = (configs[0]?.config as TabPanelConfig).tabs[0]!.layout as string;

      expect(getPanelTypeFromId(inputLayout!)).toEqual(getPanelTypeFromId(outputLayout));
      expect(inputLayout).not.toEqual(outputLayout);
    });
    it("works with undefined tab layouts", () => {
      const originalConfig = {
        id: "Tab!abc",
        config: { tabs: [{ title: "First tab", layout: undefined }] },
      };
      const { configs } = getSaveConfigsPayloadForAddedPanel({
        ...originalConfig,
        savedProps: {},
      });
      expect(originalConfig).toEqual(configs[0]);
    });
    it("returns configs when there are missing related configs", () => {
      const firstPlotConfig = { paths: ["/abc"] };
      const configsSaved = getSaveConfigsPayloadForAddedPanel({
        id: "Tab!abc",
        config: { tabs: [tabConfig] },
        savedProps: { "Plot!1": firstPlotConfig },
      }).configs;
      expect(configsSaved.length).toEqual(2);
      const newIdForFirstPlot = configsSaved[0]?.id;
      expect(configsSaved[0]?.config).toEqual(firstPlotConfig);
      expect(newIdForFirstPlot).not.toEqual("Plot!1");
      expect(getPanelTypeFromId(newIdForFirstPlot!)).toEqual("Plot");

      expect(configsSaved[1]?.id).toEqual("Tab!abc");
      const updatedTabConfig = (configsSaved[1]?.config as TabPanelConfig).tabs[0]!;
      expect((updatedTabConfig.layout as MosaicParent<string>).first).toEqual(newIdForFirstPlot);
      expect((updatedTabConfig.layout as MosaicParent<string>).second).not.toEqual("Plot!2");
      expect(
        getPanelTypeFromId((updatedTabConfig.layout as MosaicParent<string>).second as string),
      ).toEqual("Plot");
      expect((updatedTabConfig.layout as MosaicParent<string>).direction).toEqual("row");
    });
  });

  describe("removePanelFromTabPanel", () => {
    it("single panel layout", () => {
      expect(
        removePanelFromTabPanel(
          [],
          {
            activeTabIdx: 0,
            tabs: [
              { title: "1", layout: "DiagnosticSummary!3v8mswd" },
              { title: "2", layout: undefined },
            ],
          },
          "Tab!3u9ypnk",
        ),
      ).toEqual({
        configs: [
          {
            id: "Tab!3u9ypnk",
            config: {
              activeTabIdx: 0,
              tabs: [
                { title: "1", layout: undefined },
                { title: "2", layout: undefined },
              ],
            },
          },
        ],
      });
    });
    it("multiple panel layout", () => {
      expect(
        removePanelFromTabPanel(
          ["second"],
          {
            activeTabIdx: 0,
            tabs: [
              {
                title: "1",
                layout: {
                  first: "DiagnosticSummary!1x1vwgf",
                  second: "DiagnosticSummary!3v8mswd",
                  direction: "column",
                  splitPercentage: 100,
                },
              },
              { title: "2", layout: undefined },
            ],
          },
          "Tab!3u9ypnk",
        ),
      ).toEqual({
        configs: [
          {
            id: "Tab!3u9ypnk",
            config: {
              activeTabIdx: 0,
              tabs: [
                { title: "1", layout: "DiagnosticSummary!1x1vwgf" },
                { title: "2", layout: undefined },
              ],
            },
          },
        ],
      });
    });
  });

  describe("getPanelIdsInsideTabPanels", () => {
    it("gets nothing when no tab panels are specified", () => {
      expect(
        getPanelIdsInsideTabPanels([], {
          "Tab!a": {
            tabs: [{ layout: "Image!a" }, { layout: { first: "Image!b", second: "RosOut!a" } }],
          },
          "Image!a": { foo: "bar" },
          "Image!b": { foo: "baz" },
        }),
      ).toEqual([]);
    });
    it("gets nested panels in specified tab panels' tabs", () => {
      expect(
        getPanelIdsInsideTabPanels(["Tab!a"], {
          "Tab!a": {
            tabs: [
              { layout: "Image!a" },
              { layout: { direction: "row", first: "Image!b", second: "RosOut!a" } },
            ],
          },
          "Image!a": { foo: "bar" },
          "Image!b": { foo: "baz" },
        }),
      ).toEqual(["Image!a", "Image!b", "RosOut!a"]);
    });
    it("gets nested panels in multiple specified tab panels' tabs", () => {
      expect(
        getPanelIdsInsideTabPanels(["Tab!a", "Tab!b"], {
          "Tab!a": {
            tabs: [
              { layout: "Image!a" },
              { layout: { direction: "row", first: "Image!b", second: "RosOut!a" } },
            ],
          },
          "Tab!b": { tabs: [{ layout: "Image!c" }, { layout: "Image!d" }] },
          "Image!a": { foo: "bar" },
          "Image!b": { foo: "baz" },
          "Image!c": { foo: "bar" },
          "Image!d": { foo: "baz" },
        }),
      ).toEqual(["Image!a", "Image!b", "RosOut!a", "Image!c", "Image!d"]);
    });
  });

  describe("createAddUpdates", () => {
    it("no tabs", () => {
      const layout = "Audio!a";
      expect(updateTree(layout, createAddUpdates(layout, "Global!a", [], "bottom"))).toEqual({
        first: layout,
        second: "Global!a",
        direction: "column",
      });
    });
    it("with Tab panels", () => {
      const layout: MosaicNode<string> = { first: "Tab!a", second: "Global!a", direction: "row" };
      expect(updateTree(layout, createAddUpdates(layout, "Audio!a", ["second"], "left"))).toEqual({
        ...layout,
        second: { first: "Audio!a", second: layout.second, direction: "row" },
      });
    });
    it("nested paths", () => {
      const layout: MosaicNode<string> = {
        first: "Tab!a",
        second: { first: "Audio!a", second: "Global!a", direction: "column" },
        direction: "row",
      };
      expect(
        updateTree(layout, createAddUpdates(layout, "Plot!a", ["second", "first"], "left")),
      ).toEqual({
        ...layout,
        second: {
          ...(layout.second as MosaicParent<string>),
          first: { first: "Plot!a", second: "Audio!a", direction: "row" },
        },
      });
    });
  });

  describe("addPanelToTab", () => {
    it("can add a new panel into a tab config", () => {
      expect(
        addPanelToTab(
          "DiagnosticSummary!30vin8",
          [],
          "bottom",
          {
            activeTabIdx: 0,
            tabs: [
              { title: "1", layout: "DiagnosticSummary!3v8mswd" },
              { title: "2", layout: undefined },
            ],
          },
          "Tab!3u9ypnk",
        ),
      ).toEqual({
        configs: [
          {
            id: "Tab!3u9ypnk",
            config: {
              activeTabIdx: 0,
              tabs: [
                {
                  title: "1",
                  layout: {
                    first: "DiagnosticSummary!3v8mswd",
                    second: "DiagnosticSummary!30vin8",
                    direction: "column",
                  },
                },
                { title: "2", layout: undefined },
              ],
            },
          },
        ],
      });
    });
    it("empty tab layout", () => {
      expect(
        addPanelToTab(
          "DiagnosticSummary!4dpz3hc",
          undefined,
          undefined,
          { activeTabIdx: 0, tabs: [{ title: "1", layout: undefined }] },
          "Tab!3u9ypnk",
        ),
      ).toEqual({
        configs: [
          {
            id: "Tab!3u9ypnk",
            config: {
              activeTabIdx: 0,
              tabs: [{ title: "1", layout: "DiagnosticSummary!4dpz3hc" }],
            },
          },
        ],
      });
    });
    it("no tabs", () => {
      expect(
        addPanelToTab(
          "DiagnosticSummary!48lhb5y",
          undefined,
          undefined,
          { activeTabIdx: -1, tabs: [] },
          "Tab!1pyr7sm",
        ),
      ).toEqual({
        configs: [
          {
            id: "Tab!1pyr7sm",
            config: {
              activeTabIdx: 0,
              tabs: [{ title: "1", layout: "DiagnosticSummary!48lhb5y" }],
            },
          },
        ],
      });
    });
    it("no tab layout", () => {
      expect(
        addPanelToTab("DiagnosticSummary!48lhb5y", undefined, undefined, {}, "Tab!1pyr7sm"),
      ).toEqual({
        configs: [
          {
            id: "Tab!1pyr7sm",
            config: {
              activeTabIdx: 0,
              tabs: [{ title: "1", layout: "DiagnosticSummary!48lhb5y" }],
            },
          },
        ],
      });
    });
  });

  describe("replaceAndRemovePanels", () => {
    it("will replace multiple panel ids with new panel id", () => {
      expect(
        replaceAndRemovePanels(
          { originalId: "OldId!y", newId: "NewId!z", idsToRemove: ["RemoveMe!a", "RemoveMe!b"] },
          {
            direction: "row",
            first: { direction: "row", first: "Dummy!abc", second: "RemoveMe!b" },
            second: {
              direction: "row",
              first: "Dummy!ghi",
              second: { direction: "row", first: "OldId!y", second: "RemoveMe!a" },
            },
          },
        ),
      ).toEqual({
        direction: "row",
        first: "Dummy!abc",
        second: { direction: "row", first: "Dummy!ghi", second: "NewId!z" },
      });
    });

    it("will replace whole layout with new panel id if all panels are removed", () => {
      expect(
        replaceAndRemovePanels(
          { originalId: "OldId!y", newId: "NewId!z", idsToRemove: ["RemoveMe!a", "RemoveMe!b"] },
          {
            direction: "row",
            first: "RemoveMe!b",
            second: {
              direction: "row",
              first: "RemoveMe!a",
              second: "OldId!y",
            },
          },
        ),
      ).toEqual("NewId!z");
    });
    it("will just remove specified panels if no panel is specified to be replaced", () => {
      expect(
        replaceAndRemovePanels(
          { originalId: "OldId!y", idsToRemove: ["RemoveMe!a", "RemoveMe!b"] },
          {
            direction: "row",
            first: "RemoveMe!b",
            second: {
              direction: "row",
              first: "RemoveMe!a",
              second: "OldId!y",
            },
          },
        ),
      ).toEqual(undefined);
    });

    it("will just remove specified panels if no panel is specified as replacement", () => {
      expect(
        replaceAndRemovePanels(
          { newId: "NewId!z", idsToRemove: ["RemoveMe!a", "RemoveMe!b"] },
          {
            direction: "row",
            first: "RemoveMe!b",
            second: {
              direction: "row",
              first: "RemoveMe!a",
              second: "OldId!y",
            },
          },
        ),
      ).toEqual("OldId!y");
    });

    it("will remove whole layout if all panels are removed (without any replacement)", () => {
      expect(
        replaceAndRemovePanels(
          { idsToRemove: ["OldId!y", "RemoveMe!a", "RemoveMe!b"] },
          {
            direction: "row",
            first: "RemoveMe!b",
            second: {
              direction: "row",
              first: "RemoveMe!a",
              second: "OldId!y",
            },
          },
        ),
      ).toEqual(undefined);
    });
    it("will not modify layouts that don't contain panelIdsToRemove", () => {
      const originalLayout: MosaicNode<string> = {
        direction: "row",
        first: "RemoveMe!b",
        second: {
          direction: "row",
          first: "RemoveMe!a",
          second: "OldId!y",
        },
      };
      expect(
        replaceAndRemovePanels({ idsToRemove: ["Missing!a", "Missing!b"] }, originalLayout),
      ).toEqual(originalLayout);
    });
    it("will return undefined if all panels are replaced", () => {
      expect(
        replaceAndRemovePanels(
          { originalId: "OldId!y", idsToRemove: ["Remove!a", "Remove!b"] },
          {
            direction: "row",
            first: "Remove!a",
            second: "Remove!b",
          },
        ),
      ).toEqual(undefined);
    });
  });

  describe("updateTabPanelLayout", () => {
    it("correctly updates active tab's layout with single panel", () => {
      expect(
        updateTabPanelLayout("RosOut!abc", {
          tabs: [{ title: "A", layout: undefined }],
          activeTabIdx: 0,
        }),
      ).toEqual({
        activeTabIdx: 0,
        tabs: [{ layout: "RosOut!abc", title: "A" }],
      });
      expect(
        updateTabPanelLayout("RosOut!abc", {
          tabs: [
            { title: "A", layout: undefined },
            { title: "B", layout: "RosOut!def" },
          ],
          activeTabIdx: 1,
        }),
      ).toEqual({
        activeTabIdx: 1,
        tabs: [
          { title: "A", layout: undefined },
          { layout: "RosOut!abc", title: "B" },
        ],
      });
    });
    it("correctly updates active tab's layout with multiple panels", () => {
      const newLayout: MosaicNode<string> = {
        first: "RosOut!abc",
        second: "Audio!abc",
        direction: "row",
      };
      expect(
        updateTabPanelLayout(newLayout, {
          tabs: [{ title: "A", layout: undefined }],
          activeTabIdx: 0,
        }),
      ).toEqual({
        activeTabIdx: 0,
        tabs: [{ layout: newLayout, title: "A" }],
      });
      expect(
        updateTabPanelLayout(newLayout, {
          tabs: [
            { title: "A", layout: undefined },
            { title: "B", layout: "RosOut!def" },
          ],
          activeTabIdx: 1,
        }),
      ).toEqual({
        activeTabIdx: 1,
        tabs: [
          { title: "A", layout: undefined },
          { layout: newLayout, title: "B" },
        ],
      });
    });
    it("creates a new tab if there isn't one active", () => {
      expect(updateTabPanelLayout("RosOut!abc", { tabs: [], activeTabIdx: -1 })).toEqual({
        activeTabIdx: 0,
        tabs: [{ layout: "RosOut!abc", title: "1" }],
      });
    });
  });

  describe("reorderTabWithinTabPanel", () => {
    it("moves tab before and after other tabs", () => {
      const source = { panelId: "Tab!a", tabIndex: 1 };
      const target = { panelId: "Tab!a", tabIndex: 2 };
      const savedProps = {
        "Tab!a": { activeTabIdx: 0, tabs: [{ title: "A" }, { title: "B" }, { title: "C" }] },
      };
      const resultConfig = {
        activeTabIdx: 0,
        tabs: [{ title: "A" }, { title: "C" }, { title: "B" }],
      };
      const moveAfterConfigs = reorderTabWithinTabPanel({ source, target, savedProps }).configs;
      expect(moveAfterConfigs.length).toEqual(1);
      expect(moveAfterConfigs[0]).toEqual({ config: resultConfig, id: "Tab!a" });

      const moveBeforeConfigs = reorderTabWithinTabPanel({
        source: target,
        target: source,
        savedProps,
      }).configs;
      expect(moveBeforeConfigs.length).toEqual(1);
      expect(moveBeforeConfigs[0]).toEqual({ config: resultConfig, id: "Tab!a" });
    });
  });

  describe("moveTabBetweenTabPanels", () => {
    it("moves tab to another Tab panel", () => {
      const source = { panelId: "Tab!a", tabIndex: 1 };
      const target = { panelId: "Tab!b", tabIndex: 1 };
      const savedProps = {
        "Tab!a": { activeTabIdx: 0, tabs: [{ title: "A" }, { title: "B" }, { title: "C" }] },
        "Tab!b": { activeTabIdx: 0, tabs: [{ title: "D" }, { title: "E" }, { title: "F" }] },
      };
      const resultConfigs = moveTabBetweenTabPanels({ source, target, savedProps }).configs;
      expect(resultConfigs.length).toEqual(2);
      expect(resultConfigs[0]).toEqual({
        config: { activeTabIdx: 0, tabs: [{ title: "A" }, { title: "C" }] },
        id: "Tab!a",
      });
      expect(resultConfigs[1]).toEqual({
        config: {
          activeTabIdx: 0,
          tabs: [{ title: "D" }, { title: "B" }, { title: "E" }, { title: "F" }],
        },
        id: "Tab!b",
      });
    });
  });

  describe("validateTabPanelConfig", () => {
    it("verifies whether a tab panel config is valid", () => {
      const tabs = [{ title: "First Tab", layout: "RawMessages!a" }];
      expect(validateTabPanelConfig({ tabs })).toEqual(false);
      expect(validateTabPanelConfig({ tabs, activeTabIdx: 1 })).toEqual(false);
      expect(validateTabPanelConfig({ activeTabIdx: 1 })).toEqual(false);
      expect(validateTabPanelConfig({ tabs, activeTabIdx: 0 })).toEqual(true);
      expect(validateTabPanelConfig(undefined)).toEqual(false);
    });
  });

  describe("getPathFromNode", () => {
    it("should get a node based on id", () => {
      const tree: MosaicNode<number> = {
        direction: "row",
        first: 1,
        second: {
          direction: "column",
          first: {
            direction: "column",
            first: 2,
            second: 3,
          },
          second: 4,
        },
      };
      expect(getNodeAtPath(tree, getPathFromNode(1, tree))).toEqual(1);
      expect(getNodeAtPath(tree, getPathFromNode(2, tree))).toEqual(2);
      expect(getNodeAtPath(tree, getPathFromNode(3, tree))).toEqual(3);
      expect(getNodeAtPath(tree, getPathFromNode(4, tree))).toEqual(4);
    });
  });

  describe("getParentTabPanelByPanelId", () => {
    it("should return parent tabs by id when there is no tab config", () => {
      const configById = {
        "Tab!abc": {},
      };
      const parentTabsByPanelId = getParentTabPanelByPanelId(configById);
      expect(parentTabsByPanelId).toEqual({});
    });
  });
});
