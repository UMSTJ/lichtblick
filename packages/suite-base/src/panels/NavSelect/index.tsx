/* eslint-disable react/forbid-component-props */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/* eslint-disable @typescript-eslint/no-unused-vars */
// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/* eslint-disable react-hooks/exhaustive-deps */
// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/* eslint-disable @typescript-eslint/use-unknown-in-catch-callback-variable */
// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/* eslint-disable @typescript-eslint/no-unnecessary-condition */
// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Button, Stack } from "@mui/material";
// import { Card } from "antd";
// import { use } from "cytoscape";
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// @ts-ignore
import yaml from 'js-yaml';

import { useDataSourceInfo } from "@lichtblick/suite-base/PanelAPI";
import { useMessageDataItem } from "@lichtblick/suite-base/components/MessagePathSyntax/useMessageDataItem";
import Panel from "@lichtblick/suite-base/components/Panel";
import PanelToolbar from "@lichtblick/suite-base/components/PanelToolbar";
import useCallbackWithToast from "@lichtblick/suite-base/hooks/useCallbackWithToast";
import usePublisher from "@lichtblick/suite-base/hooks/usePublisher";
import sendNotification from "@lichtblick/suite-base/util/sendNotification";
import BatteryIndicator from "@lichtblick/suite-base/panels/VehicleControl/components/BatteryIndicator";
import FileUploadModal from "@lichtblick/suite-base/panels/VehicleControl/components/FileUploadModal";
import MapFilesTab from "@lichtblick/suite-base/panels/VehicleControl/components/MapFilesTab";
import TextCard from "@lichtblick/suite-base/panels/VehicleControl/components/TextCard";
// import demap from "@lichtblick/suite-base/panels/VehicleControl/map.png";
import {
  defaultConfig,
  useVehicleControlSettings,
} from "@lichtblick/suite-base/panels/VehicleControl/settings";
import { VehicleControlConfig } from "@lichtblick/suite-base/panels/VehicleControl/types";
import { SaveConfig } from "@lichtblick/suite-base/types/panels";

import {
  parseAndRenderNavPoints,
  RFIDInteractionManager,
  debounce,
} from "./manager/RFIDInteractionManager";
import { MessagePipelineContext, useMessagePipeline } from "@lichtblick/suite-base/components/MessagePipeline";

type Props = {
  config: VehicleControlConfig;
  saveConfig: SaveConfig<VehicleControlConfig>;
};
type SandTableMap = {
  map: THREE.DataTexture;
  json: any;
  pgmData: { width: number; height: number; maxVal: number; data: Uint8Array };
  mapConfig: any;
};

const NavSelectPanel: React.FC<Props> = ({ config, saveConfig }) => {
  const mountRef = useRef<HTMLDivElement | ReactNull>(ReactNull);
  const sceneRef = useRef<THREE.Scene | ReactNull>(ReactNull);
  const cameraRef = useRef<THREE.PerspectiveCamera | ReactNull>(ReactNull);
  const rendererRef = useRef<THREE.WebGLRenderer | ReactNull>(ReactNull);
  const controlsRef = useRef<OrbitControls | ReactNull>(ReactNull);
  const resizeObserverRef = useRef<ResizeObserver | undefined>(undefined);
  const batteryPercentageRef = useRef<number | undefined>(0);
  const animationFrameRef = useRef<number>();

  // 在组件顶部添加这些状态
  // @ts-ignore
  const [imageLoadStatus, setImageLoadStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  // const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [isSceneReady, setIsSceneReady] = useState(false);

  const [map, setMap] = useState<SandTableMap | undefined>(undefined);
  const [mapName, setMapName] = useState<string>("");
  const [mapFiles, setMapFiles] = useState<string[]>([]);
  const [openModal, setOpenModal] = useState(false);
  // const WORLD_WIDTH = 10;
  const { nodeTopicName, nodeDatatype, pathSource, rfidSource, batterySource, update_map } = config;

  const rfidMessages = useMessageDataItem(rfidSource);
  const pathMessages = useMessageDataItem(pathSource);
  const batteryMessages = useMessageDataItem(batterySource);

  const rfidObj = rfidMessages[rfidMessages.length - 1] as {
    queriedData: { value: { data: string } }[];
  };
  const pathObj = pathMessages[pathMessages.length - 1] as {
    queriedData: { value: { target_rfids: number[] } }[];
  };
  const batteryObj = batteryMessages[batteryMessages.length - 1] as {
    queriedData: { value: { percentage: number } }[];
  };

  const interactionManagerRef = useRef<RFIDInteractionManager | undefined>(
    new RFIDInteractionManager(sceneRef.current!),
  );

  const { topics, datatypes } = useDataSourceInfo();
  useVehicleControlSettings(config, saveConfig, topics, datatypes);

  const nodePublish = usePublisher({
    name: "Publish",
    topic: nodeTopicName,
    schemaName: nodeDatatype,
    datatypes,
  });

  const selectPlayerName = (ctx: MessagePipelineContext) => ctx.playerState.name;
  const [ipAddr, setIpAddr] = useState("");
  const playerName = useMessagePipeline(selectPlayerName);
  useEffect(() => {
    if (playerName) {
      setIpAddr(getIpAddress(playerName));
    }
  }, [playerName]);
  function getIpAddress(name: string): string {
    if (!name) return "";
    let addressPart = name.startsWith("ws://") ? name.substring(5) : name;
    const firstSpaceIndex = addressPart.indexOf(" ");
    if (firstSpaceIndex !== -1) addressPart = addressPart.substring(0, firstSpaceIndex);
    let host = addressPart.split(":")[0] ?? "";
    return `${host}:9000`;
  }
  // useEffect(() => {
  //   setIpAddr("192.243.117.147:9000");
  // }, []);

  // 在现有的useEffect之外添加这个新的useEffect
  // useEffect(() => {
  //   if (!map?.map) {
  //     console.error("No map image URL available");
  //     setImageLoadStatus("error");
  //     return;
  //   }
  //
  //   setImageLoadStatus("loading");
  //   console.log("Testing image load from URL:", map.map);
  //
  //   // 保存URL以便在UI中使用
  //   // setImageUrl(map.map);
  //
  //   const testImg = new Image();
  //   testImg.onload = () => {
  //     console.log("TEST IMAGE LOADED SUCCESSFULLY:", testImg.width, "x", testImg.height);
  //     setImageLoadStatus("success");
  //   };
  //   testImg.onerror = (err) => {
  //     console.error("TEST IMAGE LOAD FAILED:", err);
  //     setImageLoadStatus("error");
  //   };
  //   testImg.src = map.map;
  // }, [map?.map]);
  useEffect(() => {
    setOpenModal(update_map);
  }, [update_map]);

  useEffect(() => {
    if (imageLoadStatus === "error") {
      //toast.error("Map image load failed. Please check the map image path and try again.");
      // loadMapAndJson();
    }
  }, [imageLoadStatus]);

  const setEndNode = useCallbackWithToast(
    (rfidEnd: number) => {
      if (nodeTopicName) {
        nodePublish({ end_node: rfidEnd, pass_nodes: [] } as Record<string, unknown>);
      } else {
        throw new Error("Invalid topic name");
      }
    },
    [nodeTopicName, nodePublish],
  );

  useEffect(() => {
    try {
      const rfid = rfidObj.queriedData[0]?.value?.data ?? "";
      if (Number.parseInt(rfid) !== 0 && rfid !== "") {
        interactionManagerRef.current?.setCurrentPosition(Number.parseInt(rfid));
      }
      interactionManagerRef.current?.animateCurrentPosition();

      const path = pathObj.queriedData[0]?.value ? pathObj.queriedData[0].value.target_rfids : [];

      interactionManagerRef.current?.highlightRoute(path);
    } catch (error) {
      //console.error("Failed to set end node:", error);
    }
  }, [rfidObj, pathObj]);

  useEffect(() => {
    try {
      const battery = batteryObj.queriedData[0]?.value.percentage;

      if (battery !== batteryPercentageRef.current) {
        batteryPercentageRef.current = battery;
      }
    } catch (error) {
      console.error("Failed to get battery percentage:", error);
    }
  }, [batteryObj]);



  // // 解析新的导航点数据格式
  // const parseAndRenderNavPoints = (
  //   navData: {
  //     mapName: string;
  //     points: Array<{
  //       x: number;
  //       y: number;
  //       id: number;
  //       name: string;
  //       orientation: { x: number; y: number; z: number; w: number };
  //     }>;
  //     edges: Array<{
  //       id: number;
  //       nodeStart: number;
  //       nodeEnd: number;
  //       weight: number;
  //       points: Array<{ x: number; y: number }>;
  //     }>;
  //   },
  //   scene: THREE.Scene,
  //   mapSize: { width: number; height: number },
  // ) => {
  //   console.log("navData", navData);
  //   if (!navData.points || !navData.edges) {
  //     return;
  //   }

  //   // 创建交互管理器
  //   const interactionManager = new RFIDInteractionManager(
  //     scene,
  //     "#ffffff",
  //     "#000000",
  //   );

  //   const WORLD_WIDTH = 10;
  //   const rfidSize = 0.12;

  //   // 渲染导航点
  //   navData.points.forEach((point) => {
  //     // 转换坐标 - 新格式的坐标已经是世界坐标，不需要转换
  //     const x = point.x;
  //     const y = point.y;

  //     // 创建RFID点几何体
  //     const geometry = new THREE.CircleGeometry(rfidSize, 32);
  //     const material = new THREE.MeshBasicMaterial({
  //       color: "#ffffff",
  //       transparent: true,
  //       opacity: 0.8,
  //     });
  //     const rfidPoint = new THREE.Mesh(geometry, material);
  //     rfidPoint.position.set(x, y, 0.01);

  //     // 创建边框
  //     const strokeGeometry = new THREE.CircleGeometry(rfidSize * 1.1, 32);
  //     const strokeMaterial = new THREE.MeshBasicMaterial({
  //       color: "#050215",
  //       transparent: false,
  //       opacity: 0.8,
  //     });
  //     const strokeCircle = new THREE.Mesh(strokeGeometry, strokeMaterial);
  //     strokeCircle.position.set(x, y, 0.005);

  //     // 创建文字标签
  //     const createTextSprite = (text: string, color: string = "#003C80FF", fontSize: number = 13) => {
  //       const canvas = document.createElement("canvas");
  //       const context = canvas.getContext("2d");
  //       if (!context) {
  //         return undefined;
  //       }

  //       canvas.width = 256;
  //       canvas.height = 256;

  //       context.font = `${fontSize * 6}px Arial`;
  //       context.textAlign = "center";
  //       context.textBaseline = "middle";
  //       context.fillStyle = color;

  //       context.fillText(text, canvas.width / 2, canvas.height / 2);

  //       const texture = new THREE.Texture(canvas);
  //       texture.needsUpdate = true;

  //       const spriteMaterial = new THREE.SpriteMaterial({
  //         map: texture,
  //         transparent: true,
  //       });

  //       const sprite = new THREE.Sprite(spriteMaterial);
  //       sprite.scale.set(0.5, 0.5, 1);

  //       return sprite;
  //     };

  //     const textSprite = createTextSprite(point.id.toString(), "#000000", 12);

  //     if (textSprite) {
  //       textSprite.position.x = x;
  //       textSprite.position.y = y + 0.001;
  //       textSprite.position.z = 0.011;
  //     }

  //     // 创建RFID组
  //     const rfidGroup = new THREE.Group();
  //     rfidGroup.add(rfidPoint);
  //     rfidGroup.add(strokeCircle);
  //     if (textSprite) {
  //       rfidGroup.add(textSprite);
  //     }

  //     rfidGroup.userData = {
  //       id: point.id,
  //       type: "rfid",
  //     };

  //     scene.add(rfidGroup);
  //     console.log("rfidGroupadd", rfidGroup);

  //     // 注册RFID点到交互管理器
  //     interactionManager.registerRfidPoint(point.id, rfidPoint);
  //   });

  //   // 渲染路径边
  //   navData.edges.forEach((edge) => {
  //     const group = new THREE.Group();

  //     // 获取起点和终点的坐标
  //     const startPoint = navData.points.find(p => p.id === edge.nodeStart);
  //     const endPoint = navData.points.find(p => p.id === edge.nodeEnd);

  //     if (!startPoint || !endPoint) {
  //       return;
  //     }

  //     // 创建路径线段
  //     const points: THREE.Vector3[] = [];

  //     // 添加起点
  //     points.push(new THREE.Vector3(startPoint.x, startPoint.y, 0.001));

  //     // 添加中间点（如果有的话）
  //     if (edge.points && edge.points.length > 0) {
  //       edge.points.forEach((point) => {
  //         // 这里需要根据实际数据格式调整坐标转换
  //         // 假设edge.points中的坐标是相对于路径的插值点
  //         const interpolatedX = startPoint.x + (endPoint.x - startPoint.x) * point.x;
  //         const interpolatedY = startPoint.y + (endPoint.y - startPoint.y) * point.y;
  //         points.push(new THREE.Vector3(interpolatedX, interpolatedY, 0.001));
  //       });
  //     }

  //     // 添加终点
  //     points.push(new THREE.Vector3(endPoint.x, endPoint.y, 0.001));

  //     // 创建线段几何体
  //     const geometry = new THREE.BufferGeometry().setFromPoints(points);
  //     const material = new THREE.LineBasicMaterial({
  //       color: "#262626",
  //       linewidth: 4,
  //       opacity: 1,
  //       transparent: true,
  //     });

  //     const line = new THREE.Line(geometry, material);
  //     group.add(line);

  //     // 添加组的用户数据
  //     group.userData = {
  //       id: edge.id,
  //       type: "path",
  //       startRfid: edge.nodeStart,
  //       endRfid: edge.nodeEnd,
  //     };
  //     console.log("grouplineadd", group);

  //     scene.add(group);

  //     // 注册路径到交互管理器
  //     interactionManager.registerPath(edge.id, group);
  //   });

  //   return interactionManager;
  // };

  // 初始化 Three.js
  // @ts-ignore
  const [mapConfig, setMapConfig] = useState<any>(null);

  const initThreeJS = useCallback(() => {
    if (!map?.map || !map?.json || !mountRef.current || !map?.pgmData || !map?.mapConfig) {
      console.error("map/pgmData/mapConfig/mountRef.current is undefined");
      return;
    }
    const mount = mountRef.current;
    // 创建场景
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      75,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;
    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
      alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 2);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setSize(mount.clientWidth, mount.clientHeight, false);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    // 创建控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = false;
    controls.autoRotate = false;
    controls.enablePan = true;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
    };
    controls.minDistance = 0.1;
    controls.maxDistance = 100;
    controlsRef.current = controls;
    // 添加光源
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);
    // 加载PGM纹理
    if (map.map instanceof THREE.DataTexture) {
      // 对于新的导航点数据格式，我们需要估算地图尺寸
      // 从导航点数据中计算边界框来确定地图尺寸
      let mapWidth = 10;
      let mapHeight = 10;

      if (map.json.points && map.json.points.length > 0) {
        const points = map.json.points;
        const minX = Math.min(...points.map((p: any) => p.x));
        const maxX = Math.max(...points.map((p: any) => p.x));
        const minY = Math.min(...points.map((p: any) => p.y));
        const maxY = Math.max(...points.map((p: any) => p.y));

        const rangeX = maxX - minX;
        const rangeY = maxY - minY;
        const maxRange = Math.max(rangeX, rangeY);

        // 设置地图尺寸，确保所有点都在可见范围内
        mapWidth = maxRange * 1.0; // 添加20%的边距
        mapHeight = maxRange * 1.0;
      }

      const mapGeometry = new THREE.PlaneGeometry(mapWidth, mapHeight);
      const mapMaterial = new THREE.MeshBasicMaterial({ map: map.map });
      mapMaterial.needsUpdate = true;
      const mapMesh = new THREE.Mesh(mapGeometry, mapMaterial);
      scene.add(mapMesh);

      // 组装options
      const options = {
        origin: map.mapConfig.origin,
        resolution: map.mapConfig.resolution,
        pgmWidth: map.pgmData.width,
        pgmHeight: map.pgmData.height
      };
      console.log("options", options);
      console.log("map.map", map.map);
      interactionManagerRef.current = parseAndRenderNavPoints(map.json, scene, {
        width: mapWidth,
        height: mapHeight,
      }, options);

      // 强制刷新所有Group/Line，解决Three.js渲染bug
      const forceRefresh = () => {
        // 只处理Group和Line
        const objs = scene.children.filter(obj => obj.type === "Group" || obj.type === "Line");
        objs.forEach(obj => {
          scene.remove(obj);
          scene.add(obj);
        });
        renderer.render(scene, camera);
      };
      forceRefresh();

      // 调试：打印scene.children
      console.log("[调试] scene.children:", scene.children);
      if (scene.children.length <= 1) {
        sendNotification("未检测到点线对象，请检查数据或坐标范围", "", "user", "warn");
      }

      // 强制刷新一次，确保新加对象可见
      renderer.render(scene, camera);

      const maxDimension = Math.max(mapWidth, mapHeight);
      camera.position.z = maxDimension * 0.7;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      setTimeout(() => {
        mapMaterial.needsUpdate = true;
        for (let i = 0; i < 5; i++) {
          renderer.render(scene, camera);
        }
        setIsSceneReady(true);
      }, 1000);
    } else {
      console.error("map.map is not a DataTexture");
    }
    // 渲染循环
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
  }, [map]);

  useEffect(() => {
    if (mountRef.current && map) {
      // 先清理旧的场景
      if (rendererRef.current && mountRef.current.contains(rendererRef.current.domElement)) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }

      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (object.material instanceof THREE.Material) {
              object.material.dispose();
            }
          }
        });
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // 然后初始化新场景
      initThreeJS();
    }
  }, [mountRef.current, map, initThreeJS]);

  useEffect(() => {
    if (!isSceneReady || !rendererRef.current) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (!cameraRef.current || !rendererRef.current || !interactionManagerRef.current) {
        return;
      }

      try {
        interactionManagerRef.current.handleClick(event, cameraRef.current, rendererRef.current);

        const selectedRfidId = interactionManagerRef.current.getSelectedRfidId();
        if (selectedRfidId) {
          setEndNode(Number(selectedRfidId)).catch(console.error);
        }
      } catch (error) {
        console.error("Click handling error:", error);
      }
    };

    // 右键点击事件处理
    const handleRightClick = (event: MouseEvent) => {
      event.preventDefault(); // 阻止默认右键菜单

      if (!cameraRef.current || !rendererRef.current || !interactionManagerRef.current) {
        return;
      }

      try {
        interactionManagerRef.current.handleClick(event, cameraRef.current, rendererRef.current);

        const selectedRfidId = interactionManagerRef.current.getSelectedRfidId();
        if (selectedRfidId) {
          // 直接publish选中的点位
          if (nodeTopicName) {
            try {
              nodePublish({ end_node: Number(selectedRfidId), pass_nodes: [] } as Record<string, unknown>);
              sendNotification(`点位 ${selectedRfidId} 发送成功`, "", "user", "info");
            } catch (error) {
              console.error("Failed to publish RFID:", error);
              const errorMessage = error instanceof Error ? error.message : '未知错误';
              sendNotification(`点位 ${selectedRfidId} 发送失败: ${errorMessage}`, "", "user", "error");
            }
          } else {
            sendNotification("发送失败：无效的topic名称", "", "user", "error");
          }
        }
      } catch (error) {
        console.error("Right click handling error:", error);
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        sendNotification(`右键点击处理失败: ${errorMessage}`, "", "user", "error");
      }
    };

    rendererRef.current.domElement.addEventListener("click", handleClick);
    rendererRef.current.domElement.addEventListener("contextmenu", handleRightClick);

    return () => {
      rendererRef.current?.domElement.removeEventListener("click", handleClick);
      rendererRef.current?.domElement.removeEventListener("contextmenu", handleRightClick);
    };
  }, [isSceneReady, setEndNode, map, nodeTopicName, nodePublish]);

  useEffect(() => {
    return () => {
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }

      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (object.material instanceof THREE.Material) {
              object.material.dispose();
            }
          }
        });
      }

      if (interactionManagerRef.current) {
        interactionManagerRef.current = undefined;
        // interactionManagerRef.current.dispose();
      }

      if (controlsRef.current) {
        controlsRef.current.dispose();
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [map]);

  // 创建一个去抖动的 resize 处理函数
  const debouncedResize = useCallback(
    debounce((width: number, height: number) => {
      if (!rendererRef.current || !cameraRef.current) {
        return;
      }

      const renderer = rendererRef.current;
      const camera = cameraRef.current;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }, 1000), // 100ms 的延迟
    [],
  );

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }
    if (map == undefined) {
      return;
    }

    // 初始化渲染器和相机
    // const renderer = new THREE.WebGLRenderer({ antialias: true });
    // const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000);

    const renderer = rendererRef.current;
    const camera = cameraRef.current;

    // 处理尺寸变化的函数
    const handleResize = (width: number, height: number) => {
      if (!renderer || !camera) {
        return;
      }

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    // 创建 ResizeObserver 实例
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        handleResize(width, height);
      }
    });

    // 监听容器元素的大小变化
    resizeObserver.observe(mount);
    resizeObserverRef.current = resizeObserver;

    // 窗口 resize 事件处理
    const handleWindowResize = () => {
      if (!mount) {
        return;
      }
      debouncedResize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", handleWindowResize);

    // 设置初始尺寸
    debouncedResize(mount.clientWidth, mount.clientHeight);

    // 清理函数
    return () => {
      window.removeEventListener("resize", handleWindowResize);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      renderer?.dispose();
      debouncedResize.cancel(); // 取消未执行的去抖动函数
    };
  }, [mountRef, cameraRef, rendererRef, debouncedResize, resizeObserverRef, map]);

  useEffect(() => {
    console.log("ipAddr", ipAddr);
    if (!ipAddr) return;
    fetch(`http://${ipAddr}/mapServer/mapList`)
      .then(res => res.json())
      .then(list => {
        setMapFiles(list);
        setMapName(list[0] || "");
      })
      .catch(err => {
        console.error("获取地图列表失败:", err);
        setMapFiles([]);
        setMapName("");
      });
  }, [ipAddr]);

  // 1. 复制PGM解析函数
  function parsePGMBuffer(buffer: ArrayBuffer): { width: number; height: number; maxVal: number; data: Uint8Array } | undefined {
    try {
      const bytes = new Uint8Array(buffer);
      const decoder = new TextDecoder("ascii");
      let header = "";
      let i = 0;
      while (i < bytes.length && header.split('\n').filter(line => line.trim() !== '').length < 3) {
        header += decoder.decode(bytes.slice(i, i + 1));
        i++;
      }
      const lines = header
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"));
      if (lines[0] !== "P5") return undefined;
      const dimensions = lines[1]?.split(/\s+/).map(Number);
      if (!dimensions || dimensions.length !== 2) return undefined;
      const [width, height] = dimensions;
      const maxVal = parseInt(lines[2] ?? "0", 10);
      if (
        typeof width !== "number" || typeof height !== "number" || typeof maxVal !== "number" ||
        isNaN(width) || isNaN(height) || isNaN(maxVal) || width <= 0 || height <= 0 || maxVal <= 0
      ) return undefined;
      const pixelData = bytes.slice(i, i + width * height);
      if (pixelData.length !== width * height) return undefined;
      return { width, height, maxVal, data: pixelData };
    } catch { return undefined; }
  }
  function parsePGM(data: string): { width: number; height: number; maxVal: number; data: Uint8Array } | undefined {
    try {
      const lines = data.split(/\r?\n/).filter((line) => line.trim() !== "" && !line.startsWith("#"));
      if (lines[0] !== "P2") return undefined;
      const dimensions = lines[1]?.split(/\s+/).map(Number);
      if (!dimensions || dimensions.length !== 2) return undefined;
      const [width, height] = dimensions;
      const maxVal = parseInt(lines[2] ?? "0", 10);
      if (
        typeof width !== "number" || typeof height !== "number" || typeof maxVal !== "number" ||
        isNaN(width) || isNaN(height) || isNaN(maxVal)
      ) return undefined;
      const pixelData = new Uint8Array(width * height);
      let pixelIndex = 0;
      for (let i = 3; i < lines.length && pixelIndex < width * height; i++) {
        const values = lines[i]?.trim().split(/\s+/).map((v) => parseInt(v, 10)) ?? [];
        for (const val of values) {
          if (pixelIndex >= width * height) break;
          pixelData[pixelIndex++] = val;
        }
      }
      if (pixelIndex !== width * height) return undefined;
      return { width, height, maxVal, data: pixelData };
    } catch { return undefined; }
  }
  // 2. 替换地图图片加载逻辑为PGM下载和解析
  useEffect(() => {
    if (!ipAddr || !mapName) return;
    Promise.all([
      fetch(`http://${ipAddr}/mapServer/download/pgmfile?mapname=${mapName}`).then(res => res.arrayBuffer()),
      fetch(`http://${ipAddr}/mapServer/download/navPoints?mapName=${mapName}`).then(res => res.json()),
      fetch(`http://${ipAddr}/mapServer/download/yamlfile?mapName=${mapName}`).then(res => res.text())
    ]).then(([buffer, navData, yamlText]) => {
      const decoder = new TextDecoder("ascii");
      const headerSnippet = decoder.decode(new Uint8Array(buffer).slice(0, 15));
      const magic = headerSnippet.trim().split(/\s+/)[0];
      let pgmData: { width: number; height: number; maxVal: number; data: Uint8Array } | undefined;
      if (magic === "P2") {
        pgmData = parsePGM(decoder.decode(buffer));
      } else if (magic === "P5") {
        pgmData = parsePGMBuffer(buffer);
      } else {
        throw new Error("未知PGM格式");
      }
      if (!pgmData) throw new Error("PGM解析失败");
      const { width, height, maxVal, data } = pgmData;
      const rgbaData = new Uint8Array(width * height * 4);
      for (let i = 0; i < data.length; i++) {
        // @ts-ignore
        const value = Math.floor((data[i] / (maxVal ?? 255)) * 255);
        rgbaData[i * 4] = value;
        rgbaData[i * 4 + 1] = value;
        rgbaData[i * 4 + 2] = value;
        rgbaData[i * 4 + 3] = 255;
      }
      const texture = new THREE.DataTexture(
        rgbaData,
        width,
        height,
        THREE.RGBAFormat,
        THREE.UnsignedByteType
      );
      texture.needsUpdate = true;
      // 解析YAML
      const mapConfig = yaml.load(yamlText) as any;
      setMapConfig(mapConfig);
      // 使用新的导航点数据格式
      setMap({ map: texture, json: navData, pgmData, mapConfig });
    }).catch(err => {
      console.error("获取PGM、导航点或YAML数据失败:", err);
      setMap(undefined);
    });
  }, [ipAddr, mapName]);

  return (
    <Stack>
      <PanelToolbar />
      {/* <div
        style={{
          position: "absolute",
          top: "35px",
          left: "10px",
          zIndex: 1000,
          backgroundColor: "rgba(0,0,0,0.7)",
          color: "white",
          padding: "10px",
        }}
      >
        <div>Map URL: {imageUrl ? "Available" : "None"}</div>
        <div>Load Status: {imageLoadStatus}</div>
        {imageUrl && (
          <div>
            <div>Testing direct image render:</div>
            <img
              src={imageUrl}
              alt="Map test"
              style={{ width: "100px", height: "auto", border: "1px solid white" }}
              onLoad={() => {
                console.log("Image in DOM loaded");
              }}
              onError={(e) => {
                console.error("Image in DOM failed to load", e);
              }}
            />
          </div>
        )}
      </div> */}
      {update_map && (
        <Button
          variant="contained"
          component="label"
          color="secondary"
          onClick={() => {
            setOpenModal(true);
          }}
        >
          Upload map
        </Button>
      )}
      <FileUploadModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
        }}
      />
      <MapFilesTab mapFiles={mapFiles} setMapName={setMapName} initialValue={mapFiles[0]} />
      <Stack
        ref={mountRef}
        flex="auto"
        alignItems="center"
        justifyContent="center"
        gap={2}
        paddingX={3}
        display={isSceneReady ? "block" : "none"}
        sx={{ height: "100vh" }}
      >
        {isSceneReady && (
          <>
            <div
              style={{
                position: "absolute",
                height: "50%",
                width: "40px",
                zIndex: 999,
                right: 0,
                display: "flex",
                justifyContent: "center",
              }}
            />
            <div
              style={{
                position: "absolute",
                height: "auto",
                zIndex: 999,
                right: "10px",
                display: "flex",
                justifyContent: "center",
                flexDirection: "column",
                top: "50px",
              }}
            >
              <BatteryIndicator batteryLevel={(batteryPercentageRef.current ?? 0) * 100} />
              <TextCard
                text={
                  interactionManagerRef.current?.getCurrentPositionRfidId()?.toString() ?? "无位置"
                }
              />
            </div>
          </>
        )}
      </Stack>
    </Stack>
  );
};

export default Panel(Object.assign(React.memo(NavSelectPanel), {
  panelType: "NavSelectPanel",
  defaultConfig
}));
