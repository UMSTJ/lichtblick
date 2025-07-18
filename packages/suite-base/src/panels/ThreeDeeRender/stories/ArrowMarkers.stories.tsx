// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { StoryObj } from "@storybook/react";

import { MessageEvent } from "@lichtblick/suite";
import { Topic } from "@lichtblick/suite-base/players/types";
import PanelSetup from "@lichtblick/suite-base/stories/PanelSetup";

import {
  BASE_LINK_FRAME_ID,
  FIXED_FRAME_ID,
  makeColor,
  QUAT_IDENTITY,
  rad2deg,
  SENSOR_FRAME_ID,
} from "./common";
import useDelayedFixture from "./useDelayedFixture";
import ThreeDeePanel from "../index";
import { Marker, TransformStamped } from "../ros";

export default {
  title: "panels/ThreeDeeRender",
  component: ThreeDeePanel,
};

export const ArrowMarkers: StoryObj = {
  render: function Story() {
    const topics: Topic[] = [
      { name: "/tf", schemaName: "geometry_msgs/TransformStamped" },
      { name: "/arrows", schemaName: "visualization_msgs/Marker" },
    ];

    const tf1: MessageEvent<TransformStamped> = {
      topic: "/tf",
      receiveTime: { sec: 10, nsec: 0 },
      message: {
        header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: FIXED_FRAME_ID },
        child_frame_id: BASE_LINK_FRAME_ID,
        transform: {
          translation: { x: 1e7, y: 0, z: 0 },
          rotation: QUAT_IDENTITY,
        },
      },
      schemaName: "geometry_msgs/TransformStamped",
      sizeInBytes: 0,
    };
    const tf2: MessageEvent<TransformStamped> = {
      topic: "/tf",
      receiveTime: { sec: 10, nsec: 0 },
      message: {
        header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: BASE_LINK_FRAME_ID },
        child_frame_id: SENSOR_FRAME_ID,
        transform: {
          translation: { x: 0, y: 0, z: 1 },
          rotation: { x: 0.383, y: 0, z: 0, w: 0.924 },
        },
      },
      schemaName: "geometry_msgs/TransformStamped",
      sizeInBytes: 0,
    };

    const arrow1: MessageEvent<Partial<Marker>> = {
      topic: "/arrows",
      receiveTime: { sec: 10, nsec: 0 },
      message: {
        header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: BASE_LINK_FRAME_ID },
        id: 0,
        ns: "",
        type: 0,
        action: 0,
        frame_locked: false,
        pose: {
          position: { x: 0.4, y: 0, z: 1 },
          orientation: QUAT_IDENTITY,
        },
        scale: { x: 0.75, y: 0.001, z: 0.25 },
        color: makeColor("#f44336", 0.5),
        lifetime: { sec: 0, nsec: 0 },
      },
      schemaName: "visualization_msgs/Marker",
      sizeInBytes: 0,
    };

    const arrow2: MessageEvent<Partial<Marker>> = {
      topic: "/arrows",
      receiveTime: { sec: 10, nsec: 0 },
      message: {
        header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: SENSOR_FRAME_ID },
        id: 1,
        ns: "",
        type: 0,
        action: 0,
        frame_locked: false,
        pose: {
          position: { x: 0, y: 0.3, z: 0 },
          orientation: { x: 0, y: 0, z: Math.SQRT1_2, w: Math.SQRT1_2 },
        },
        scale: { x: 0.3, y: 0.05, z: 0.05 },
        color: makeColor("#4caf50", 0.5),
        lifetime: { sec: 0, nsec: 0 },
      },
      schemaName: "visualization_msgs/Marker",
      sizeInBytes: 0,
    };

    const arrow3: MessageEvent<Partial<Marker>> = {
      topic: "/arrows",
      receiveTime: { sec: 10, nsec: 0 },
      message: {
        header: { seq: 0, stamp: { sec: 0, nsec: 0 }, frame_id: SENSOR_FRAME_ID },
        id: 2,
        ns: "",
        type: 0,
        action: 0,
        frame_locked: false,
        pose: {
          position: { x: 0, y: 0, z: 0.35 },
          orientation: { x: 0, y: -Math.SQRT1_2, z: 0, w: Math.SQRT1_2 },
        },
        scale: { x: 0.05, y: 0.1, z: 0.15 },
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 0.3, y: 0, z: 0 },
        ],
        color: makeColor("#2196f3", 0.5),
        lifetime: { sec: 0, nsec: 0 },
      },
      schemaName: "visualization_msgs/Marker",
      sizeInBytes: 0,
    };

    const fixture = useDelayedFixture({
      topics,
      frame: {
        "/tf": [tf1, tf2],
        "/arrows": [arrow1, arrow2, arrow3],
      },
      capabilities: [],
      activeData: {
        currentTime: { sec: 0, nsec: 0 },
      },
    });

    return (
      <PanelSetup fixture={fixture}>
        <ThreeDeePanel
          overrideConfig={{
            ...ThreeDeePanel.defaultConfig,
            followTf: "base_link",
            cameraState: {
              distance: 4,
              perspective: true,
              phi: rad2deg(1),
              targetOffset: [-0.6, 0.5, 0],
              thetaOffset: rad2deg(-1),
              fovy: rad2deg(0.75),
              near: 0.01,
              far: 5000,
              target: [0, 0, 0],
              targetOrientation: [0, 0, 0, 1],
            },
            topics: {
              "/arrows": { visible: true },
            },
          }}
        />
      </PanelSetup>
    );
  },

  parameters: { colorScheme: "dark" },
};
