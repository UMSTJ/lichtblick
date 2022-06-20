// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as THREE from "three";

import { toNanoSec } from "@foxglove/rostime";

import { BaseUserData, Renderable } from "../../Renderable";
import type { Renderer } from "../../Renderer";
import { Marker } from "../../ros";

const tempColor = new THREE.Color();
const tempColor2 = new THREE.Color();
const tempTuple4: THREE.Vector4Tuple = [0, 0, 0, 0];

export type MarkerUserData = BaseUserData & {
  topic: string;
  marker: Marker;
  expiresIn: bigint | undefined;
};

export function getMarkerId(topic: string, ns: string, id: number): string {
  return `${topic}:${ns ? ns + ":" : ""}${id}`.replace(/\s/g, "_");
}

export class RenderableMarker extends Renderable<MarkerUserData> {
  constructor(topic: string, marker: Marker, receiveTime: bigint | undefined, renderer: Renderer) {
    const name = getMarkerId(topic, marker.ns, marker.id);
    const hasLifetime = marker.lifetime.sec !== 0 || marker.lifetime.nsec !== 0;

    super(name, renderer, {
      receiveTime: receiveTime ?? 0n,
      messageTime: toNanoSec(marker.header.stamp),
      frameId: marker.header.frame_id,
      pose: marker.pose,
      settingsPath: ["topics", topic, marker.ns, String(marker.id)], // unused
      settings: { visible: true, frameLocked: marker.frame_locked },
      topic,
      marker,
      expiresIn: hasLifetime ? toNanoSec(marker.lifetime) : undefined,
    });
  }

  update(marker: Marker, receiveTime: bigint | undefined): void {
    const hasLifetime = marker.lifetime.sec !== 0 || marker.lifetime.nsec !== 0;

    if (receiveTime != undefined) {
      this.userData.receiveTime = receiveTime;
    }
    this.userData.messageTime = toNanoSec(marker.header.stamp);
    this.userData.frameId = marker.header.frame_id;
    this.userData.pose = marker.pose;
    this.userData.marker = marker;
    this.userData.expiresIn = hasLifetime ? toNanoSec(marker.lifetime) : undefined;
  }

  // Convert sRGB values to linear
  protected _markerColorsToLinear(
    marker: Marker,
    callback: (color: THREE.Vector4Tuple, i: number) => void,
  ): void {
    tempColor.setRGB(marker.color.r, marker.color.g, marker.color.b).convertSRGBToLinear();

    const length = marker.points.length;
    for (let i = 0; i < length; i++) {
      const srgb = marker.colors[i];
      if (srgb) {
        // Per-point color
        tempColor2.setRGB(srgb.r, srgb.g, srgb.b).convertSRGBToLinear();
        tempTuple4[0] = tempColor2.r;
        tempTuple4[1] = tempColor2.g;
        tempTuple4[2] = tempColor2.b;
        tempTuple4[3] = srgb.a;
      } else {
        // Base marker color
        tempTuple4[0] = tempColor.r;
        tempTuple4[1] = tempColor.g;
        tempTuple4[2] = tempColor.b;
        tempTuple4[3] = marker.color.a;
      }

      callback(tempTuple4, i);
    }
  }
}
