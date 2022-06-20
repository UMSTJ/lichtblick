// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { isEqual, cloneDeep, merge } from "lodash";
import React, { useCallback, useLayoutEffect, useEffect, useState, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import { useResizeDetector } from "react-resize-detector";
import { DeepPartial } from "ts-essentials";
import { useDebouncedCallback } from "use-debounce";

import Logger from "@foxglove/log";
import {
  CameraListener,
  CameraState,
  CameraStore,
  DEFAULT_CAMERA_STATE,
} from "@foxglove/regl-worldview";
import { toNanoSec } from "@foxglove/rostime";
import { PanelExtensionContext, RenderState, Topic, MessageEvent } from "@foxglove/studio";
import {
  EXPERIMENTAL_PanelExtensionContextWithSettings,
  SettingsTreeAction,
  SettingsTreeRoots,
} from "@foxglove/studio-base/components/SettingsTreeEditor/types";
import useCleanup from "@foxglove/studio-base/hooks/useCleanup";

import { DebugGui } from "./DebugGui";
import { Renderer, RendererConfig } from "./Renderer";
import { RendererContext, useRendererEvent } from "./RendererContext";
import { Stats } from "./Stats";
import { TF_DATATYPES, TRANSFORM_STAMPED_DATATYPES } from "./ros";

const log = Logger.getLogger(__filename);

const SHOW_DEBUG: true | false = false;
const PANEL_STYLE: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  position: "relative",
};
const CANVAS_STYLE: React.CSSProperties = { position: "absolute", top: 0, left: 0 };

/**
 * Provides DOM overlay elements on top of the 3D scene (e.g. stats, debug GUI).
 */
function RendererOverlay(props: { enableStats: boolean }): JSX.Element {
  const [_, setSelectedRenderable] = useState<THREE.Object3D | undefined>(undefined);

  useRendererEvent("renderableSelected", (renderable) => setSelectedRenderable(renderable));

  const stats = props.enableStats ? (
    <div id="stats" style={{ position: "absolute", top: 0 }}>
      <Stats />
    </div>
  ) : undefined;

  const debug = SHOW_DEBUG ? (
    <div id="debug" style={{ position: "absolute", top: 60 }}>
      <DebugGui />
    </div>
  ) : undefined;

  return (
    <React.Fragment>
      {stats}
      {debug}
    </React.Fragment>
  );
}

/**
 * A panel that renders a 3D scene. This is a thin wrapper around a `Renderer` instance.
 */
export function ThreeDeeRender({ context }: { context: PanelExtensionContext }): JSX.Element {
  const { initialState, saveState } = context;

  // Load and save the persisted panel configuration
  const [config, setConfig] = useState<RendererConfig>(() => {
    const partialConfig = initialState as DeepPartial<RendererConfig> | undefined;

    // Initialize the camera from default settings overlaid with persisted settings
    const cameraState: CameraState = merge(
      cloneDeep(DEFAULT_CAMERA_STATE),
      partialConfig?.cameraState,
    );

    return {
      cameraState,
      followTf: partialConfig?.followTf,
      scene: partialConfig?.scene ?? {},
      transforms: {},
      topics: partialConfig?.topics ?? {},
      layers: partialConfig?.layers ?? {},
    };
  });
  const configRef = useRef(config);
  const { cameraState } = config;
  const backgroundColor = config.scene.backgroundColor;

  const [canvas, setCanvas] = useState<HTMLCanvasElement | ReactNull>(ReactNull);
  const [renderer, setRenderer] = useState<Renderer | ReactNull>(ReactNull);
  useEffect(
    () => setRenderer(canvas ? new Renderer(canvas, configRef.current) : ReactNull),
    [canvas],
  );

  const [colorScheme, setColorScheme] = useState<"dark" | "light" | undefined>();
  const [topics, setTopics] = useState<ReadonlyArray<Topic> | undefined>();
  const [messages, setMessages] = useState<ReadonlyArray<MessageEvent<unknown>> | undefined>();
  const [currentTime, setCurrentTime] = useState<bigint | undefined>();

  const renderRef = useRef({ needsRender: false });
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

  const datatypeHandlers = useMemo(() => renderer?.datatypeHandlers ?? new Map(), [renderer]);

  // Config cameraState
  const setCameraState = useCallback((state: CameraState) => {
    setConfig((prevConfig) => ({ ...prevConfig, cameraState: state }));
  }, []);
  const [cameraStore] = useState(() => new CameraStore(setCameraState, cameraState));

  // Build a map from topic name to datatype
  const topicsToDatatypes = useMemo(() => {
    const map = new Map<string, string>();
    if (!topics) {
      return map;
    }
    for (const topic of topics) {
      map.set(topic.name, topic.datatype);
    }
    return map;
  }, [topics]);

  // Handle user changes in the settings sidebar
  const actionHandler = useCallback(
    (action: SettingsTreeAction) => renderer?.settings.handleAction(action),
    [renderer],
  );

  // Maintain the settings tree
  const [settingsTree, setSettingsTree] = useState<SettingsTreeRoots | undefined>(undefined);
  const updateSettingsTree = useCallback(
    (curRenderer: Renderer) => setSettingsTree(curRenderer.settings.tree()),
    [],
  );
  useRendererEvent("settingsTreeChange", updateSettingsTree, renderer);

  // Save the panel configuration when it changes
  const updateConfig = useCallback((curRenderer: Renderer) => setConfig(curRenderer.config), []);
  useRendererEvent("configChange", updateConfig, renderer);

  // Rebuild the settings sidebar tree as needed
  useEffect(() => {
    // eslint-disable-next-line no-underscore-dangle
    (
      context as unknown as EXPERIMENTAL_PanelExtensionContextWithSettings
    ).__updatePanelSettingsTree({
      actionHandler,
      roots: settingsTree ?? {},
    });
  }, [actionHandler, context, settingsTree]);

  // Update the renderer's reference to `config` when it changes
  useEffect(() => {
    if (renderer) {
      renderer.config = config;
      renderRef.current.needsRender = true;
    }
  }, [config, renderer]);

  // Update the renderer's reference to `topics` when it changes
  useEffect(() => {
    if (renderer) {
      renderer.setTopics(topics);
      renderRef.current.needsRender = true;
    }
  }, [topics, renderer]);

  // Save panel settings whenever they change
  const throttledSave = useDebouncedCallback(
    (newConfig: RendererConfig) => saveState(newConfig),
    1000,
    { leading: false, trailing: true, maxWait: 1000 },
  );
  useEffect(() => throttledSave(config), [config, throttledSave]);

  // Dispose of the renderer (and associated GPU resources) on teardown
  useCleanup(() => renderer?.dispose());

  // Establish a connection to the message pipeline with context.watch and context.onRender
  useLayoutEffect(() => {
    context.onRender = (renderState: RenderState, done) => {
      ReactDOM.unstable_batchedUpdates(() => {
        if (renderState.currentTime) {
          setCurrentTime(toNanoSec(renderState.currentTime));
        }

        // Set the done callback into a state variable to trigger a re-render
        setRenderDone(done);

        // Keep UI elements and the renderer aware of the current color scheme
        setColorScheme(renderState.colorScheme);

        // We may have new topics - since we are also watching for messages in
        // the current frame, topics may not have changed
        setTopics(renderState.topics);

        // currentFrame has messages on subscribed topics since the last render call
        if (renderState.currentFrame) {
          // Fully parse lazy messages
          for (const messageEvent of renderState.currentFrame) {
            const maybeLazy = messageEvent.message as { toJSON?: () => unknown };
            if ("toJSON" in maybeLazy) {
              (messageEvent as { message: unknown }).message = maybeLazy.toJSON!();
            }
          }
        }
        setMessages(renderState.currentFrame);
      });
    };

    context.watch("currentTime");
    context.watch("colorScheme");
    context.watch("topics");
    context.watch("currentFrame");
  }, [context]);

  // Build a list of topics to subscribe to
  const [topicsToSubscribe, setTopicsToSubscribe] = useState<string[] | undefined>(undefined);
  useEffect(() => {
    const subscriptions = new Set<string>();
    if (!topics) {
      setTopicsToSubscribe(undefined);
      return;
    }

    for (const topic of topics) {
      // Subscribe to all transform topics
      if (TF_DATATYPES.has(topic.datatype) || TRANSFORM_STAMPED_DATATYPES.has(topic.datatype)) {
        subscriptions.add(topic.name);
      } else if (datatypeHandlers.has(topic.datatype)) {
        // Subscribe to known datatypes if the topic has not been toggled off
        const topicConfig = config.topics[topic.name];
        if (topicConfig?.visible !== false) {
          subscriptions.add(topic.name);
        }
      }
    }

    const newTopics = Array.from(subscriptions.keys()).sort();
    setTopicsToSubscribe((prevTopics) => (isEqual(prevTopics, newTopics) ? prevTopics : newTopics));
  }, [topics, config.topics, datatypeHandlers]);

  // Notify the extension context when our subscription list changes
  useEffect(() => {
    if (!topicsToSubscribe) {
      return;
    }
    log.debug(`Subscribing to [${topicsToSubscribe.join(", ")}]`);
    context.subscribe(topicsToSubscribe.map((topic) => ({ topic, preload: false })));
  }, [context, topicsToSubscribe]);

  // Keep the renderer currentTime up to date
  useEffect(() => {
    if (renderer && currentTime != undefined) {
      renderer.currentTime = currentTime;
      renderRef.current.needsRender = true;
    }
  }, [currentTime, renderer]);

  // Keep the renderer colorScheme and backgroundColor up to date
  useEffect(() => {
    if (colorScheme && renderer) {
      renderer.setColorScheme(colorScheme, backgroundColor);
      renderRef.current.needsRender = true;
    }
  }, [backgroundColor, colorScheme, renderer]);

  // Handle messages and render a frame if new messages are available
  useEffect(() => {
    if (!renderer || !messages) {
      return;
    }

    for (const message of messages) {
      const datatype = topicsToDatatypes.get(message.topic);
      if (!datatype) {
        continue;
      }

      renderer.addMessageEvent(message, datatype);
    }

    renderRef.current.needsRender = true;
  }, [messages, renderer, topicsToDatatypes]);

  // Update the renderer when the camera moves
  useEffect(() => {
    cameraStore.setCameraState(cameraState);
    renderer?.setCameraState(cameraState);
    renderRef.current.needsRender = true;
  }, [cameraState, cameraStore, renderer]);

  // Render a new frame if requested
  useEffect(() => {
    if (renderer && renderRef.current.needsRender) {
      renderer.animationFrame();
      renderRef.current.needsRender = false;
    }
  });

  // Invoke the done callback once the render is complete
  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  // Use a debounce and 0 refresh rate to avoid triggering a resize observation while handling
  // an existing resize observation.
  // https://github.com/maslianok/react-resize-detector/issues/45
  const {
    ref: resizeRef,
    width,
    height,
  } = useResizeDetector({
    refreshRate: 0,
    refreshMode: "debounce",
  });

  return (
    <div style={PANEL_STYLE} ref={resizeRef}>
      <CameraListener cameraStore={cameraStore} shiftKeys={true}>
        <div
          // This element forces CameraListener to fill its container. We need this instead of just
          // the canvas since three.js manages the size of the canvas element and we use
          // position:absolute
          style={{ width, height }}
        />
        <canvas ref={setCanvas} style={CANVAS_STYLE} />
      </CameraListener>
      <RendererContext.Provider value={renderer}>
        <RendererOverlay enableStats={config.scene.enableStats ?? true} />
      </RendererContext.Provider>
    </div>
  );
}
