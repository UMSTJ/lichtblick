import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "three/examples/jsm/libs/stats.module";

import { DrawingToolbar } from "@lichtblick/suite-base/panels/SlamMapEdit/PGMCanvasEditor/components/DrawingToolbar";
import {
  LayerDrawer,
  Layer,
} from "@lichtblick/suite-base/panels/SlamMapEdit/PGMCanvasEditor/components/LayerDrawer";
import {
  PointsDrawer,
} from "@lichtblick/suite-base/panels/SlamMapEdit/PGMCanvasEditor/components/PointsDrawer";
// @ts-ignore
import * as yaml from 'js-yaml';
import { MessagePipelineContext, useMessagePipeline } from "@lichtblick/suite-base/components/MessagePipeline";
import sendNotification from "@lichtblick/suite-base/util/sendNotification";

// PGM 格式定义
export interface PGMImage {
  width: number;
  height: number;
  maxVal: number;
  data: Uint8Array;
}
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
    while (i < bytes.length && header.split('\n').filter(line => line.trim() !== '').length < 3) {
      header += decoder.decode(bytes.slice(i, i + 1));
      i++;
    }

    const lines = header
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    if (lines[0] !== "P5") {
      console.error("Invalid PGM format: Expected P5.");
      console.error(lines[0]);
      return undefined;
    }

    // @ts-ignore
    const [width, height] = lines[1].split(/\s+/).map(Number);
    // @ts-ignore
    const maxVal = parseInt(lines[2], 10);

    // @ts-ignore
    if (
      // @ts-ignore
      isNaN(width) ||
      // @ts-ignore
      isNaN(height) ||
      isNaN(maxVal) ||
      // @ts-ignore
      width <= 0 ||
      // @ts-ignore
      height <= 0 ||
      maxVal <= 0
    ) {
      console.error("Invalid header values in PGM.");
      return undefined;
    }

    // 剩下的是像素数据
    // @ts-ignore
    const pixelData = bytes.slice(i, i + width * height);

    // @ts-ignore
    if (pixelData.length !== width * height) {
      console.error("Pixel data size mismatch.");
      return undefined;
    }

    return {
      // @ts-ignore
      width,
      // @ts-ignore
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
      console.error("Invalid PGM formatP2.")
      return undefined;
    }

    // 使用更高效的方式解析头部信息
    // @ts-ignore
    const dimensions = lines[1].split(/\s+/).map(Number);
    if (dimensions.length !== 2) {
      console.log("Invalid PGM formatlength.")
      return undefined;
    }

    const [width, height] = dimensions;
    // @ts-ignore
    const maxVal = parseInt(lines[2], 10);

    // @ts-ignore
    if (isNaN(width) || isNaN(height) || isNaN(maxVal)) {
      console.error("Invalid PGM format3.")
      return undefined;
    }

    // 一次性处理像素数据
    // @ts-ignore
    const pixelData = new Uint8Array(width * height);
    let pixelIndex = 0;

    // 从第4行开始处理像素数据
    // @ts-ignore
    for (let i = 3; i < lines.length && pixelIndex < width * height; i++) {
      // @ts-ignore
      const values = lines[i]
        .trim()
        .split(/\s+/)
        .map((v) => parseInt(v, 10));
      for (const val of values) {
        // @ts-ignore
        if (pixelIndex >= width * height) {
          break;
        }
        pixelData[pixelIndex++] = val;
      }
    }

    // @ts-ignore
    if (pixelIndex !== width * height) {
      console.error("Invalid PGM format4.")
      return undefined;
    }

    // @ts-ignore
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
  for (let i = 0; i < data.length; i++) {
    body += data[i] + (i % width === width - 1 ? "\n" : " ");
  }
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

  const [pgmData, setPGMData] = useState<PGMImage | undefined>(undefined);
  const [drawing, setDrawing] = useState(false);
  const [drawPoint,setDrawPoint] = useState(false);
  const [points, setPoints] = useState<Array<{ id: number; x: number; y: number; worldX: number; worldY: number ;name:string; visible: boolean}>>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMouseDown, setIsMouseDown] = useState(false);

  // const [pgmFile, setPgmFile] = useState<File | undefined>(undefined);
  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);

  const [brushColor, setBrushColor] = useState<number>(0);
  const [brushSize, setBrushSize] = useState(5);

  const [mapList, setMapList] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState<string>("");

  // PointsDrawer相关状态
  const [isPointsDrawerOpen, setIsPointsDrawerOpen] = useState(false);
  const [selectedPointId, setSelectedPointId] = useState<number | undefined>();

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
    image: '',
    resolution: 0.05,
    origin: [0, 0, 0],
    negate: 0,
    occupied_thresh: 0.65,
    free_thresh: 0.25
  });

  // 获取地图列表
  useEffect(() => {
    if (!ipAddr) return;
    const url = `http://${ipAddr}/mapServer/mapList`;
    fetch(url)
      .then(res => res.json())
      .then(setMapList)
      .catch(err => console.error("获取地图列表失败:", err));
  }, [ipAddr]);
  // 从接口下载PGM文件的逻辑
  useEffect(() => {
    const downloadAndLoadMap = async () => {
      if (!selectedMap) return;

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
        console.log("magic:", magic)
        if (magic === "P2") {
          // 文本格式，需要全文作为 string 传给 P2 解析器
          const text = decoder.decode(buffer);
          // 你原来用于解析 P2 的方法
          setPGMData(parsePGM(text))
        } else if (magic === "P5") {
          // 二进制解析
          setPGMData(parsePGMBuffer(buffer))
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
      } catch (error) {
        console.error('地图下载加载错误:', error);
        // 处理错误情况
      }
    };




    downloadAndLoadMap();

  }, [selectedMap ]); // 依赖mapConfig，当配置变更时触发


  const downloadPoints = async () => {

    if (!selectedMap || !pgmData || !mapConfig) {
      console.error(selectedMap, pgmData, mapConfig)
      sendNotification("下载失败：缺少必要的地图数据或配置", "", "user", "error");
      return;

    }
    try {
      const url = `http://${ipAddr}/mapServer/download/${selectedMap}/map.json`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP 错误: ${response.status}`);
      }

      const data = await response.json();
      console.log("data:", data)
      const { origin, resolution } = mapConfig;
      console.log("origin:", origin, "resolution:", resolution)
      const formattedPoints = data.map((point: any) => {
        if (!pgmData.height || !pgmData.width) {
          console.warn("PGM 高宽数据无效");
          return null;
        }

        // 计算出像素坐标
        // @ts-ignore
        const pixelX = (point.x - origin[0]) / resolution - 0.5;
        // @ts-ignore
        const pixelY = pgmData.height - (point.y - origin[1]) / resolution - 0.5;

        console.log("像素坐标:", pixelX, pixelY)
        // 归一化像素到 [0, 1]
        const uvX = pixelX / pgmData.width;
        const uvY = pixelY / pgmData.height;
        console.log("归一化像素坐标:", uvX, uvY)
        const mesh = layers[0]?.mesh;
        if (!mesh) {
          console.warn("Mesh 不存在，无法反推坐标");
          return null;
        }


        const geometry = mesh.geometry;
        geometry.computeBoundingBox();
        const boundingBox = geometry.boundingBox!;
        const size = new THREE.Vector3();
        boundingBox.getSize(size);

        const localX = uvX * size.x + boundingBox.min.x;
        const localY = (1 - uvY) * size.y + boundingBox.min.y;
        console.log("localX:", localX, "localY:", localY)
        return {
          id: point.id,
          name: point.name,
          x: localX,
          y: -localY,
          worldX: point.x,
          worldY: point.y,
        };
      }).filter(Boolean); // 过滤掉 mesh 不存在的情况
      console.log(formattedPoints)
      setPoints(formattedPoints);
      sendNotification(`点位下载成功！共下载 ${formattedPoints.length} 个点位`, "", "user", "info");
    } catch (error) {
      console.error('点位下载错误:', error);
      sendNotification(`点位下载失败：${error instanceof Error ? error.message : '未知错误'}`, "", "user", "error");
    }
  };
// 选中地图后加载 YAML
  useEffect(() => {
    if (!selectedMap) return;

    const fetchYaml = async () => {
      try {
        const yamlRes = await fetch(`http://${ipAddr}/mapServer/download/yamlfile?mapname=${selectedMap}`);
        const yamlText = await yamlRes.text();
        const mapConfig = yaml.load(yamlText) as ROSMapConfig;
        console.log("mapConfig:", mapConfig)
        setMapConfig(mapConfig)
      } catch (err) {
        console.error("加载 YAML 失败:", err);
      }
    };
    fetchYaml();
  }, [selectedMap, setMapConfig]);

  // 添加导出点位函数
  const exportPoints = useCallback(async () => {
    if (!mapConfig || points.length === 0) {
      sendNotification("导出失败：没有可导出的点位数据", "", "user", "error");
      return;
    }

    // 提取地图名称
    const mapName = selectedMap;

    // 构建符合后端 Java DTO 的结构
    const payload = {
      mapName: mapName,
      points: points.map(p => ({
        x: p.worldX,
        y: p.worldY,
        id: p.id,
        name: p.name,
        // latitude: p.latitude ?? 0,      // 如果没有经纬度可默认为 0 或 null
        // longitude: p.longitude ?? 0
      }))
    };

    try {
      const url = `http://${ipAddr}/mapServer/save/points`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      console.log("body:", JSON.stringify(payload));
      if (!response.ok) {
        throw new Error(`保存失败: ${response.status} ${response.statusText}`);
      }

      console.log("保存成功");
      sendNotification(`点位导出成功！共导出 ${points.length} 个点位`, "", "user", "info");
    } catch (error) {
      console.error("保存点位失败:", error);
      sendNotification(`点位导出失败：${error instanceof Error ? error.message : '未知错误'}`, "", "user", "error");
    }
  }, [mapConfig, points]);



  const handleBrushSizeChange = (size: number) => {
    setBrushSize(size);
  };
  const handleBrushColorChange = useCallback((color: number) => {
    setBrushColor(color);
  }, []);

  // 添加新图层
  const handleAddLayer = useCallback(() => {
    if (!sceneRef.current) return;

    setLayers(prev => {
      if (prev.length === 0) return prev;
      const base = prev[0];

      // 创建完全独立且初始透明的纹理
      // @ts-ignore
      const rgbaData = new Uint8Array(base.texture.image.data.length);
      // @ts-ignore
      rgbaData.set(base.texture.image.data); // 拷贝原始数据
      // @ts-ignore
      rgbaData.fill(0, 3, -1, 4); // 将alpha通道设为0（完全透明）

      const newTex = new THREE.DataTexture(
        rgbaData,
        // @ts-ignore
        base.texture.image.width,
        // @ts-ignore
        base.texture.image.height,
        THREE.RGBAFormat,
        THREE.UnsignedByteType
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

      // @ts-ignore
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
        mesh: newMesh
      };

      setTimeout(() => setSelectedLayerId(newLayer.id), 0);
      return [...prev, newLayer];
    });
  }, [sceneRef]);

  useEffect(() => {
    console.log("当前图层列表:", layers);
    console.log("当前选中图层:", selectedLayerId);
  }, [layers, selectedLayerId]);


  // 删除图层
  const handleDeleteLayer = useCallback((id: string) => {
    setLayers(prev => {
      const toRemove = prev.find(l => l.id === id);
      if (toRemove) {
        sceneRef.current!.remove(toRemove.mesh);
        toRemove.mesh.geometry.dispose();
        (toRemove.mesh.material as THREE.Material).dispose();
      }
      return prev.filter(l => l.id !== id);
    });
    if (selectedLayerId === id) {
      setSelectedLayerId('base');
    }
  }, [selectedLayerId]);


  // 切换图层可见性
  // 修改可见性切换函数
  const handleLayerVisibilityChange = useCallback((id: string) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id === id) {
        // 直接修改 Three.js 对象属性
        layer.mesh.visible = !layer.visible;

        // 创建新对象保证 React 状态更新
        return {
          ...layer,
          visible: layer.mesh.visible
        };
      }
      return layer;
    }));

    // 强制刷新 Three.js 场景
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, []);

  // 选择图层
  const handleLayerSelect = useCallback((id: string) => {
    setSelectedLayerId(id);
    console.log("selectedLayerId",selectedLayerId);
  }, []);


  const handleLayerMove = useCallback((id: string, direction: 'up'|'down') => {
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id);
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (idx < 0 || newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      // @ts-ignore
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      // 重置渲染顺序和 z
      // 修改为指数级递增z位置
      arr.forEach((l, i) => {
        l.mesh.renderOrder = i;
        l.mesh.position.z = i * 0.1; // 加大层间间距
      });
      return arr;
    });
  }, []);


  function getCanvasMousePosition(
    e: React.MouseEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
  ) {
    const rect = canvas.getBoundingClientRect();

    // 设备像素坐标
    // const x = (e.clientX - rect.left) * pixelRatio;
    // const y = (e.clientY - rect.top) * pixelRatio;

    // 使用 CSS 像素坐标（更简单且足够精确）
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    return { x, y };
  }
  function uvToTextureCoords(localPoint: THREE.Vector3, mesh: THREE.Mesh, pgmData: PGMImage) {
    const geometry = mesh.geometry as THREE.PlaneGeometry;
    const meshWidth = geometry.parameters.width;
    const meshHeight = geometry.parameters.height;

    // 将局部坐标归一化到[0,1]
    const u = (localPoint.x + meshWidth / 2) / meshWidth; // [0,1]
    const v = (localPoint.y + meshHeight / 2) / meshHeight; // [0,1]

    // 考虑图像宽高比进行修正
    const imageAspect = pgmData.width / pgmData.height;
    const meshAspect = meshWidth / meshHeight;

    // @ts-ignore
    let textureX, textureY;
    if (meshAspect > imageAspect) {
      // 网格更宽：以高度为基准
      const effectiveWidth = imageAspect * meshHeight;
      const offset = (meshWidth - effectiveWidth) / 2;
      // @ts-ignore
      textureX = Math.floor(
        ((localPoint.x + meshWidth / 2 - offset) / effectiveWidth) * pgmData.width,
      );
    } else {
      // 网格更高：以宽度为基准
      const effectiveHeight = meshWidth / imageAspect;
      const offset = (meshHeight - effectiveHeight) / 2;
      // @ts-ignore
      textureY = Math.floor(
        ((localPoint.y + meshHeight / 2 - offset) / effectiveHeight) * pgmData.height,
      );
    }

    return {
      x: Math.max(0, Math.min(Math.floor(u * pgmData.width), pgmData.width - 1)),
      y: Math.max(0, Math.min(Math.floor(v * pgmData.height), pgmData.height - 1)),
    };
  }

  const initThree = useCallback((lpgmData: PGMImage) => {
    if (!containerRef.current || !canvasRef.current) {
      console.error("Invalid canvas or container");
      console.error("Invalid pgmData");
      return;
    }
    // 获取实际容器尺寸
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
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
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current || !pgmData) {
        return;
      }

      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // 更新渲染器尺寸（CSS像素）
      rendererRef.current.setSize(width, height, false);
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

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [pgmData]);

  const loadPGMToGPU = React.useCallback(
    (pgm: PGMImage) => {
      const scene = sceneRef.current;
      if (!scene || !pgm.data) {
        return;
      }

      // 创建 RGBA 格式的数据
      const rgbaData = new Uint8Array(pgm.width * pgm.height * 4);
      for (let i = 0; i < pgm.data.length; i++) {
        // @ts-ignore
        const value = Math.floor((pgm.data[i] / pgm.maxVal) * 255);
        rgbaData[i * 4] = value; // R
        rgbaData[i * 4 + 1] = value; // G
        rgbaData[i * 4 + 2] = value; // B
        rgbaData[i * 4 + 3] = 255; // A
      }

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
          THREE.UnsignedByteType
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

        setLayers([{
          id: 'base',
          name: 'Background',
          visible: true,
          texture: ltexture,   // ← 而不是 tex
          mesh: lmesh           // ← 而不是 mesh
        }]);
        setSelectedLayerId('base');
        scene.add(lmesh);
        textureRef.current = ltexture;
      } catch (error) {
        console.error("Error loading texture:", error);
      }
    },
    [sceneRef, textureRef],
  );


  function updateBrushPreviewScale(camera: THREE.OrthographicCamera, pgmData: PGMImage) {
    if (!brushPreviewRef.current) {
      return;
    }

    // 计算相机视口宽度对应的像素数
    const cameraWidthPixels = camera.right - camera.left;

    // 将笔刷大小转换为世界单位
    const scale = (brushSize / pgmData.width) * cameraWidthPixels;
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
    if (!pgmData || !sceneRef.current || !canvasRef.current || !cameraRef.current) return;

    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    const mesh = layers[0]?.mesh;

    if (!mesh) return;

    // 获取鼠标位置
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    // 执行射线检测
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersection = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(plane, intersection)) return;

    // 转换到纹理坐标
    const worldToLocal = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    const localPoint = intersection.clone().applyMatrix4(worldToLocal);
    const { x: pixelX, y: pixelY } = uvToTextureCoords(localPoint, mesh, pgmData);

    // 转换为实际坐标（使用YAML参数）
    const { origin, resolution } = mapConfig;
    // 米制坐标计算（包含像素中心偏移）
    // @ts-ignore
    const worldX = origin[0] + (pixelX + 0.5) * resolution;
    // @ts-ignore
    const worldY = origin[1] + (pgmData.height - pixelY - 0.5) * resolution;
    console.log("添加点 原始像素坐标:", pixelX, pixelY);
    console.log("添加点 实际坐标:", worldX, worldY);

    // 添加点到状态
    setPoints(prev => {
      const newId = prev.length > 0 ? Math.max(...prev.map(p => p.id)) + 1 : 1;
      return [...prev, { id: newId, x: intersection.x, y: intersection.y, worldX: worldX, worldY: worldY ,name: `点${newId}`, visible: true }];
    });


  };
// Markers: keep refs
  const markersRef = useRef<Record<number, THREE.Object3D>>({});

  // 1. 添加一个创建编号标记的函数
  function createNumberedMarker(pointId: number, position: THREE.Vector3) {
    // 1.1 创建圆环几何体作为标记背景
    const markerGeometry = new THREE.RingGeometry(0.008, 0.01, 64);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide
    });

    // 1.2 创建圆环背景
    const circle = new THREE.Mesh(markerGeometry, markerMaterial);
    circle.position.copy(position);

    // 1.3 创建带数字编号的精灵
    const sprite = createNumberSprite(pointId.toString());
    sprite.position.copy(position);
    sprite.position.z = position.z + 0.001; // 确保精灵在圆环上方

    // 1.4 创建一个组来包含圆环和精灵
    const group = new THREE.Group();
    group.add(circle);
    group.add(sprite);

    // 存储点的ID以便识别
    circle.userData = { id: pointId };
    sprite.userData = { id: pointId };

    return group;
  }

// 2. 修改createNumberSprite函数使其更好适配
  function createNumberSprite(text: string) {
    const canvas = document.createElement('canvas');
    const size = 64; // 减小尺寸以提高清晰度
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // 2.1 绘制透明背景
    ctx.clearRect(0, 0, size, size);

    // 2.2 绘制文字居中
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 2.3 添加阴影增强可读性
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.fillText(text, size/2, size/2);

    // 2.4 创建纹理和精灵材质
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      transparent: true
    });

    // 2.5 创建精灵
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.03, 0.03, 1); // 减小尺寸以适应圆环

    return sprite;
  }

  // 3. 修改用于渲染标记的useEffect
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // 3.1 清理旧标记
    Object.values(markersRef.current).forEach(m => scene.remove(m));
    markersRef.current = {};

    // 3.2 使用修改后的函数创建新标记
    points.forEach(p => {
      // 只渲染可见的点（visible !== false）
      if (p.visible !== false) {
        const pos = new THREE.Vector3(p.x, p.y, 0.5);
        const marker = createNumberedMarker(p.id, pos);
        scene.add(marker);
        markersRef.current[p.id] = marker;
      }
    });
  }, [points]);





  const pointsRef = useRef(points);

// 每当 points 更新，同步更新 ref
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);


  // 修改点删除逻辑
  const handleDeletePoint = useCallback((idToDelete: number) => {
    setPoints(prevPoints => {
      // 1. 过滤掉要删除的点
      const filtered = prevPoints.filter(p => p.id !== idToDelete);

      // 2. 重新分配连续ID（索引+1）
      return filtered.map((point, index) => ({
        ...point,
        id: index + 1
      }));
    });
  }, []);

  // Pointer events
  useEffect(() => {
    if (!rendererRef.current || !cameraRef.current) return;
    const canvas = rendererRef.current.domElement;

    const onPointerDown = (e:PointerEvent) => {
      if (!pgmData || !sceneRef.current || !canvasRef.current || !cameraRef.current) return;

      const canvas = canvasRef.current;
      const camera = cameraRef.current;
      const mesh = layers[0]?.mesh;
      if (!mesh) return;

      // 获取鼠标在 canvas 中的位置
      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      // 执行射线检测
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // 与 z=0 平面相交（假设 PGMap 在 z=0）
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersection = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(plane, intersection)) return;

      // 转换到纹理坐标
      const worldToLocal = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
      const localPoint = intersection.clone().applyMatrix4(worldToLocal);
      const { x: pixelX, y: pixelY } = uvToTextureCoords(localPoint, mesh, pgmData);

      // 最终得到地图中的 world 坐标
      const { origin, resolution } = mapConfig;
      // @ts-ignore
      const worldX = origin[0] + (pixelX + 0.5) * resolution;
      // @ts-ignore
      const worldY = origin[1] + (pgmData.height - pixelY - 0.5) * resolution;

      // ✅ 判断是否是右键
      if (e.button === 2) {
        const threshold = 1; // 距离阈值（单位：像素）
        const clickedPointId = pointsRef.current.find((p) => {
          const dx = p.worldX - worldX;
          const dy = p.worldY - worldY;
          const result = Math.sqrt(dx * dx + dy * dy);
          console.log("p.worldX:", p.worldX, "p.worldY:", p.worldY, "worldX:", worldX, "worldY:", worldY, "result:", result);
          return result < threshold;
        });
        console.log(pointsRef.current)
        console.log("点击点的像素坐标:", pixelX, pixelY)
        console.log("点击的点坐标:", worldX, worldY)
        console.log("点击的点 ID:", clickedPointId)

        if (clickedPointId !== undefined) {

          // setPoints(prev => prev.filter(p => p.id !== clickedPointId?.id));
          handleDeletePoint(clickedPointId.id);
        }
        return;
      }


      if (e.button === 0) {
        // left click: check hit
        const ray = new THREE.Raycaster();
        const mouse = new THREE.Vector2(
          (e.offsetX / canvas.clientWidth) * 2 - 1,
          -(e.offsetY / canvas.clientHeight) * 2 + 1
        );
        ray.setFromCamera(mouse, cameraRef.current);
        const intersects = ray.intersectObjects(Object.values(markersRef.current), true);
        if (intersects.length) {
          // @ts-ignore
          const group = intersects[0].object.parent;
          // @ts-ignore
          const id = group.children[0].userData.id;
          setDraggingId(id);
          // compute offset
          // @ts-ignore
          const hitPoint = intersects[0].point;
          // @ts-ignore
          const markerPos = group.position;
          dragOffset.current = { x: markerPos.x - hitPoint.x, y: markerPos.y - hitPoint.y };
        }
      }
    };
    const onPointerUp = () => setDraggingId(null);
    // @ts-ignore
    const onContextMenu = (e) => {
      e.preventDefault();
      const ray = new THREE.Raycaster();
      const mouse = new THREE.Vector2(
        (e.offsetX / canvas.clientWidth) * 2 - 1,
        -(e.offsetY / canvas.clientHeight) * 2 + 1
      );
      // @ts-ignore
      ray.setFromCamera(mouse, cameraRef.current);
      const intersects = ray.intersectObjects(Object.values(markersRef.current), true);
      if (intersects.length) {
        // @ts-ignore
        const group = intersects[0].object.parent;
        // @ts-ignore
        const id = group.children[0].userData.id;
        // remove
        setPoints(prev => prev.filter(p => p.id !== id).map((p, idx) => ({ id: idx+1, x: p.x, y: p.y,  worldX: p.worldX, worldY: p.worldY ,name: p.name, visible: p.visible})));
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown, { capture: true });
    // canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      // canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  },  [canvasRef.current, cameraRef.current, draggingId, mapConfig]);

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

    const layer = layers.find(l => l.id === selectedLayerId)!;
    // if (!layer || layer.id === 'base') {
    //   console.warn('不能在基础层上绘制');
    //   return;
    // }
    const mesh = layer.mesh;
    const tex = layer.texture;

    const canvas = rendererRef.current!.domElement;
    const camera = cameraRef.current!;

    // 1. 获取设备像素坐标
    const { x: canvasX, y: canvasY } = getCanvasMousePosition(e, canvas);

    // 2. 标准化设备坐标 [-1,1]
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
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

        const distance = Math.sqrt(dx*dx + dy*dy);

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
      tex.image.height
    );
    tex.needsUpdate = true;

    // 9. 更新笔刷预览位置
    if (brushPreviewRef.current) {
      brushPreviewRef.current.position.copy(intersectPoint);
      updateBrushPreviewScale(camera, pgmData);
    }

    console.log("Canvas Size:", canvas.width, canvas.height);
    console.log("Camera View:", camera.left, camera.right, camera.top, camera.bottom);
    console.log("Canvas Coords:", canvasX, canvasY);
    console.log("Texture Coord:", textureX, textureY);
    console.log("Camera Parameters:", {
      left: camera.left,
      right: camera.right,
      top: camera.top,
      bottom: camera.bottom,
    });
    // @ts-ignore
    console.log("Mesh Geometry:", {
      // @ts-ignore
      width: mesh.geometry.parameters.width,
      // @ts-ignore
      height: mesh.geometry.parameters.height,
    });


  };
  // 添加鼠标移动事件处理
  useEffect(() => {
    if (brushPreviewRef.current) {
      brushPreviewRef.current.visible = drawing || isHoveringCanvas;
    }
  }, [drawing, isHoveringCanvas]);

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
    if (!pgmData || !sceneRef.current || layers.length === 0) return;

    const mergedData = new Uint8Array(pgmData.data);
    const sortedLayers = [...layers].sort((a, b) => a.mesh.renderOrder - b.mesh.renderOrder);

    sortedLayers.forEach(layer => {
      if (!layer.visible) return;

      const textureData = new Uint8Array(layer.texture.image.data.buffer);

      for (let i = 0; i < textureData.length; i += 4) {
        // @ts-ignore
        if (textureData[i + 3] < 1) continue;

        const x = (i / 4) % pgmData.width;
        const y = Math.floor((i / 4) / pgmData.width);
        const pgmIndex = (pgmData.height - 1 - y) * pgmData.width + x;

        // @ts-ignore
        const gray = Math.round((textureData[i] / 255) * pgmData.maxVal);
        mergedData[pgmIndex] = gray;
      }
    });

    const updatedPGM: PGMImage = {
      ...pgmData,
      data: mergedData
    };

    // 将 PGM 转为字符串并 Blob
    const pgmString = createPGMFromData(updatedPGM);
    const blob = new Blob([pgmString], { type: "application/octet-stream" });

    const mapName = selectedMap;

    try {
      const response = await fetch(`http://${ipAddr}/mapServer/save/maskMap?mapName=${encodeURIComponent(mapName)}`, {
        method: "POST",
        headers: {
          // 不设置 Content-Type，让浏览器自动处理边界
        },
        body: blob
      });

      if (!response.ok) {
        throw new Error(`上传失败: ${response.status} ${response.statusText}`);
      }

      console.log("PGM上传成功");
    } catch (error) {
      console.error("上传PGM失败:", error);
    }
  };

  // PointsDrawer相关处理函数
  const handlePointSelect = useCallback((id: number) => {
    setSelectedPointId(id);
  }, []);

  const handlePointVisibilityChange = useCallback((id: number) => {
    setPoints(prev => prev.map(point =>
      point.id === id
        ? { ...point, visible: point.visible === false ? true : false }
        : point
    ));
  }, []);

  const handlePointNameChange = useCallback((id: number, newName: string) => {
    setPoints(prev => prev.map(point =>
      point.id === id
        ? { ...point, name: newName }
        : point
    ));
  }, []);

  const handleAddPointFromDrawer = useCallback(() => {
    // 这里可以添加一个默认点或者提示用户在地图上点击
    const newId = points.length > 0 ? Math.max(...points.map(p => p.id)) + 1 : 1;
    const newPoint = {
      id: newId,
      name: `新点位${newId}`,
      x: 0,
      y: 0,
      worldX: 0,
      worldY: 0,
      visible: true
    };
    setPoints(prev => [...prev, newPoint]);
  }, [points]);

  const handleRefreshPoints = useCallback(() => {
    downloadPoints();
  }, []);

  return (
    <div
      // @ts-ignore
      ref={containerRef}
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
      />
      <div>
        <label htmlFor="map-select">选择地图：</label>
        <select
          id="map-select"
          value={selectedMap}
          onChange={(e) => setSelectedMap(e.target.value)}
        >
          <option value="">请选择</option>
          {mapList.map((map) => (
            <option key={map} value={map}>
              {map}
            </option>
          ))}
        </select>
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
          //@ts-ignore
          ref={canvasRef}
          onMouseDown={(e) => {
            // 只处理左键点击（button === 0），并且当前是 drawPoint 模式
            if (e.button === 0 ) startDraw(e);
          }}
          onMouseMove={(e) => {
            // 只有在鼠标按下，并且正在绘制状态才触发
            if (isMouseDown && drawing) draw(e);
          }}
          onContextMenu={(e) => {
            e.preventDefault(); // 阻止右键菜单
            // 右键删除逻辑交给 pointer 事件处理
          }}
          onMouseEnter={() => {
            setIsHoveringCanvas(true);
          }}
          onMouseLeave={() => {
            setIsHoveringCanvas(false);
          }}
          onMouseUp={endDraw}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain", // 保持宽高比
            cursor: drawing ? "crosshair" : "default",
          }}
        />
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
      </div>
    </div>

  );
};

export default PGMCanvasEditor;
