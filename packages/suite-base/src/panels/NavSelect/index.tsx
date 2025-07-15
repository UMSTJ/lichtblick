// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Stack } from "@mui/material";
import yaml from "js-yaml";
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { useDataSourceInfo } from "@lichtblick/suite-base/PanelAPI";
// import { useMessageDataItem } from "@lichtblick/suite-base/components/MessagePathSyntax/useMessageDataItem";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import Panel from "@lichtblick/suite-base/components/Panel";
import PanelToolbar from "@lichtblick/suite-base/components/PanelToolbar";
import useCallbackWithToast from "@lichtblick/suite-base/hooks/useCallbackWithToast";
import usePublisher from "@lichtblick/suite-base/hooks/usePublisher";
// Update the import path below to the correct location of VehicleControlConfig
// If the above path is incorrect, replace it with the actual path where VehicleControlConfig is defined.
import { useVehicleControlSettings } from "@lichtblick/suite-base/panels/NavSelect/settings";
import { VehicleControlConfig } from "@lichtblick/suite-base/panels/NavSelect/types";
import { SaveConfig } from "@lichtblick/suite-base/types/panels";
import sendNotification from "@lichtblick/suite-base/util/sendNotification";

import {
  parseAndRenderNavPoints,
  RFIDInteractionManager,
  debounce,
} from "./manager/RFIDInteractionManager";
import { defaultConfig } from "./settings";
import {
  parsePGM,
  parsePGMBuffer,
} from "@lichtblick/suite-base/panels/SlamMapEdit/PGMCanvasEditor/pgmParser";
import { useMessageDataItem } from "@lichtblick/suite-base/components/MessagePathSyntax/useMessageDataItem";

type Props = {
  config: VehicleControlConfig;
  saveConfig: SaveConfig<VehicleControlConfig>;
};
type SandTableMap = {
  map: THREE.DataTexture;
  maskMap: THREE.DataTexture;
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
  // const batteryPercentageRef = useRef<number | undefined>(0);
  const animationFrameRef = useRef<number>();
  // const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [isSceneReady, setIsSceneReady] = useState(false);

  const [map, setMap] = useState<SandTableMap | undefined>(undefined);
  const [mapRef, setMapRef] = useState<SandTableMap| undefined>(undefined);
  const [mapName, setMapName] = useState<string>("");
  // const WORLD_WIDTH = 10;
  // const { nodeTopicName, nodeDatatype, pathSource, rfidSource, batterySource } = config;
  const { nodeTopicName, nodeDatatype } = config;

  const [currentPosition, setCurrentPosition] = useState<string>("无位置");
  const poseMessages = useMessageDataItem(`/pcl_pose.pose.position`);
  const poseMessagesRef = useRef(poseMessages);
  // 添加当前位置点的引用
  const currentPosMarkerRef = useRef<THREE.Mesh | null>(null);
  useEffect(() => {
    setMapRef(map);
  }, [map]);

  // 更新位置点的函数
  const updatePositionMarker = useCallback((scene: THREE.Scene, x: number, y: number) => {
    console.log("x:", x);
    console.log("y:", y);
    // 如果标记不存在，创建一个新的
    if (!currentPosMarkerRef.current) {
      console.log("create currentPosMarkerRef.current");
      const geometry = new THREE.CircleGeometry(0.5, 32); // 半径0.5米的圆
      const material = new THREE.MeshBasicMaterial({
        color: 0x0066ff,  // 蓝色
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthTest: false,
      });
      currentPosMarkerRef.current = new THREE.Mesh(geometry, material);
      currentPosMarkerRef.current.position.z = 0.02; // 确保在最上层
      scene.add(currentPosMarkerRef.current);
    }

    // 修正：先判断 interactionManagerRef、map 是否存在，并正确解构 worldToLocal 返回值
    if(!interactionManagerRef.current) {
      console.log("interactionManagerRef.current is undefined");
      return;
    }
    if (typeof interactionManagerRef.current.worldToLocal !== "function") {
      console.log("interactionManagerRef.current.worldToLocal is undefined");
      return;
    }
    // 修复 mapRef 可能为 undefined 的问题，增加判空处理
    const mapHeight = mapRef?.pgmData?.height;
    if (mapHeight === undefined) {
      console.log("mapRef 或 mapRef.pgmData.height 未定义");
      return;
    }
    if (
      interactionManagerRef.current &&
      typeof interactionManagerRef.current.worldToLocal === "function" &&
      map?.pgmData?.height
    ) {
      console.log("update currentPosMarkerRef.current");
      const result = interactionManagerRef.current.worldToLocal(x, y, mapHeight);
      console.log("result:", result);
      const localX = result.x;
      const localY = result.y;
      // 更新位置
      console.log("localX:", localX);
      console.log("localY:", localY);
      currentPosMarkerRef.current.position.x = localX;
      currentPosMarkerRef.current.position.y = localY;
    }
    else {
      console.log("interactionManagerRef.current or map.pgmData.height is undefined");
    }
  }, [mapRef]);

  // 添加刷新位置的函数
  const refreshPosition = useCallback(() => {
    const currentMessages = poseMessagesRef.current;
    if (currentMessages?.length > 0) {
      const latestMessage = currentMessages[currentMessages.length - 1];

      if (latestMessage?.queriedData && latestMessage.queriedData.length > 0) {
        const position = latestMessage.queriedData[0]?.value as {
          x: number;
          y: number;
          z: number;
        };

        if (position && typeof position.x === "number" && typeof position.y === "number") {
          setCurrentPosition(`x: ${position.x.toFixed(2)}\ny: ${position.y.toFixed(2)}`);
          return;
        }
      }
    }
    setCurrentPosition("无位置");
  }, []);

  // 更新 ref 的值
  useEffect(() => {
    poseMessagesRef.current = poseMessages;
  }, [poseMessages]);

  useEffect(() => {
    const interval = setInterval(refreshPosition, 1000);
    return () => clearInterval(interval);
  }, [refreshPosition]); // 添加 refreshPosition 作为依赖

  useEffect(() => {
    const interval = setInterval(() => {
      const currentMessages = poseMessagesRef.current;
      if (currentMessages?.length > 0) {
        const latestMessage = currentMessages[currentMessages.length - 1];

        if (latestMessage?.queriedData && latestMessage.queriedData.length > 0) {
          const position = latestMessage.queriedData[0]?.value as {
            x: number;
            y: number;
            z: number;
          };

          if (position && typeof position.x === "number" && typeof position.y === "number") {
            setCurrentPosition(`x: ${position.x.toFixed(2)}\ny: ${position.y.toFixed(2)}`);
            // 如果场景已经准备好，更新位置标记
            if (sceneRef.current) {
              updatePositionMarker(sceneRef.current, position.x, position.y);
            }
            return;
          }
        }
      }
      setCurrentPosition("无位置");
    }, 1000);
    return () => clearInterval(interval);
  }, [updatePositionMarker]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (currentPosMarkerRef.current && sceneRef.current) {
        sceneRef.current.remove(currentPosMarkerRef.current);
        currentPosMarkerRef.current.geometry.dispose();
        (currentPosMarkerRef.current.material as THREE.Material).dispose();
        currentPosMarkerRef.current = null;
      }
    };
  }, []);

  // const rfidMessages = useMessageDataItem(rfidSource);
  // const pathMessages = useMessageDataItem(pathSource);
  // const batteryMessages = useMessageDataItem(batterySource);
  //
  // const rfidObj = rfidMessages[rfidMessages.length - 1] as {
  //   queriedData: { value: { data: string } }[];
  // };
  // const pathObj = pathMessages[pathMessages.length - 1] as {
  //   queriedData: { value: { target_rfids: number[] } }[];
  // };
  // const batteryObj = batteryMessages[batteryMessages.length - 1] as {
  //   queriedData: { value: { percentage: number } }[];
  // };

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
    if (!name) {
      return "";
    }
    let addressPart = name.startsWith("ws://") ? name.substring(5) : name;
    const firstSpaceIndex = addressPart.indexOf(" ");
    if (firstSpaceIndex !== -1) {
      addressPart = addressPart.substring(0, firstSpaceIndex);
    }
    const host = addressPart.split(":")[0] ?? "";
    return `${host}:9000`;
  }
  // useEffect(() => {
  //   setIpAddr("192.243.117.147:9000");
  // }, []);

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

  // 初始化 Three.js
  const initThreeJS = useCallback(() => {
    if (!map?.map || !map?.json || !mountRef.current || !map?.pgmData || !map?.mapConfig || !map?.maskMap) {
      console.error("map/maskMap/pgmData/mapConfig/mountRef.current is undefined");
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

    // 计算地图尺寸
    const mapWidth = map.pgmData.width * map.mapConfig.resolution;
    const mapHeight = map.pgmData.height * map.mapConfig.resolution;
    console.log("mapWidth:", mapWidth);
    console.log("mapHeight:", mapHeight);

    // 创建地图层
    const mapGeometry = new THREE.PlaneGeometry(mapWidth, mapHeight);
    const mapMaterial = new THREE.MeshBasicMaterial({
      map: map.map,
      side: THREE.DoubleSide,
    });
    mapMaterial.needsUpdate = true;
    const mapMesh = new THREE.Mesh(mapGeometry, mapMaterial);
    scene.add(mapMesh);

    // 创建遮罩层
    const maskGeometry = new THREE.PlaneGeometry(mapWidth, mapHeight);
    const maskMaterial = new THREE.MeshBasicMaterial({
      map: map.maskMap,
      transparent: true,
      opacity: 1.0,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      side: THREE.DoubleSide,
    });
    maskMaterial.needsUpdate = true;
    const maskMesh = new THREE.Mesh(maskGeometry, maskMaterial);
    maskMesh.position.z = 0.01; // 略微提升以避免z-fighting
    scene.add(maskMesh);

    // 组装options
    const options = {
      origin: map.mapConfig.origin,
      resolution: map.mapConfig.resolution,
      pgmWidth: map.pgmData.width,
      pgmHeight: map.pgmData.height,
    };

    interactionManagerRef.current = parseAndRenderNavPoints(
      map.json,
      scene,
      {
        width: mapWidth,
        height: mapHeight,
      },
      options,
    );

    // 强制刷新所有Group/Line，解决Three.js渲染bug
    const forceRefresh = () => {
      const objs = scene.children.filter((obj) => obj.type === "Group" || obj.type === "Line");
      objs.forEach((obj) => {
        scene.remove(obj);
        scene.add(obj);
      });
      renderer.render(scene, camera);
    };
    forceRefresh();

    if (scene.children.length <= 2) { // 考虑到现在有两个基础层
      sendNotification("未检测到点线对象，请检查数据或坐标范围", "", "user", "warn");
    }

    // 强制刷新一次，确保新加对象可见
    renderer.render(scene, camera);

    const maxDimension = Math.max(mapWidth, mapHeight);
    camera.position.z = maxDimension * 0.7;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);

    // 确保材质更新并多次渲染以确保显示
    setTimeout(() => {
      mapMaterial.needsUpdate = true;
      maskMaterial.needsUpdate = true;
      for (let i = 0; i < 5; i++) {
        renderer.render(scene, camera);
      }
      setIsSceneReady(true);
    }, 1000);

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
      if (
        rendererRef.current?.domElement &&
        mountRef.current?.contains(rendererRef.current.domElement)
      ) {
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
        interactionManagerRef.current.handleClick(
          event,
          cameraRef.current,
          rendererRef.current,
          nodePublish,
        );
      } catch (error) {
        console.error("Click handling error:", error);
      }
    };

    // 右键点击事件处理
    // const handleRightClick = (event: MouseEvent) => {
    //   event.preventDefault(); // 阻止默认右键菜单

    //   if (!cameraRef.current || !rendererRef.current || !interactionManagerRef.current) {
    //     return;
    //   }

    //   try {
    //     interactionManagerRef.current.handleClick(event, cameraRef.current, rendererRef.current, nodePublish);
    //     const selectedRfidId = interactionManagerRef.current.getSelectedRfidId();
    //     if (selectedRfidId) {
    //       // 直接publish选中的点位
    //       if (nodeTopicName) {
    //         try {
    //           nodePublish({ end_node: Number(selectedRfidId), pass_nodes: [] } as Record<string, unknown>);
    //           sendNotification(`点位 ${selectedRfidId} 发送成功`, "", "user", "info");
    //         } catch (error) {
    //           console.error("Failed to publish RFID:", error);
    //           const errorMessage = error instanceof Error ? error.message : '未知错误';
    //           sendNotification(`点位 ${selectedRfidId} 发送失败: ${errorMessage}`, "", "user", "error");
    //         }
    //       } else {
    //         sendNotification("发送失败：无效的topic名称", "", "user", "error");
    //       }
    //     }
    //   } catch (error) {
    //     console.error("Right click handling error:", error);
    //     const errorMessage = error instanceof Error ? error.message : '未知错误';
    //     sendNotification(`右键点击处理失败: ${errorMessage}`, "", "user", "error");
    //   }
    // };

    rendererRef.current.domElement.addEventListener("click", handleClick);
    // rendererRef.current.domElement.addEventListener("contextmenu", handleRightClick);

    return () => {
      rendererRef.current?.domElement.removeEventListener("click", handleClick);
      // rendererRef.current?.domElement.removeEventListener("contextmenu", handleRightClick);
    };
  }, [isSceneReady, setEndNode, map, nodeTopicName, nodePublish]);

  useEffect(() => {
    return () => {
      if (
        rendererRef.current?.domElement &&
        mountRef.current?.contains(rendererRef.current.domElement)
      ) {
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

  // 获取位置状态并设置地图的函数
  const refreshMapStatus = useCallback(async () => {
    if (!ipAddr) {
      return;
    }

    try {
      // 获取位置状态信息
      const statusRes = await fetch(`http://${ipAddr}/api/location/status`);
      const statusData = await statusRes.json();
      console.log("位置状态信息:", statusData);
      const currentMap = statusData?.positioningService?.currentMap;

      if (currentMap && currentMap !== "N/A") {
        console.log("检测到当前地图:", currentMap);
        // 获取地图列表
        const listRes = await fetch(`http://${ipAddr}/mapServer/mapList`);
        const list = await listRes.json();

        // 检查当前地图是否在可用地图列表中
        if (list.includes(currentMap)) {
          setMapName(currentMap);
          sendNotification(`自动切换到地图: ${currentMap}`, "", "user", "info");
        } else {
          setMapName("请选择地图");
          sendNotification(`当前地图 ${currentMap} 不在可用地图列表中`, "", "user", "warn");
        }
      } else {
        setMapName("请选择地图");
      }
    } catch (err) {
      console.error("获取地图状态失败:", err);
      setMapName("请选择地图");
      sendNotification("获取地图状态失败", "", "user", "error");
    }
  }, [ipAddr]);

  // 获取位置状态信息并自动设置地图
  useEffect(() => {
    refreshMapStatus();
  }, [ipAddr, refreshMapStatus]);

  // 2. 替换地图图片加载逻辑为PGM下载和解析
  useEffect(() => {
    if (!ipAddr || !mapName || mapName === "请选择地图") {
      setMap(undefined);
      return;
    }
    if (mapName === "当前地图") {
      sendNotification(`当前地图加载失败, 请选择其他地图或重新打开`, "", "user", "info");
    }
    void Promise.all([
      fetch(`http://${ipAddr}/mapServer/download/pgmfile?mapname=${mapName}`).then(
        async (res) => await res.arrayBuffer(),
      ),
      fetch(`http://${ipAddr}/mapServer/download/navPoints?mapName=${mapName}`).then(
        async (res) => await res.json(),
      ),
      fetch(`http://${ipAddr}/mapServer/download/yamlfile?mapName=${mapName}`).then(
        async (res) => await res.text(),
      ),
      fetch(`http://${ipAddr}/mapServer/download/${mapName}/maskMap.pgm`).then(
        async (res) => await res.arrayBuffer(),
      ),
    ])
      .then(([buffer, navData, yamlText, maskBuffer]) => {
        const decoder = new TextDecoder("ascii");
        const headerSnippet = decoder.decode(new Uint8Array(buffer).slice(0, 15));
        const maskHeaderSnippet = decoder.decode(new Uint8Array(maskBuffer).slice(0, 15));
        const magic = headerSnippet.trim().split(/\s+/)[0];
        let pgmData:
          | { width: number; height: number; maxVal: number; data: Uint8Array }
          | undefined;
        if (magic === "P2") {
          pgmData = parsePGM(decoder.decode(buffer));
        } else if (magic === "P5") {
          pgmData = parsePGMBuffer(buffer);
        } else {
          throw new Error("未知PGM格式");
        }
        if (!pgmData) {
          throw new Error("PGM解析失败");
        }
        console.log("pgmData:", pgmData);

        // 解析 maskMap
        let maskPgmData:
          | { width: number; height: number; maxVal: number; data: Uint8Array }
          | undefined;
        const maskMagic = maskHeaderSnippet.trim().split(/\s+/)[0];
        if (maskMagic === "P2") {
          maskPgmData = parsePGM(decoder.decode(maskBuffer));
        } else if (maskMagic === "P5") {
          maskPgmData = parsePGMBuffer(maskBuffer);
        }
        if (!maskPgmData) {
          throw new Error("Mask PGM解析失败");
        }

        const { width, height, maxVal, data } = pgmData;
        // 创建原始地图的纹理
        const rgbaData = new Uint8Array(width * height * 4);
        data.forEach((value, index) => {
          const convertValue = Math.floor((value / (maxVal ?? 255)) * 255);
          rgbaData[index * 4] = convertValue;
          rgbaData[index * 4 + 1] = convertValue;
          rgbaData[index * 4 + 2] = convertValue;
          rgbaData[index * 4 + 3] = 255;
        });
        const texture = new THREE.DataTexture(
          rgbaData,
          width,
          height,
          THREE.RGBAFormat,
          THREE.UnsignedByteType,
        );
        texture.needsUpdate = true;

        // 创建 mask 的纹理
        const maskRgbaData = new Uint8Array(width * height * 4);
        maskPgmData.data.forEach((value, index) => {
          // 在 P2 中，0 表示障碍物（黑色），255表示空闲区域（白色）
          const isObstacle = value === 0;  // 修改判断条件，0为障碍物
          maskRgbaData[index * 4] = 0;     // R - 始终为黑色
          maskRgbaData[index * 4 + 1] = 0; // G - 始终为黑色
          maskRgbaData[index * 4 + 2] = 0; // B - 始终为黑色
          maskRgbaData[index * 4 + 3] = isObstacle ? 255 : 0; // A - 障碍物不透明，其他区域透明
        });
        const maskTexture = new THREE.DataTexture(
          maskRgbaData,
          width,
          height,
          THREE.RGBAFormat,
          THREE.UnsignedByteType,
        );
        maskTexture.flipY = true; // 翻转Y轴
        maskTexture.needsUpdate = true;

        // 解析YAML
        const downloadMapConfig = yaml.load(yamlText) as any;
        console.log("downloadMapConfig:", downloadMapConfig);
        // 使用新的导航点数据格式
        setMap({
          map: texture,
          maskMap: maskTexture,
          json: navData,
          pgmData,
          mapConfig: downloadMapConfig
        });
      })
      .catch((err) => {
        console.error("获取PGM、导航点或YAML数据失败:", err);
        setMap(undefined);
      });
  }, [ipAddr, mapName]);

  return (
    <Stack>
      <PanelToolbar />
      {/* 刷新按钮 - 移到左上角 */}
      <div
        style={{
          position: "relative",
          zIndex: 9999,
          left: "16px",
          top: "16px",
          display: "inline-block", // 修复零宽度字符问题
          width: "fit-content",    // 关键：让 div 宽度贴合内容
        }}
      >
        <button
          onClick={refreshMapStatus}
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: "4px",
            cursor: "pointer",
            display: "inline-flex", // 使用 inline-flex 保持行内特性 + 对齐图标和文字
            alignItems: "center",
            gap: "4px",
            fontSize: "14px",
          }}
        >
          <span style={{ fontSize: "16px" }}>⟳</span>
          刷新地图
        </button>
      </div>
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
            {/* 位置信息显示 - 右上角 */}
            <div
              style={{
                position: "absolute",
                height: "auto",
                zIndex: 999,
                right: "10px",
                top: "45px", // 恢复到原来的位置
                display: "flex",
                justifyContent: "center",
                flexDirection: "column",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                padding: "8px",
                borderRadius: "4px",
                color: "white",
              }}
            >
              <div style={{ fontWeight: "bold", borderBottom: "1px solid rgba(255, 255, 255, 0.5)", paddingBottom: "4px", marginBottom: "4px" }}>当前位置</div>
              <pre style={{ margin: 0, fontFamily: "monospace" }}>{currentPosition}</pre>
            </div>
          </>
        )}
      </Stack>
    </Stack>
  );
};

export default Panel(
  Object.assign(React.memo(NavSelectPanel), {
    panelType: "NavSelectPanel",
    defaultConfig,
  }),
);
