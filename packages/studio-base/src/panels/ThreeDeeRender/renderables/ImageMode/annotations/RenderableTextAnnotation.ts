// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PinholeCameraModel } from "@foxglove/den/image";
import { TextAnnotation as NormalizedTextAnnotation } from "@foxglove/studio-base/panels/Image/types";
import { Label, LabelPool } from "@foxglove/three-text";

import { BaseUserData, Renderable } from "../../../Renderable";
import { SRGBToLinear, getLuminance } from "../../../color";

/**
 * Handles rendering of 2D text annotations.
 */
export class RenderableTextAnnotation extends Renderable<BaseUserData, /*TRenderer=*/ undefined> {
  #labelPool: LabelPool;
  #label: Label;

  #scale = 0;
  #scaleNeedsUpdate = false;

  #annotation?: NormalizedTextAnnotation;
  #annotationNeedsUpdate = false;

  #cameraModel?: PinholeCameraModel;
  #cameraModelNeedsUpdate = false;

  public constructor(labelPool: LabelPool) {
    super("foxglove.ImageAnnotations.Text", undefined, {
      receiveTime: 0n,
      messageTime: 0n,
      frameId: "",
      pose: { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 0 } },
      settingsPath: [],
      settings: { visible: true },
    });

    this.#labelPool = labelPool;
    this.#label = labelPool.acquire();
    this.#label.setAnchorPoint(0, 0);
    this.#label.setBillboard(true);
    this.#label.setSizeAttenuation(false);

    this.add(this.#label);
  }

  public override dispose(): void {
    this.#labelPool.release(this.#label);
    super.dispose();
  }

  public setScale(
    scale: number,
    _canvasWidth: number,
    _canvasHeight: number,
    _pixelRatio: number,
  ): void {
    this.#scaleNeedsUpdate ||= scale !== this.#scale;
    this.#scale = scale;
  }

  public setCameraModel(cameraModel: PinholeCameraModel | undefined): void {
    this.#cameraModelNeedsUpdate ||= this.#cameraModel !== cameraModel;
    this.#cameraModel = cameraModel;
  }

  public setAnnotation(annotation: NormalizedTextAnnotation): void {
    this.#annotationNeedsUpdate ||= this.#annotation !== annotation;
    this.#annotation = annotation;
  }

  public update(): void {
    if (!this.#annotation || !this.#cameraModel) {
      this.visible = false;
      return;
    }
    this.visible = true;

    const { position, text, textColor, backgroundColor, fontSize } = this.#annotation;

    // Update line width if thickness or scale has changed
    if (this.#annotationNeedsUpdate || this.#scaleNeedsUpdate) {
      this.#label.setLineHeight(fontSize * this.#scale);
      this.#scaleNeedsUpdate = false;
    }

    if (this.#annotationNeedsUpdate) {
      this.#label.setText(text);
      this.#label.setColor(
        SRGBToLinear(textColor.r),
        SRGBToLinear(textColor.g),
        SRGBToLinear(textColor.b),
      );
      this.#label.setOpacity(textColor.a);

      if (backgroundColor) {
        this.#label.setBackgroundColor(
          SRGBToLinear(backgroundColor.r),
          SRGBToLinear(backgroundColor.g),
          SRGBToLinear(backgroundColor.b),
        );
      } else {
        const foregroundIsDark = getLuminance(textColor.r, textColor.g, textColor.b) < 0.5;
        if (foregroundIsDark) {
          this.#label.setBackgroundColor(1, 1, 1);
        } else {
          this.#label.setBackgroundColor(0, 0, 0);
        }
      }
    }

    if (this.#annotationNeedsUpdate || this.#cameraModelNeedsUpdate) {
      if (!this.#cameraModel.projectPixelTo3dPlane(this.#label.position, position)) {
        this.visible = false;
      }
    }

    this.#annotationNeedsUpdate = false;
    this.#cameraModelNeedsUpdate = false;
  }
}
