import * as yaml from "js-yaml";
import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "three/examples/jsm/libs/stats.module";

import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import { DrawingToolbar } from "@lichtblick/suite-base/panels/SlamMapEdit/PGMCanvasEditor/components/DrawingToolbar";
import {
  LayerDrawer,
  Layer,
} from "@lichtblick/suite-base/panels/SlamMapEdit/PGMCanvasEditor/components/LayerDrawer";
import { PointsDrawer } from "@lichtblick/suite-base/panels/SlamMapEdit/PGMCanvasEditor/components/PointsDrawer";
import sendNotification from "@lichtblick/suite-base/util/sendNotification";

import {
  PointInteractionManager,
  Point,
  MapConfig,
  PGMImage,
} from "./manager/PointInteractionManager";

// 地图配置接口
interface ROSMapConfig {
  image: string;
  resolution: number;
  origin: number[];
  negate: 0 | 1;
  occupied_thresh: number;
  free_thresh: number;
}

export function parsePGMBuffer(buffer: ArrayBuffer): PGMImage | undefined {
  try {
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder("ascii");

    let header = "";
    let i = 0;

    // 读取 header 直到出现 3 个换行（magic number, dimensions, maxVal）
    while (i < bytes.length && header.split("\n").filter((line) => line.trim() !== "").length < 3) {
      header += decoder.decode(bytes.slice(i, i + 1));
      i++;
    }

    const lines: string[] = header
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    if (lines[0] !== "P5") {
      console.error("Invalid PGM format: Expected P5.");
      console.error(lines[0]);
      return undefined;
    }
    if (lines.length < 3) {
      console.error("Invalid header values in PGM.");
      return undefined;
    }
    if (lines[1] == undefined || lines[2] == undefined) {
      console.error("Invalid PGM format1.");
      return undefined;
    }

    const [width, height] = lines[1].split(/\s+/).map(Number);

    const maxVal = parseInt(lines[2], 10);

    if (
      width == undefined ||
      height == undefined ||
      isNaN(width) ||
      isNaN(height) ||
      isNaN(maxVal) ||
      width <= 0 ||
      height <= 0 ||
      maxVal <= 0
    ) {
      console.error("Invalid header values in PGM.");
      return undefined;
    }

    // 剩下的是像素数据

    const pixelData = bytes.slice(i, i + width * height);

    if (pixelData.length !== width * height) {
      console.error("Pixel data size mismatch.");
      return undefined;
    }

    return {
      width,
      height,
      maxVal,
      data: pixelData,
    };
  } catch (error) {
    console.error("PGM P5 parsing error:", error);
    return undefined;
  }
}
// PGM 解析函数
export function parsePGM(data: string): PGMImage | undefined {
  try {
    const lines = data.split(/\r?\n/).filter((line) => line.trim() !== "" && !line.startsWith("#"));
    if (lines[0] !== "P2") {
      console.error("Invalid PGM formatP2.");
      return undefined;
    }

    // 使用更高效的方式解析头部信息
    if (lines[1] == undefined || lines[2] == undefined) {
      console.error("Invalid PGM format1.");
      return undefined;
    }
    const dimensions = lines[1].split(/\s+/).map(Number);
    if (dimensions.length !== 2) {
      return undefined;
    }

    const [width, height] = dimensions;

    const maxVal = parseInt(lines[2], 10);
    if (
      width == undefined ||
      height == undefined ||
      isNaN(width) ||
      isNaN(height) ||
      isNaN(maxVal) ||
      width <= 0 ||
      height <= 0 ||
      maxVal <= 0
    ) {
      console.error("Invalid PGM format2.");
      return undefined;
    }

    // 一次性处理像素数据

    const pixelData = new Uint8Array(width * height);
    let pixelIndex = 0;

    // 从第4行开始处理像素数据

    lines.slice(3).forEach((value) => {
      const values = value
        .toString()
        .trim()
        .split(/\s+/)
        .map((v) => parseInt(v, 10));
      for (const val of values) {
        if (pixelIndex >= width * height) {
          break;
        }
        pixelData[pixelIndex++] = val;
      }
    });

    if (pixelIndex !== width * height) {
      console.error("Invalid PGM format4.");
      return undefined;
    }

    return { width, height, maxVal, data: pixelData };
  } catch (error) {
    console.error("PGM parsing error:", error);
    return undefined;
  }
}

function createPGMFromData(image: PGMImage): string {
  const { width, height, maxVal, data } = image;
  const header = `P2\n${width} ${height}\n${maxVal}\n`;
  let body = "";

  data.forEach((index, value) => {
    body += value.toString() + (index % width === width - 1 ? "\n" : " ");
  });
  // for (let i = 0; i < data.length; i++) {
  //   body += data[i] + (i % width === width - 1 ? "\n" : " ");
  // }
  return header + body;
}
const selectPlayerName = (ctx: MessagePipelineContext) => ctx.playerState.name;
const PGMCanvasEditor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement | undefined>(undefined);
  const rendererRef = useRef<THREE.WebGLRenderer | undefined>(undefined);
  const cameraRef = useRef<THREE.OrthographicCamera | undefined>(undefined);
  const sceneRef = useRef<THREE.Scene | undefined>(undefined);
  const controlsRef = useRef<OrbitControls | undefined>(undefined);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const textureRef = useRef<THREE.DataTexture | undefined>(undefined);

  const brushPreviewRef = useRef<THREE.Mesh>();

  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string>();
  const [isLayerDrawerOpen, setIsLayerDrawerOpen] = useState(false);

  // const [showedBaseLayerDrawError, setShowedBaseLayerDrawError] = useState(false);

  const [pgmData, setPGMData] = useState<PGMImage | undefined>(undefined);
  const [drawing, setDrawing] = useState(false);
  const [drawPoint, setDrawPoint] = useState(false);
  // const [draggingId, setDraggingId] = useState<number | null>(null);

  const [isMouseDown, setIsMouseDown] = useState(false);

  // const [pgmFile, setPgmFile] = useState<File | undefined>(undefined);

  // const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);

  const [brushColor, setBrushColor] = useState<number>(0);
  const [brushSize, setBrushSize] = useState(5);

  const [mapList, setMapList] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState<string>("");

  // PointsDrawer相关状态
  const [isPointsDrawerOpen, setIsPointsDrawerOpen] = useState(false);
  const [selectedPointId, setSelectedPointId] = useState<number | undefined>();

  // PointInteractionManager相关
  const pointManagerRef = useRef<PointInteractionManager | undefined>(undefined);
  const [points, setPoints] = useState<Point[]>([]);

  // const [lines, setLines] = useState<Line[]>([]);

  // 右键菜单相关状态
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    pointId: number | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    pointId: null,
  });

  const playerName = useMessagePipeline(selectPlayerName);
  const [ipAddr, setIpAddr] = useState("");
  useEffect(() => {
    if (playerName == undefined) {
      return;
    }
    const currentIp = getIpAddress(playerName);
    setIpAddr(currentIp);
    // setIpAddr("192.243.117.147:9000")
  }, [playerName, setIpAddr]);

  const getIpAddress = (name: string): string => {
    if (!name) {
      return "";
    }

    // 移除 "ws://" 前缀（如果存在）
    let addressPart = name.startsWith("ws://") ? name.substring(5) : name;

    // 只取第一个空格之前的部分 (例如 "10.51.129.39:8765" 或 "10.51.129.39")
    const firstSpaceIndex = addressPart.indexOf(" ");
    if (firstSpaceIndex !== -1) {
      addressPart = addressPart.substring(0, firstSpaceIndex);
    }

    // 现在 addressPart 类似于 "10.51.129.39:8765" 或 "10.51.129.39" 或 "[::1]:8000"
    // 我们需要提取主机部分
    let host = addressPart; // 如果找不到端口或格式不符合预期，则默认为整个字符串
    host = host.split(":")[0] ?? "";
    // 如果不是数字端口（例如，冒号是 IPv6 地址的一部分，如 "[::1]"），则 host 保持为 addressPart
    // 附加新的固定端口
    return `${host}:9000`;
  };

  // 在现有 state 中新增：
  const [mapConfig, setMapConfig] = useState<ROSMapConfig>({
    image: "",
    resolution: 0.05,
    origin: [0, 0, 0],
    negate: 0,
    occupied_thresh: 0.65,
    free_thresh: 0.25,
  });

  // 获取地图列表
  useEffect(() => {
    if (!ipAddr) {
      return;
    }
    const url = `http://${ipAddr}/mapServer/mapList`;
    fetch(url)
      .then(async (res) => await res.json())
      .then(setMapList)
      .catch((err: unknown) => {
        console.error("获取地图列表失败:", err);
      });
  }, [ipAddr]);
  // 从接口下载PGM文件的逻辑
  useEffect(() => {
    const downloadAndLoadMap = async () => {
      if (!selectedMap) {
        return;
      }

      try {
        const url = `http://${ipAddr}/mapServer/download/pgmfile?mapname=${selectedMap}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`下载失败: ${response.status} ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const decoder = new TextDecoder("ascii");

        // 尝试解码前几个字符判断 P2 还是 P5
        const headerSnippet = decoder.decode(bytes.slice(0, 15)); // 读取前15字节足够判断
        const magic = headerSnippet.trim().split(/\s+/)[0];
        if (magic === "P2") {
          // 文本格式，需要全文作为 string 传给 P2 解析器
          const text = decoder.decode(buffer);
          // 你原来用于解析 P2 的方法
          setPGMData(parsePGM(text));
        } else if (magic === "P5") {
          // 二进制解析
          setPGMData(parsePGMBuffer(buffer));
        } else {
          console.error("未知PGM格式:", magic);
          return undefined;
        }

        // 清理当前场景（复用原有清理逻辑）
        if (canvasRef.current) {
          if (rendererRef.current && canvasRef.current.contains(rendererRef.current.domElement)) {
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
        }
        setPoints([]);
        //setLines([]); // 同时清除线段数据
      } catch (error) {
        console.error("地图下载加载错误:", error);
        // 处理错误情况
      }
    };

    void downloadAndLoadMap();
  }, [ipAddr, selectedMap]); // 依赖mapConfig，当配置变更时触发

  const downloadPoints = async () => {
    if (pointManagerRef.current) {
      await pointManagerRef.current.downloadPoints();
      setPoints(pointManagerRef.current.getPoints());
      // pointManagerRef.current.setLines(pointManagerRef.current.getLines())
      // 强制重新渲染所有线段
      pointManagerRef.current.forceRenderLines();
      // 添加延时手动渲染（确保状态更新完成）
      setTimeout(() => {
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      }, 100);
    }
  };
  // 选中地图后加载 YAML
  useEffect(() => {
    if (!selectedMap) {
      return;
    }

    const fetchYaml = async () => {
      try {
        const yamlRes = await fetch(
          `http://${ipAddr}/mapServer/download/yamlfile?mapname=${selectedMap}`,
        );
        const yamlText = await yamlRes.text();
        const loadedMapConfig = yaml.load(yamlText) as ROSMapConfig;

        setMapConfig(loadedMapConfig);
      } catch (err) {
        console.error("加载 YAML 失败:", err);
      }
    };
    void fetchYaml();
  }, [ipAddr, selectedMap, setMapConfig]);

  // 添加导出点位函数
  const exportPoints = useCallback(async () => {
    if (pointManagerRef.current) {
      await pointManagerRef.current.exportPoints();
    }
  }, []);

  const handleBrushSizeChange = (size: number) => {
    setBrushSize(size);
  };
  const handleBrushColorChange = useCallback((color: number) => {
    setBrushColor(color);
  }, []);

  // 添加新图层
  const handleAddLayer = useCallback(() => {
    if (!sceneRef.current) {
      return;
    }
    setLayers((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const base = prev[0];
      if (base == undefined) {
        return prev;
      }
      // 创建}

      // 创建完全独立且初始透明的纹理

      const rgbaData = new Uint8Array(base.texture.image.data.length);

      rgbaData.set(base.texture.image.data); // 拷贝原始数据

      rgbaData.fill(0, 3, -1); // 将alpha通道设为0（完全透明）

      const newTex = new THREE.DataTexture(
        rgbaData,

        base.texture.image.width,

        base.texture.image.height,
        THREE.RGBAFormat,
        THREE.UnsignedByteType,
      );
      newTex.generateMipmaps = false;
      newTex.flipY = false;
      newTex.needsUpdate = true;

      const mat = new THREE.MeshBasicMaterial({
        map: newTex,
        transparent: true,
        opacity: 1,
        toneMapped: false,
        depthTest: true,
        depthWrite: true,
        side: THREE.DoubleSide,
      });

      const geo = base.mesh.geometry.clone();
      const newMesh = new THREE.Mesh(geo, mat);

      // 调整渲染顺序
      newMesh.renderOrder = prev.length;
      newMesh.position.z = prev.length * 0.1;
      sceneRef.current!.add(newMesh);

      const newLayer = {
        id: `layer-${Date.now()}`,
        name: `Layer ${prev.length}`,
        visible: true,
        texture: newTex,
        mesh: newMesh,
      };

      setTimeout(() => {
        setSelectedLayerId(newLayer.id);
      }, 0);
      return [...prev, newLayer];
    });
  }, [sceneRef]);

  useEffect(() => {
    // console.log("当前图层列表:", layers);
    // console.log("当前选中图层:", selectedLayerId);
  }, [layers, selectedLayerId]);

  // 删除图层
  const handleDeleteLayer = useCallback(
    (id: string) => {
      setLayers((prev) => {
        const toRemove = prev.find((l) => l.id === id);
        if (toRemove) {
          sceneRef.current!.remove(toRemove.mesh);
          toRemove.mesh.geometry.dispose();
          (toRemove.mesh.material as THREE.Material).dispose();
        }
        return prev.filter((l) => l.id !== id);
      });
      if (selectedLayerId === id) {
        setSelectedLayerId("base");
      }
    },
    [selectedLayerId],
  );

  // 切换图层可见性
  // 修改可见性切换函数
  const handleLayerVisibilityChange = useCallback((id: string) => {
    setLayers((prev) =>
      prev.map((layer) => {
        if (layer.id === id) {
          // 直接修改 Three.js 对象属性
          layer.mesh.visible = !layer.visible;

          // 创建新对象保证 React 状态更新
          return {
            ...layer,
            visible: layer.mesh.visible,
          };
        }
        return layer;
      }),
    );

    // 强制刷新 Three.js 场景
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, []);

  // 选择图层
  const handleLayerSelect = useCallback((id: string) => {
    setSelectedLayerId(id);
  }, []);

  const handleLayerMove = useCallback((id: string, direction: "up" | "down") => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || newIdx < 0 || newIdx >= prev.length) {
        return prev;
      }
      const arr = [...prev];

      // Refactored: Swap elements using a temporary variable for clarity
      const temp = arr[idx];
      arr[idx] = arr[newIdx]!;
      arr[newIdx] = temp!;

      // 重置渲染顺序和 z
      // 修改为指数级递增z位置
      arr.forEach((l, i) => {
        l.mesh.renderOrder = i;
        l.mesh.position.z = i * 0.05; // 加大层间间距
      });
      return arr;
    });
  }, []);

  function uvToTextureCoords(localPoint: THREE.Vector3, mesh: THREE.Mesh, pgm: PGMImage) {
    const geometry = mesh.geometry as THREE.PlaneGeometry;
    const meshWidth = geometry.parameters.width;
    const meshHeight = geometry.parameters.height;

    // 将局部坐标归一化到[0,1]
    const u = (localPoint.x + meshWidth / 2) / meshWidth; // [0,1]
    const v = (localPoint.y + meshHeight / 2) / meshHeight; // [0,1]

    return {
      x: Math.max(0, Math.min(Math.floor(u * pgm.width), pgm.width - 1)),
      y: Math.max(0, Math.min(Math.floor(v * pgm.height), pgm.height - 1)),
    };
  }

  // 1. 提取 handleResize
  const handleResize = React.useCallback(() => {
    if (!containerRef.current || !cameraRef.current || !rendererRef.current || !pgmData) {
      return;
    }
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    rendererRef.current.setSize(width, height, false);
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    rendererRef.current.setPixelRatio(window.devicePixelRatio || 1);

    const imageAspect = pgmData.width / pgmData.height;
    const containerAspect = width / height;

    let cameraWidth, cameraHeight;
    if (containerAspect > imageAspect) {
      cameraHeight = 2;
      cameraWidth = cameraHeight * containerAspect;
    } else {
      cameraWidth = 2;
      cameraHeight = cameraWidth / containerAspect;
    }

    const camera = cameraRef.current;
    camera.left = -cameraWidth / 2;
    camera.right = cameraWidth / 2;
    camera.top = cameraHeight / 2;
    camera.bottom = -cameraHeight / 2;
    camera.updateProjectionMatrix();

    rendererRef.current.render(sceneRef.current!, camera);
  }, [pgmData]);

  const initThree = useCallback(
    (lpgmData: PGMImage) => {
      if (!containerRef.current || !canvasRef.current) {
        console.error("Invalid canvas or container");
        console.error("Invalid pgmData");
        return;
      }
      // 获取实际容器尺寸
      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      const pixelRatio = window.devicePixelRatio || 1;

      // 设置 canvas 的物理像素尺寸
      canvasRef.current.width = width * pixelRatio;
      canvasRef.current.height = height * pixelRatio;

      // 设置渲染器的 CSS 像素尺寸（保持 canvas 元素的宽高不变）

      // 设置 canvas 实际尺寸
      canvasRef.current.width = width;
      canvasRef.current.height = height;

      const containerAspect = width / height;

      const lscene = new THREE.Scene();
      // 计算适当的相机参数以保持图像比例
      const imageAspect = lpgmData.width / lpgmData.height;
      let cameraLeft, cameraRight, cameraTop, cameraBottom;

      if (containerAspect > imageAspect) {
        // 容器更宽：以高度为基准
        const halfHeight = 1; // 图像高度单位为2（-1~1）
        const halfWidth = imageAspect * halfHeight;
        cameraLeft = -halfWidth;
        cameraRight = halfWidth;
        cameraTop = 1;
        cameraBottom = -1;
      } else {
        // 容器更高：以宽度为基准
        const halfWidth = 1; // 图像宽度单位为2（-1~1）
        const halfHeight = halfWidth / imageAspect;
        cameraLeft = -halfWidth;
        cameraRight = halfWidth;
        cameraTop = halfHeight;
        cameraBottom = -halfHeight;
      }

      const lcamera = new THREE.OrthographicCamera(
        cameraLeft,
        cameraRight,
        cameraTop,
        cameraBottom,
        0.1,
        1000,
      );

      let canvasWidth = width;
      let canvasHeight = height;

      if (containerAspect > imageAspect) {
        // 容器更宽，以高度为基准
        canvasWidth = height * imageAspect;
        canvasHeight = height;
      } else {
        // 容器更高，以宽度为基准
        canvasWidth = width;
        canvasHeight = width / imageAspect;
      }

      // 设置 canvas 尺寸
      canvasRef.current.width = canvasWidth;
      canvasRef.current.height = canvasHeight;

      lcamera.position.z = 5;

      const lrenderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
        alpha: true,
      });
      lrenderer.setSize(width, height, false);
      lrenderer.setPixelRatio(pixelRatio);

      // 使用实际像素尺寸
      lrenderer.sortObjects = false; // 禁用自动排序
      lrenderer.setClearColor(0xcccccc, 0); // 设置透明背景

      // 创建笔刷预览几何体
      const brushPreviewGeometry = new THREE.CircleGeometry(0.02, 32);
      const brushPreviewMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      const brushPreview = new THREE.Mesh(brushPreviewGeometry, brushPreviewMaterial);
      brushPreview.visible = false; // 初始时隐藏
      lscene.add(brushPreview);
      brushPreviewRef.current = brushPreview;
      //lrenderer.setPixelRatio((window.devicePixelRatio !== 0) || 2);

      // // 启用阴影映射
      // renderer.shadowMap.enabled = true;
      // renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // 设置编码，提高颜色表现
      lrenderer.outputColorSpace = THREE.SRGBColorSpace;
      const stats = new Stats();
      //stats.domElement:web页面上输出计算结果,一个div元素，
      canvasRef.current.appendChild(stats.dom);

      const controls = new OrbitControls(lcamera, lrenderer.domElement);
      // 修改控制器配置
      controls.enableDamping = false;
      controls.enableRotate = false;
      controls.panSpeed = 1.0; // 降低平移速度以提高精确度
      controls.zoomSpeed = 0.8; // 降低缩放速度以提高精确度
      controls.enablePan = true;
      controls.screenSpacePanning = true; // 使用屏幕空间平移
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      };
      cameraRef.current = lcamera;
      sceneRef.current = lscene;
      controlsRef.current = controls;
      rendererRef.current = lrenderer;
      const gridHelper = new THREE.GridHelper(10, 10);
      lscene.add(gridHelper);

      // 在动画循环中添加持续渲染
      const animate = () => {
        animationFrameRef.current = requestAnimationFrame(animate);

        // 持续渲染场景
        if (controlsRef.current) {
          controlsRef.current.update();
        }
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      };

      animate();
      // 关键：初始化后主动触发一次handleResize，保证比例正确
      handleResize();
    },
    [handleResize],
  );

  useEffect(() => {
    const handleResizeResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current || !pgmData) {
        return;
      }

      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // 更新渲染器尺寸（CSS像素）
      rendererRef.current.setSize(width, height, false);
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      rendererRef.current.setPixelRatio(window.devicePixelRatio || 1);

      // 重新计算相机视口
      const imageAspect = pgmData.width / pgmData.height;
      const containerAspect = width / height;

      let cameraWidth, cameraHeight;

      if (containerAspect > imageAspect) {
        cameraHeight = 2;
        cameraWidth = cameraHeight * containerAspect;
      } else {
        cameraWidth = 2;
        cameraHeight = cameraWidth / containerAspect;
      }

      const camera = cameraRef.current;
      camera.left = -cameraWidth / 2;
      camera.right = cameraWidth / 2;
      camera.top = cameraHeight / 2;
      camera.bottom = -cameraHeight / 2;
      camera.updateProjectionMatrix();

      // 强制重绘
      rendererRef.current.render(sceneRef.current!, camera);
    };
    window.addEventListener("resize", handleResizeResize);
    return () => {
      window.removeEventListener("resize", handleResizeResize);
    };
  }, [pgmData]);

  const loadPGMToGPU = React.useCallback(
    (pgm: PGMImage) => {
      // Renamed 'pgm' to 'pgmImage' to avoid conflict
      const scene = sceneRef.current;
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
      if (!scene || !pgm.data) {
        return;
      }

      // 创建 RGBA 格式的数据
      const rgbaData = new Uint8Array(pgm.width * pgm.height * 4);

      pgm.data.forEach((value, index) => {
        const pgmValue = Math.floor((value / pgm.maxVal) * 255);
        rgbaData[index * 4] = pgmValue; // R
        rgbaData[index * 4 + 1] = pgmValue; // G
        rgbaData[index * 4 + 2] = pgmValue; // B
        rgbaData[index * 4 + 3] = 255; // A
      });

      try {
        // const ltexture = new THREE.DataTexture(
        //   rgbaData,
        //   pgm.width,
        //   pgm.height,
        //   THREE.RGBAFormat,
        //   THREE.UnsignedByteType,
        // );
        // ltexture.flipY = true; // 添加这行
        // ltexture.needsUpdate = true;
        const ltexture = new THREE.DataTexture(
          rgbaData,
          pgm.width,
          pgm.height,
          THREE.RGBAFormat,
          THREE.UnsignedByteType,
        );
        ltexture.generateMipmaps = false; // 禁用mipmap
        ltexture.flipY = false; // 关闭默认的Y轴翻转
        ltexture.needsUpdate = true;

        const material = new THREE.MeshBasicMaterial({
          map: ltexture,
          transparent: true, // 启用透明
          opacity: 1, // 设置不透明度
          toneMapped: false, // 禁用色调映射
          depthTest: true, // 启用深度测试
          depthWrite: true, // 启用深度写入
          side: THREE.DoubleSide, // 添加这行
        });

        const imageAspect = pgm.width / pgm.height;
        const planeWidth = 2;
        const planeHeight = planeWidth / imageAspect;

        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
        const lmesh = new THREE.Mesh(geometry, material);

        setLayers([
          {
            id: "base",
            name: "Background",
            visible: true,
            texture: ltexture, // ← 而不是 tex
            mesh: lmesh, // ← 而不是 mesh
          },
        ]);
        setSelectedLayerId("base");
        scene.add(lmesh);
        textureRef.current = ltexture;
      } catch (error) {
        console.error("Error loading texture:", error);
      }
    },
    [sceneRef, textureRef],
  );

  function updateBrushPreviewScale(camera: THREE.OrthographicCamera, pgm: PGMImage) {
    if (!brushPreviewRef.current) {
      return;
    }

    // 计算相机视口宽度对应的像素数
    const cameraWidthPixels = camera.right - camera.left;

    // 将笔刷大小转换为世界单位
    const scale = (brushSize / pgm.width) * cameraWidthPixels;
    brushPreviewRef.current.scale.set(scale, scale, 1);
  }

  useEffect(() => {
    if (!pgmData) {
      return;
    }
    initThree(pgmData);
  }, [pgmData, initThree]);

  useEffect(() => {
    if (!pgmData || !sceneRef.current) {
      return;
    }
    loadPGMToGPU(pgmData);
  }, [loadPGMToGPU, pgmData, sceneRef]);

  // 绘制事件
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) {
      return;
    }
    // 修正为仅在绘制模式下触发
    // 在绘制前检查
    // if (getActiveLayer()?.id === 'base') {
    //   alert('请先选择非基础图层');
    //   return;
    // }

    // 优先处理点绘制模式
    if (drawPoint) {
      handleAddPoint(e);
    } else {
      setIsMouseDown(true);
      if (brushPreviewRef.current) {
        brushPreviewRef.current.visible = true;
      }
      draw(e);
    }
  };

  const handleAddPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!pointManagerRef.current) {
      console.warn("PointInteractionManager 尚未初始化");
      sendNotification("请等待地图加载完成后再添加点位", "", "user", "info");
      return;
    }

    if (!canvasRef.current || !cameraRef.current) {
      console.warn("Canvas 或 Camera 未准备好");
      return;
    }

    if (layers.length === 0) {
      console.warn("没有可用的图层");
      sendNotification("请等待地图图层加载完成", "", "user", "info");
      return;
    }

    pointManagerRef.current.addPointFromClick(e, cameraRef.current, canvasRef.current);
    setPoints(pointManagerRef.current.getPoints());
  };

  // 同步点位数据
  useEffect(() => {
    if (pointManagerRef.current) {
      setPoints(pointManagerRef.current.getPoints());
    }
  }, []);

  // 修改点删除逻辑
  const handleDeletePoint = useCallback((idToDelete: number) => {
    if (pointManagerRef.current) {
      pointManagerRef.current.deletePoint(idToDelete);
      setPoints(pointManagerRef.current.getPoints());
    }
  }, []);

  const endDraw = () => {
    setIsMouseDown(false);
    if (brushPreviewRef.current) {
      brushPreviewRef.current.visible = false;
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMouseDown || !drawing || !pgmData) {
      return;
    }

    const layer = layers.find((l) => l.id === selectedLayerId)!;
    if (layer.id === "base") {
      console.warn("不能在基础层上绘制");
      const now = Date.now();
      if (now - lastBaseLayerDrawErrorTime.current > 1000) {
        // 1秒内只弹一次
        sendNotification("不能在基础层上绘制,请新增图层", "", "user", "error");
        lastBaseLayerDrawErrorTime.current = now;
      }
      return;
    }
    const mesh = layer.mesh;
    const tex = layer.texture;

    const canvas = rendererRef.current!.domElement;
    const camera = cameraRef.current!;

    // 2. 标准化设备坐标 [-1,1]
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    // 3. 创建射线
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, camera);

    // 4. 计算交点（确保平面与mesh共面）
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    // 5. 转换为局部坐标
    const worldToLocal = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    const localPoint = intersectPoint.clone().applyMatrix4(worldToLocal);

    // 6. 转换为纹理坐标
    // 修正纹理坐标映射
    const { x: textureX, y: textureY } = uvToTextureCoords(localPoint, mesh, pgmData);

    // 边界检查
    const minX = Math.max(0, textureX - brushSize);
    const maxX = Math.min(pgmData.width - 1, textureX + brushSize);
    const minY = Math.max(0, textureY - brushSize);
    const maxY = Math.min(pgmData.height - 1, textureY + brushSize);
    // 修改纹理更新方式
    const imageData = tex.image.data;
    // 7. 边界检查与绘制
    // const data = tex.image.data;
    const data = new Uint8Array(imageData.buffer); // 创建可写副本
    for (let px = minX; px <= maxX; px++) {
      for (let py = minY; py <= maxY; py++) {
        const dx = px - textureX;
        const dy = py - textureY;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= brushSize) {
          const index = (py * pgmData.width + px) * 4;
          data[index] = brushColor; // R
          data[index + 1] = brushColor; // G
          data[index + 2] = brushColor; // B
          data[index + 3] = 255; // A
        }
      }
    }

    // 8. 强制更新纹理
    tex.image = new ImageData(
      new Uint8ClampedArray(data.buffer),
      tex.image.width,
      tex.image.height,
    );
    tex.needsUpdate = true;

    // 9. 更新笔刷预览位置
    if (brushPreviewRef.current) {
      brushPreviewRef.current.position.copy(intersectPoint);
      updateBrushPreviewScale(camera, pgmData);
    }
  };

  const toggleDrawing = useCallback(() => {
    setDrawing((prev) => {
      const newDrawingState = !prev;
      if (brushPreviewRef.current) {
        brushPreviewRef.current.visible = newDrawingState;
      }
      if (controlsRef.current) {
        controlsRef.current.enabled = !newDrawingState;
      }
      return newDrawingState;
    });
  }, []);

  const toggleDrawPoint = useCallback(() => {
    setDrawPoint((prev) => {
      return !prev;
    });
  }, []);

  const savePGM = async () => {
    if (!pgmData || !sceneRef.current || layers.length === 0) {
      return;
    }

    // 只合成非base层数据，底图全白
    const mergedData = new Uint8Array(pgmData.data.length);
    mergedData.fill(pgmData.maxVal); // 全白底图
    const sortedLayers = [...layers]
      .filter((layer) => layer.id !== "base")
      .sort((a, b) => a.mesh.renderOrder - b.mesh.renderOrder);

    sortedLayers.forEach((layer) => {
      if (!layer.visible) {
        return;
      }

      const textureData = new Uint8Array(layer.texture.image.data.buffer);
      textureData.forEach((value, i) => {
        if (i % 4 !== 0) {
          return;
        } // 只处理 R 通道

        const alpha = textureData[i + 3];
        if (alpha == undefined) {
          return;
        }
        if (alpha < 1) {
          return;
        } // 跳过完全透明的像素

        const x = (i / 4) % pgmData.width;
        const y = Math.floor(i / 4 / pgmData.width);
        const pgmIndex = (pgmData.height - 1 - y) * pgmData.width + x;

        const gray = Math.round((value / 255) * pgmData.maxVal);
        mergedData[pgmIndex] = gray;
      });
    });

    const updatedPGM: PGMImage = {
      ...pgmData,
      data: mergedData,
    };

    // 将 PGM 转为字符串并 Blob
    const pgmString = createPGMFromData(updatedPGM);
    const blob = new Blob([pgmString], { type: "application/octet-stream" });

    const mapName = selectedMap;

    try {
      const response = await fetch(
        `http://${ipAddr}/mapServer/save/maskMap?mapName=${encodeURIComponent(mapName)}`,
        {
          method: "POST",
          headers: {
            // 不设置 Content-Type，让浏览器自动处理边界
          },
          body: blob,
        },
      );

      if (!response.ok) {
        sendNotification(
          `PGM上传失败: ${response.status} ${response.statusText}`,
          "",
          "user",
          "error",
        );
        throw new Error(`上传失败: ${response.status} ${response.statusText}`);
      }

      sendNotification("PGM上传成功！", "", "user", "info");
      //console.log("PGM上传成功");
    } catch (error) {
      sendNotification(
        `PGM上传失败: ${error instanceof Error ? error.message : "未知错误"}`,
        "",
        "user",
        "error",
      );
      console.error("上传PGM失败:", error);
    }
  };

  // 下载maskMap.pgm并作为新图层添加
  const onDownloadMaskMap = useCallback(async () => {
    if (!selectedMap || !ipAddr || !sceneRef.current) {
      sendNotification("请先选择地图", "", "user", "error");
      return;
    }
    try {
      const url = `http://${ipAddr}/mapServer/download/${selectedMap}/maskMap.pgm`;
      const response = await fetch(url);
      if (!response.ok) {
        sendNotification(
          `下载maskMap失败: ${response.status} ${response.statusText}`,
          "",
          "user",
          "error",
        );
        return;
      }
      const buffer = await response.arrayBuffer();
      // 解析PGM
      let maskPGM: PGMImage | undefined;
      // 尝试P2和P5
      const decoder = new TextDecoder("ascii");
      const headerSnippet = decoder.decode(new Uint8Array(buffer).slice(0, 15));
      const magic = headerSnippet.trim().split(/\s+/)[0];
      if (magic === "P2") {
        maskPGM = parsePGM(decoder.decode(buffer));
      } else if (magic === "P5") {
        maskPGM = parsePGMBuffer(buffer);
      } else {
        sendNotification("未知PGM格式", "", "user", "error");
        return;
      }
      if (!maskPGM) {
        sendNotification("maskMap.pgm解析失败", "", "user", "error");
        return;
      }
      // 创建新图层
      const rgbaData = new Uint8Array(maskPGM.width * maskPGM.height * 4);

      const maxVal = maskPGM.maxVal;

      for (let y = 0; y < maskPGM.height; y++) {
        for (let x = 0; x < maskPGM.width; x++) {
          const srcIdx = (maskPGM.height - 1 - y) * maskPGM.width + x; // 倒序
          const dstIdx = (y * maskPGM.width + x) * 4;
          const value = Math.floor(((maskPGM.data[srcIdx] ?? 0) / maxVal) * 255);
          rgbaData[dstIdx] = value; // Unnecessary conditional, value is always truthy.
          rgbaData[dstIdx + 1] = value;
          rgbaData[dstIdx + 2] = value;
          rgbaData[dstIdx + 3] = value < 255 ? 255 : 0;
        }
      }

      const newTex = new THREE.DataTexture(
        rgbaData,
        maskPGM.width,
        maskPGM.height,
        THREE.RGBAFormat,
        THREE.UnsignedByteType,
      );
      newTex.generateMipmaps = false;
      newTex.flipY = false;
      newTex.needsUpdate = true;
      const material = new THREE.MeshBasicMaterial({
        map: newTex,
        transparent: true,
        opacity: 1,
        toneMapped: false,
        depthTest: true,
        depthWrite: true,
        side: THREE.DoubleSide,
      });
      const imageAspect = maskPGM.width / maskPGM.height;
      const planeWidth = 2;
      const planeHeight = planeWidth / imageAspect;
      const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
      const newMesh = new THREE.Mesh(geometry, material);
      // 设置z和renderOrder
      const newLayerIndex = layers.length;
      newMesh.renderOrder = newLayerIndex;
      newMesh.position.z = newLayerIndex * 0.1;
      sceneRef.current.add(newMesh);
      const newLayer = {
        id: `maskMap-${Date.now()}`,
        name: `MaskMap ${newLayerIndex}`,
        visible: true,
        texture: newTex,
        mesh: newMesh,
      };
      setLayers((prev) => [...prev, newLayer]);
      setSelectedLayerId(newLayer.id);
      sendNotification("maskMap.pgm下载并添加为新图层成功", "", "user", "info");
    } catch (err) {
      sendNotification(
        `下载maskMap异常: ${err instanceof Error ? err.message : "未知错误"}`,
        "",
        "user",
        "error",
      );
    }
  }, [selectedMap, ipAddr, sceneRef, layers]);

  // PointsDrawer相关处理函数
  const handlePointSelect = useCallback((id: number) => {
    setSelectedPointId(id);
  }, []);

  const handlePointVisibilityChange = useCallback((id: number) => {
    if (pointManagerRef.current) {
      pointManagerRef.current.togglePointVisibility(id);
      setPoints(pointManagerRef.current.getPoints());
    }
  }, []);

  const handlePointNameChange = useCallback((id: number, newName: string) => {
    if (pointManagerRef.current) {
      pointManagerRef.current.updatePoint(id, { name: newName });
      setPoints(pointManagerRef.current.getPoints());
    }
  }, []);

  const handleAddPointFromDrawer = useCallback(() => {
    // 这里可以添加一个默认点或者提示用户在地图上点击
    const newId = points.length > 0 ? Math.max(...points.map((p) => p.id)) + 1 : 1;
    const newPoint: Point = {
      id: newId,
      name: `新点位${newId}`,
      x: 0,
      y: 0,
      worldX: 0,
      worldY: 0,
      visible: true,
    };
    if (pointManagerRef.current) {
      pointManagerRef.current.addPoint(newPoint);
      setPoints(pointManagerRef.current.getPoints());
    }
  }, [points]);

  const handleRefreshPoints = useCallback(() => {
    void downloadPoints();
  }, []);

  // 右键菜单处理函数
  // const handleContextMenu = useCallback((e: React.MouseEvent) => {
  //   e.preventDefault();
  //
  //   if (pointManagerRef.current) {
  //     const selectedPointId = pointManagerRef.current.getSelectedPointForMenu();
  //     if (selectedPointId !== null && selectedPointId !== undefined) {
  //       setContextMenu({
  //         visible: true,
  //         x: e.clientX,
  //         y: e.clientY,
  //         pointId: selectedPointId
  //       });
  //     }
  //   }
  // }, []);

  // 关闭右键菜单
  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  // 删除点位
  const handleDeletePointFromMenu = useCallback(() => {
    if (contextMenu.pointId != null && pointManagerRef.current) {
      pointManagerRef.current.deletePoint(contextMenu.pointId);
      setPoints(pointManagerRef.current.getPoints());
      closeContextMenu();
      sendNotification("点位删除成功", "", "user", "info");
    }
  }, [contextMenu.pointId, closeContextMenu]);

  // 开始创建线段
  const handleStartCreatingLine = useCallback(() => {
    if (contextMenu.pointId != null && pointManagerRef.current) {
      pointManagerRef.current.startCreatingLine(contextMenu.pointId);
      closeContextMenu();
      sendNotification(
        "开始创建折线，右键点击空白处添加中间点，点击另一个点位完成",
        "",
        "user",
        "info",
      );
    }
  }, [contextMenu.pointId, closeContextMenu]);

  // 取消线段创建
  const handleCancelCreatingLine = useCallback(() => {
    if (pointManagerRef.current) {
      pointManagerRef.current.cancelCreatingLine();
      sendNotification("线段创建已取消", "", "user", "info");
    }
  }, []);

  // Pointer events
  useEffect(() => {
    if (!rendererRef.current || !cameraRef.current || !pointManagerRef.current) {
      return;
    }
    const canvas = rendererRef.current.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 0) {
        // 左键点击：处理拖拽开始
        pointManagerRef.current?.handleDragStart(e, cameraRef.current!, rendererRef.current!);
      }
    };

    const onPointerUp = () => {
      pointManagerRef.current?.handleDragEnd();
    };

    const onPointerMove = (e: PointerEvent) => {
      pointManagerRef.current?.handleDragMove(e, cameraRef.current!, rendererRef.current!);
    };

    const onContextMenu = (e: Event) => {
      e.preventDefault();
      if (e instanceof MouseEvent) {
        //console.log("右键菜单事件触发");

        if (!pointManagerRef.current) {
          //console.log("PointInteractionManager 未初始化");
          return;
        }

        // 如果正在创建折线，不显示菜单，直接处理折线逻辑
        if (pointManagerRef.current.isCreatingLine()) {
          //console.log("正在创建折线，直接处理折线逻辑");
          pointManagerRef.current.handleRightClick(e, cameraRef.current!, rendererRef.current!);
          setPoints(pointManagerRef.current.getPoints());
          //setLines(pointManagerRef.current.getLines() ?? []);
          return;
        }

        pointManagerRef.current.handleRightClick(e, cameraRef.current!, rendererRef.current!);
        setPoints(pointManagerRef.current.getPoints());
        //setLines(pointManagerRef.current.getLines() ?? []);

        // 如果有点位被选中，显示右键菜单
        const editClickPointId = pointManagerRef.current.getSelectedPointForMenu();
        //console.log("选中的点位ID:", selectedPointId);
        if (editClickPointId != null) {
          //console.log("设置右键菜单，位置:", e.clientX, e.clientY);
          setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            pointId: editClickPointId,
          });
        } else {
          //console.log("没有选中点位，清除菜单");
          setContextMenu((prev) => ({ ...prev, visible: false }));
        }
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown, { capture: true });
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("contextmenu", onContextMenu);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("contextmenu", onContextMenu);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraRef.current, rendererRef.current, pointManagerRef.current]);

  // 节流基础层画画错误提示
  const lastBaseLayerDrawErrorTime = useRef(0);

  // 初始化PointInteractionManager
  useEffect(() => {
    if (sceneRef.current && pgmData && ipAddr && selectedMap && layers.length > 0) {
      // 清理旧的管理器
      if (pointManagerRef.current) {
        pointManagerRef.current.dispose();
      }

      // 创建新的管理器
      pointManagerRef.current = new PointInteractionManager(
        sceneRef.current,
        mapConfig as MapConfig,
        pgmData,
        ipAddr,
        selectedMap,
        layers,
      );
      // 同步点位数据
      setPoints(pointManagerRef.current.getPoints());
    }
  }, [pgmData, mapConfig, ipAddr, selectedMap, layers]);

  // 同步layers变化到PointInteractionManager
  useEffect(() => {
    if (pointManagerRef.current && layers.length > 0) {
      pointManagerRef.current.updateLayers(layers);
    }
  }, [layers]);

  // 监听sceneRef.current变化，确保PointInteractionManager的scene引用始终最新
  useEffect(() => {
    if (pointManagerRef.current && sceneRef.current) {
      pointManagerRef.current.updateScene(sceneRef.current);
      pointManagerRef.current.forceRenderLines();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneRef.current, pointManagerRef.current]);

  return (
    <div
      ref={containerRef as React.MutableRefObject<HTMLDivElement>}
      style={{
        width: "100%",
        height: "100%", // 确保容器有明确的高度
        position: "relative",
        display: "flex",
        flexDirection: "column", // 改为纵向布局
      }}
    >
      <DrawingToolbar
        drawing={drawing}
        drawPoint={drawPoint}
        onExportPoints={exportPoints}
        toggleDrawing={toggleDrawing}
        toggleDrawPoint={toggleDrawPoint}
        savePGM={savePGM}
        onBrushColorChange={handleBrushColorChange}
        brushColor={brushColor}
        onLayerDrawerToggle={() => {
          setIsLayerDrawerOpen(!isLayerDrawerOpen);
        }}
        isLayerPanelOpen={isLayerDrawerOpen}
        brushSize={brushSize}
        onBrushSizeChange={handleBrushSizeChange}
        loadPoints={downloadPoints}
        onPointsDrawerToggle={() => {
          setIsPointsDrawerOpen(!isPointsDrawerOpen);
        }}
        isPointsPanelOpen={isPointsDrawerOpen}
        onDownloadMaskMap={onDownloadMaskMap}
        onCancelCreatingLine={handleCancelCreatingLine}
        isCreatingLine={pointManagerRef.current?.isCreatingLine() ?? false}
      />
      <div>
        <label htmlFor="map-select">选择地图：</label>
        <select
          id="map-select"
          value={selectedMap}
          onChange={(e) => {
            setSelectedMap(e.target.value);
          }}
        >
          <option value="">请选择</option>
          {mapList.map((map) => (
            <option key={map} value={map}>
              {map}
            </option>
          ))}
        </select>

        {/* 测试按钮 */}
        {/*<button*/}
        {/*  onClick={(e) => {*/}
        {/*    e.stopPropagation();*/}
        {/*    if (pointManagerRef.current) {*/}
        {/*      const newId = points.length > 0 ? Math.max(...points.map(p => p.id)) + 1 : 1;*/}
        {/*      const newPoint: Point = {*/}
        {/*        id: newId,*/}
        {/*        name: `测试点位${newId}`,*/}
        {/*        x: 0,*/}
        {/*        y: 0,*/}
        {/*        worldX: 0,*/}
        {/*        worldY: 0,*/}
        {/*        visible: true*/}
        {/*      };*/}
        {/*      pointManagerRef.current.addPoint(newPoint);*/}
        {/*      setPoints(pointManagerRef.current.getPoints());*/}
        {/*      console.log("添加测试点位:", newPoint);*/}
        {/*    }*/}
        {/*  }}*/}
        {/*  onMouseDown={e => e.stopPropagation()}*/}
        {/*  style={{ marginLeft: '10px' }}*/}
        {/*>*/}
        {/*  添加测试点位*/}
        {/*</button>*/}
      </div>

      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          justifyContent: "center", // 水平居中
          alignItems: "center", // 垂直居中
        }}
      >
        <canvas
          ref={canvasRef as React.MutableRefObject<HTMLCanvasElement>}
          onMouseDown={(e) => {
            // 只处理左键点击（button === 0），并且当前是 drawPoint 模式
            if (e.button === 0) {
              startDraw(e);
            }
          }}
          onMouseMove={(e) => {
            // 只有在鼠标按下，并且正在绘制状态才触发
            if (isMouseDown && drawing) {
              draw(e);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault(); // 阻止右键菜单
            // 右键删除逻辑交给 pointer 事件处理
          }}
          onMouseEnter={() => {
            //setIsHoveringCanvas(true);
          }}
          onMouseLeave={() => {
            //setIsHoveringCanvas(false);
          }}
          onMouseUp={endDraw}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain", // 保持宽高比
            cursor:
              pointManagerRef.current?.isCreatingLine() ?? false
                ? "crosshair"
                : drawing
                  ? "crosshair"
                  : "default",
          }}
        />

        {/* 创建折线模式提示 */}
        {(pointManagerRef.current?.isCreatingLine() ?? false) && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "rgba(255, 0, 0, 0.8)",
              color: "white",
              padding: "8px 16px",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: "bold",
              zIndex: 1000,
              pointerEvents: "none",
            }}
          >
            折线创建模式 - 右键点击空白处添加点，点击点位完成
          </div>
        )}

        <LayerDrawer
          open={isLayerDrawerOpen}
          layers={layers}
          selectedLayer={selectedLayerId}
          onClose={() => {
            setIsLayerDrawerOpen(false);
          }}
          onAddLayer={handleAddLayer}
          onDeleteLayer={handleDeleteLayer}
          onLayerVisibilityChange={handleLayerVisibilityChange}
          onLayerSelect={handleLayerSelect}
          onLayerMove={handleLayerMove}
        />
        <PointsDrawer
          open={isPointsDrawerOpen}
          points={points}
          selectedPoint={selectedPointId}
          onClose={() => {
            setIsPointsDrawerOpen(false);
          }}
          onAddPoint={handleAddPointFromDrawer}
          onDeletePoint={handleDeletePoint}
          onPointVisibilityChange={handlePointVisibilityChange}
          onPointSelect={handlePointSelect}
          onPointNameChange={handlePointNameChange}
          onRefreshPoints={handleRefreshPoints}
        />

        {/* 右键菜单 */}
        {contextMenu.visible && (
          <div
            style={{
              position: "fixed",
              top: contextMenu.y,
              left: contextMenu.x,
              backgroundColor: "white",
              border: "1px solid #ccc",
              borderRadius: "4px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              zIndex: 1000,
              minWidth: "120px",
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
                fontSize: "14px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
              onClick={handleStartCreatingLine}
            >
              创建折线
            </div>
            <div
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "14px",
                color: "#d32f2f",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
              onClick={handleDeletePointFromMenu}
            >
              删除点位
            </div>
          </div>
        )}

        {/* 全局点击关闭菜单 */}
        {contextMenu.visible && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={closeContextMenu}
          />
        )}
      </div>
    </div>
  );
};

export default PGMCanvasEditor;
