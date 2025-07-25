// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as _ from "lodash-es";
import * as THREE from "three";
import { DeepPartial, Writable } from "ts-essentials";

import { MessageEvent, SettingsTreeAction } from "@lichtblick/suite";
import { PanelContextMenuItem } from "@lichtblick/suite-base/components/PanelContextMenu";
import { DraggedMessagePath } from "@lichtblick/suite-base/components/PanelExtensionAdapter";

import type { AnyRendererSubscription, IRenderer, RendererConfig } from "./IRenderer";
import { Path } from "./LayerErrors";
import { Renderable } from "./Renderable";
import type { SettingsTreeEntry } from "./SettingsManager";
import { missingTransformMessage, MISSING_TRANSFORM } from "./renderables/transforms";
import { AnyFrameId } from "./transforms";
import { updatePose } from "./updatePose";

export type PartialMessage<T> = DeepPartial<T>;

export type PartialMessageEvent<T> = MessageEvent<DeepPartial<T>>;

/**
 * SceneExtension is a base class for extending the 3D scene. It extends THREE.Object3D and is a
 * child of the THREE.Scene with an identity position and orientation (origin is the render frame
 * origin). The `startFrame()` method will automatically call `updatePose()` for each Renderable in
 * the `renderables` map, placing it at the correct pose given the current renderer TransformTree.
 *
 * A minimum implementation can simply add THREE.Object3D instances using `this.add()`. If these
 * instances are Renderables and also added to this.renderables, their pose will be kept
 * up-to-date in `startFrame()`.
 *
 * - Override `dispose()` to dispose of any unmanaged resources such as GPU buffers. Don't forget
 *   to call `super.dispose()`.
 * - Override `startFrame()` to execute code at the start of each frame. Call `super.startFrame()`
 *   to run `updatePose()` on each entry in `this.renderables`.
 * - Override `settingsNodes()` to add entries to the settings sidebar.
 * - Message subscriptions are created with `getSubscriptions()`.
 * - Custom layer actions are added with `renderer.addCustomLayerAction()`.
 */
export class SceneExtension<
  TRenderable extends Renderable = Renderable,
  E extends THREE.Object3DEventMap = THREE.Object3DEventMap,
> extends THREE.Object3D<E> {
  /** A unique identifier for this SceneExtension, such as `foxglove.Markers`. */
  public readonly extensionId: string;
  /** A reference to the parent `Renderer` instance. */
  protected readonly renderer: IRenderer;
  /** HUD API to place things on the canvas*/
  public readonly hud: IRenderer["hud"];
  /**
   * A map of string identifiers to Renderable instances. SceneExtensions are free to use any IDs
   * they choose, although topic names are a common choice for extensions display up to one
   * renderable per topic.
   */
  public readonly renderables = new Map<string, TRenderable>();

  /**
   * @param extensionId A unique identifier for this SceneExtension, such as `foxglove.Markers`.
   * @param renderer A reference to the parent `Renderer` instance.
   */
  public constructor(extensionId: string, renderer: IRenderer) {
    super();
    this.extensionId = this.name = extensionId;
    this.renderer = renderer;
    this.hud = renderer.hud;
    // updateSettingsTree() will call settingsNodes() which may be overridden in a child class.
    // The child class may not assign its members until after this constructor returns. This breaks
    // type assumptions, so we need to defer the call to updateSettingsTree()
    queueMicrotask(() => {
      this.updateSettingsTree();
    });
  }

  /**
   * Called when the scene is being destroyed. Free any unmanaged resources such as GPU buffers
   * here. The base class implementation calls dispose() on all `renderables`.
   */
  public dispose(): void {
    for (const renderable of this.renderables.values()) {
      renderable.dispose();
    }
    this.children.length = 0;
    this.renderables.clear();
  }

  /**
   * Will add subscriptions from this scene extension to the renderer
   * This will be called by the renderer when building topic and schema subscriptions on
   * initialization and when imageOnlyMode becomes enabled
   */
  public getSubscriptions(): readonly AnyRendererSubscription[] {
    return [];
  }

  /**
   * Called when seeking or a new data source is loaded. The base class implementation removes all
   * `renderables` and calls `updateSettingsTree()`.
   */
  public removeAllRenderables(): void {
    for (const renderable of this.renderables.values()) {
      renderable.dispose();
      this.remove(renderable);
    }
    this.renderables.clear();
    this.updateSettingsTree();
  }

  /** Allows SceneExtensions to add options to the context menu. */
  public getContextMenuItems(): readonly PanelContextMenuItem[] {
    return [];
  }

  /**
   * Returns a list of settings nodes generated by this extension and the paths they appear at in
   * the settings sidebar. This method is only called when the scene fundamentally changes such as
   * new topics appearing or seeking. To manually trigger this method being called, use
   * `updateSettingsTree()`. The base class implementation returns an empty list.
   */
  public settingsNodes(): SettingsTreeEntry[] {
    return [];
  }

  /**
   * Handler for settings tree updates such as visibility toggling or field edits. This is a stub
   * meant to be overridden in derived classes and used as the handler for settings tree nodes.
   */
  public handleSettingsAction = (action: SettingsTreeAction): void => {
    void action;
  };

  /**
   * Manually triggers an update of the settings tree for the nodes generated by this extension. The
   * `settingsNodes()` method will be called to retrieve the latest nodes.
   */
  public updateSettingsTree(): void {
    this.renderer.settings.setNodesForKey(this.extensionId, this.settingsNodes());
  }

  /**
   * Persists a value to the panel configuration at the given path. The base class implementation
   * calls `renderer.updateConfig()` and `updateSettingsTree()`.
   */
  public saveSetting(path: Path, value: unknown): void {
    // Update the configuration
    this.renderer.updateConfig((draft) => {
      if (value == undefined) {
        _.unset(draft, path);
      } else {
        _.set(draft, path, value);
      }
    });

    // Update the settings sidebar
    this.updateSettingsTree();
  }

  /**
   * Can be overridden to react to color scheme changes. The base class implementation does nothing.
   */
  public setColorScheme(
    colorScheme: "dark" | "light",
    backgroundColor: THREE.Color | undefined,
  ): void {
    void colorScheme;
    void backgroundColor;
  }

  /** Returns a drop effect if the Scene Extension can handle a message path drop, undefined if it cannot */
  public getDropEffectForPath = (path: DraggedMessagePath): "add" | "replace" | undefined => {
    void path;
    return undefined;
  };

  /** Called when a Message Path is dropped on the panel. Allows the scene extension to update the config in response.
   * All updates across all SceneExtensions will occur in one `updateConfig` call on the Renderer
   */
  public updateConfigForDropPath = (
    draft: Writable<RendererConfig>,
    path: DraggedMessagePath,
  ): void => {
    void draft;
    void path;
  };

  /**
   * Called before the Renderer renders a new frame. The base class implementation calls
   * updatePose() for each entry in `this.renderables`.
   * @param currentTime Current time of the scene being rendered in nanoseconds. This is the
   *   playback timestamp not a message timestamp, so it only makes sense to compare it to
   *   `receiveTime` values.
   * @param renderFrameId Coordinate frame where the scene camera is currently located.
   * @param fixedFrameId The root coordinate frame of the scene, called the fixed frame because it
   *   does not move relative to any parent frame. The fixed frame is the root frame of the render
   *   frame.
   */
  public startFrame(
    currentTime: bigint,
    renderFrameId: AnyFrameId,
    fixedFrameId: AnyFrameId,
  ): void {
    for (const renderable of this.renderables.values()) {
      const path = renderable.userData.settingsPath;

      // Update the THREE.Object3D.visible flag from the user settings visible toggle. If this
      // renderable is not visible, clear any layer errors and skip its per-frame update logic
      renderable.visible = renderable.userData.settings.visible;
      if (!renderable.visible) {
        this.renderer.settings.errors.clearPath(path);
        continue;
      }

      // SceneExtension Renderables exist in a coordinate frame (`frameId`) at some position and
      // orientation (`pose`) at a point in time (`messageTime` if `frameLocked` is false, otherwise
      // `currentTime`). The scene is rendered from the point of view of another coordinate frame
      // (`renderFrameId`) that is part of a coordinate frame hierarchy with `fixedFrameId` at its
      // root (`renderFrameId` can be equal to `fixedFrameId`). The fixed is assumed to be the
      // static world coordinates that all other frames connect to.
      //
      // Before each visual frame is rendered, every Renderable is transformed from its own
      // coordinate frame (at its own `messageTime` when `frameLocked` is false) to the fixed frame
      // at `currentTime` and then to the render frame at `currentTime`. This transformation is
      // done using transform interpolation, so as new transform messages are received the results
      // of this interpolation can change from frame to frame
      const frameLocked = renderable.userData.settings.frameLocked ?? true;
      const srcTime = frameLocked ? currentTime : renderable.userData.messageTime;
      const frameId = renderable.userData.frameId;
      const updated = updatePose(
        renderable,
        this.renderer.transformTree,
        renderFrameId,
        fixedFrameId,
        frameId,
        currentTime,
        srcTime,
      );
      if (!updated) {
        const message = missingTransformMessage(renderFrameId, fixedFrameId, frameId);
        this.renderer.settings.errors.add(path, MISSING_TRANSFORM, message);
      } else {
        this.renderer.settings.errors.remove(path, MISSING_TRANSFORM);
      }
    }
  }
}

/**
 * Takes a list of MessageEvents, groups them by topic, then takes the last message for each topic and adds it to the return array.
 * Used for filtering the subscription message queue between frames (`filterQueue` on `RendererSubscriptions`), such that we don't
 * unnecessarily process messages that will be overwritten.
 */
export function onlyLastByTopicMessage<T>(msgs: MessageEvent<T>[]): MessageEvent<T>[] {
  if (msgs.length === 0) {
    return [];
  }
  /**
   * NOTE: We group by topic because renderables are keyed by topic. If a renderable does not represent the current state of a topic,
   * what we group by will need to change.
   *
   * ALSO: for message converters. Both the original message and converted message are in the queue. This depends on the
   * converted message being after the original message. Which is currently the case.
   */
  const msgsByTopic = _.groupBy(msgs, (msg) => msg.topic);

  const list = Object.values(msgsByTopic).map((topicMsgs) => topicMsgs[topicMsgs.length - 1]!);

  return list;
}
