import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "three/examples/jsm/libs/stats.module";

import { DrawingToolbar } from "@lichtblick/suite-base/panels/SlamMapEdit/PGMCanvasEditor/components/DrawingToolbar";
import {
  Layer,
  LayerDrawer,
} from "@lichtblick/suite-base/panels/SlamMapEdit/PGMCanvasEditor/components/LayerDrawer";
import { texture } from "three/examples/jsm/nodes/shadernode/ShaderNodeBaseElements";
import * as yaml from 'js-yaml';
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
// PGM 解析函数
export function parsePGM(data: string): PGMImage | undefined {
  try {
    const lines = data.split(/\r?\n/).filter((line) => line.trim() !== "" && !line.startsWith("#"));
    if (lines[0] !== "P2") {
      return undefined;
    }

    // 使用更高效的方式解析头部信息
    const dimensions = lines[1].split(/\s+/).map(Number);
    if (dimensions.length !== 2) {
      return undefined;
    }

    const [width, height] = dimensions;
    const maxVal = parseInt(lines[2], 10);

    if (isNaN(width) || isNaN(height) || isNaN(maxVal)) {
      return undefined;
    }

    // 一次性处理像素数据
    const pixelData = new Uint8Array(width * height);
    let pixelIndex = 0;

    // 从第4行开始处理像素数据
    for (let i = 3; i < lines.length && pixelIndex < width * height; i++) {
      const values = lines[i]
        .trim()
        .split(/\s+/)
        .map((v) => parseInt(v, 10));
      for (const val of values) {
        if (pixelIndex >= width * height) {
          break;
        }
        pixelData[pixelIndex++] = val;
      }
    }

    if (pixelIndex !== width * height) {
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
  for (let i = 0; i < data.length; i++) {
    body += data[i] + (i % width === width - 1 ? "\n" : " ");
  }
  return header + body;
}

const PGMCanvasEditor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement | undefined>(undefined);
  const thumbnailCanvasRef = useRef<HTMLCanvasElement | undefined>(undefined);
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
  const [points, setPoints] = useState<Array<{x: number, y: number}>>([]);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const [pgmFile, setPgmFile] = useState<File | undefined>(undefined);
  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);

  const [brushColor, setBrushColor] = useState<number>(0);
  const [brushSize, setBrushSize] = useState(5);

  // 在现有 state 中新增：
  const [mapConfig, setMapConfig] = useState<ROSMapConfig>({
    image: '',
    resolution: 0.05,
    origin: [0, 0, 0],
    negate: 0,
    occupied_thresh: 0.65,
    free_thresh: 0.25
  });
  // 统一文件处理状态
  const [configFile, setConfigFile] = useState<File | undefined>(undefined);
  // 5. 添加 YAML 处理函数
  // YAML文件处理函数（与PGM处理类似）
  const handleYamlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setConfigFile(file);
  };

  // 独立YAML解析逻辑
  const parseYAMLConfig = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const config = yaml.load(text) as ROSMapConfig;

      // 验证必要字段
      if (!config.image || !config.resolution) {
        throw new Error("Missing required fields in YAML");
      }

      // 类型转换和默认值处理
      const processedConfig: ROSMapConfig = {
        image: config.image,
        resolution: Number(config.resolution),
        origin: config.origin?.map(Number) || [0, 0, 0],
        negate: config.negate ? 1 : 0,
        occupied_thresh: Number(config.occupied_thresh || 0.65),
        free_thresh: Number(config.free_thresh || 0.25)
      };

      setMapConfig(processedConfig);

      return processedConfig;
    } catch (error) {
      console.error("YAML解析失败:", error);
      alert("YAML文件格式错误，请检查配置");
      return null;
    }
  }, []);

  // 添加导出点位函数
  const exportPoints = useCallback(() => {
    if (!mapConfig || points.length === 0) return;

    // 转换坐标为字符串
    const csvContent = "x,y\n" +
      points.map(p => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "map_points.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [points, mapConfig]);

  // 修改处理配置文件的useEffect
  useEffect(() => {
    if (!configFile) return;

    const processConfig = async () => {
      const config = await parseYAMLConfig(configFile);
      if (!config) return;

      // 提取纯文件名（去除路径）
      const targetFilename = config.image.split('/').pop()?.split('\\').pop();

      // 提示用户上传对应的PGM文件
      const uploadConfirmed = window.confirm(
        `YAML配置中指定的地图文件为：${config.image}\n请选择对应的PGM文件（文件名需为：${targetFilename}）`
      );

      if (uploadConfirmed && targetFilename) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pgm';

        input.onchange = (e: Event) => {
          const selectedFile = (e.target as HTMLInputElement).files?.[0];
          if (!selectedFile) return;

          // 验证文件名匹配（不区分大小写）
          const selectedFilename = selectedFile.name;
          const isValidFile = selectedFilename.localeCompare(targetFilename, undefined, { sensitivity: 'accent' }) === 0;

          if (isValidFile) {
            setPgmFile(selectedFile);
          } else {
            alert(`文件名称不匹配！\n预期文件：${targetFilename}\n当前选择：${selectedFilename}`);
          }
        };

        input.click();
      }
    };

    processConfig();
  }, [configFile, parseYAMLConfig]);

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
      const rgbaData = new Uint8Array(base.texture.image.data.length);
      rgbaData.set(base.texture.image.data); // 拷贝原始数据
      rgbaData.fill(0, 3, -1, 4); // 将alpha通道设为0（完全透明）

      const newTex = new THREE.DataTexture(
        rgbaData,
        base.texture.image.width,
        base.texture.image.height,
        THREE.RGBAFormat,
        THREE.UnsignedByteType
      );
      newTex.flipY = false;
      newTex.needsUpdate = true;

      // 修改材质设置
      const mat = new THREE.MeshBasicMaterial({
        map: newTex,
        transparent: true,
        opacity: 1, // 必须保持1以保证颜色不衰减
        // premultipliedAlpha: false, // 禁用预乘alpha
        depthWrite: false,
        blending: THREE.NormalBlending, // 使用标准混合模式
        side: THREE.DoubleSide
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
    const pixelRatio = window.devicePixelRatio || 1;

    // 设备像素坐标
    // const x = (e.clientX - rect.left) * pixelRatio;
    // const y = (e.clientY - rect.top) * pixelRatio;
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);

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

    let textureX, textureY;
    if (meshAspect > imageAspect) {
      // 网格更宽：以高度为基准
      const effectiveWidth = imageAspect * meshHeight;
      const offset = (meshWidth - effectiveWidth) / 2;
      textureX = Math.floor(
        ((localPoint.x + meshWidth / 2 - offset) / effectiveWidth) * pgmData.width,
      );
    } else {
      // 网格更高：以宽度为基准
      const effectiveHeight = meshWidth / imageAspect;
      const offset = (meshHeight - effectiveHeight) / 2;
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
  // 修改原始PGM上传处理（保持独立上传通道）
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 独立上传时不强制名称验证
    if (mapConfig.image && file.name !== mapConfig.image) {
      const override = window.confirm(
        `当前文件名为：${file.name}\n与配置中的地图文件（${mapConfig.image}）不一致\n是否继续加载？`
      );
      if (!override) return;
    }

    // 原有验证逻辑
    if (file.size > 50 * 1024 * 1024) {
      alert("文件太大，请选择更小的文件");
      return;
    }
    setPgmFile(file);
    setPoints([]);
  };

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

  // 文件绘制监听
  useEffect(() => {
    // 清理
    if (canvasRef.current && pgmFile) {
      if (rendererRef.current && canvasRef.current.contains(rendererRef.current.domElement)) {
        //canvasRef.current.removeChild(rendererRef.current.domElement);
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
    if (!pgmFile) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const pgm = parsePGM(result);
      if (pgm) {
        setPGMData(pgm);
        drawThumbnail(pgm);
      }
    };
    reader.readAsText(pgmFile);
  }, [pgmFile]);

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

  // 添加图层选择状态指示
  const getActiveLayer = () => {
    return layers.find(l => l.id === selectedLayerId);
  };
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

  // 新增处理坐标转换的函数
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
    const worldX = origin[0] + (pixelX + 0.5) * resolution;
    const worldY = origin[1] + (pgmData.height - pixelY - 0.5) * resolution;
    console.log("添加点 原始像素坐标:", pixelX, pixelY);
    console.log("添加点 实际坐标:", worldX, worldY);

    // 添加点到状态
    setPoints(prev => [...prev, { x: worldX, y: worldY }]);

    // 在场景中添加可视化标记
    const markerGeometry = new THREE.SphereGeometry(0.005);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      // 添加半透明效果
      transparent: true,
      opacity: 0.8
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(intersection.x, intersection.y, 0.5);
    sceneRef.current.add(marker);
  };

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
    console.log("Mesh Geometry:", {
      width: mesh.geometry.parameters.width,
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

  // 缩略图绘制
  const drawThumbnail = (pgm: PGMImage) => {
    if (!thumbnailCanvasRef.current) {
      return;
    }

    const thumbWidth = 200;
    const thumbHeight = 150;
    const canvas = thumbnailCanvasRef.current;
    canvas.width = thumbWidth;
    canvas.height = thumbHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const imageData = ctx.createImageData(thumbWidth, thumbHeight);

    const scaleX = pgm.width / thumbWidth;
    const scaleY = pgm.height / thumbHeight;

    for (let y = 0; y < thumbHeight; y++) {
      for (let x = 0; x < thumbWidth; x++) {
        const srcX = Math.floor(x * scaleX);
        const srcY = Math.floor(y * scaleY);
        const index = srcY * pgm.width + srcX;
        const gray = (pgm.data[index] / pgm.maxVal) * 255;
        const destIndex = (y * thumbWidth + x) * 4;
        imageData.data[destIndex] = gray;
        imageData.data[destIndex + 1] = gray;
        imageData.data[destIndex + 2] = gray;
        imageData.data[destIndex + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  // const changePenColor = () => {
  //   if (brushColor === 0) {
  //     setBrushColor(255);
  //   } else if  (brushColor === 255){
  //     setBrushColor(128);
  //   }else {
  //     setBrushColor(0);
  //   }
  //
  // };


  // 缩略图点击跳转
  const jumpToThumbnailPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const camera = cameraRef.current;
    if (!thumbnailCanvasRef.current || !pgmData) {
      return;
    }

    const rect = thumbnailCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const thumbWidth = 200;
    const thumbHeight = 150;

    const ratioX = x / thumbWidth;
    const ratioY = y / thumbHeight;

    const px = ratioX * pgmData.width;
    const py = ratioY * pgmData.height;

    const left = -1 + (px / pgmData.width) * 2;
    const top = 1 - (py / pgmData.height) * 2;

    if (camera) {
      camera.position.x = left;
      camera.position.y = top;
      camera.lookAt(0, 0, 0);
    }
  };

  // 在ThreeJS场景渲染循环中添加点标记（可选）
  useEffect(() => {
    if (!sceneRef.current) return;

    // 清除旧标记
    sceneRef.current.children.forEach(child => {
      if (child.userData?.isPointMarker) {
        sceneRef.current?.remove(child);
      }
    });

    // 添加新标记
    points.forEach(point => {
      const markerGeometry = new THREE.SphereGeometry(0.05);
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(
        (point.x - mapConfig.origin[0]) / mapConfig.resolution * 0.05,
        (point.y - mapConfig.origin[1]) / mapConfig.resolution * 0.05,
        0.5
      );
      marker.userData.isPointMarker = true;
      sceneRef.current?.add(marker);
    });
  }, [points, mapConfig]);

  const savePGM = () => {
    if (!pgmData || !sceneRef.current || layers.length === 0) return;

    // 初始化合并数据（保留原始PGM数据）
    const mergedData = new Uint8Array(pgmData.data);

    // 按渲染顺序处理图层（从底层到顶层）
    const sortedLayers = [...layers].sort((a, b) => a.mesh.renderOrder - b.mesh.renderOrder);

    sortedLayers.forEach(layer => {
      if (!layer.visible) return;

      const textureData = new Uint8Array(layer.texture.image.data.buffer);

      for (let i = 0; i < textureData.length; i += 4) {
        // 跳过完全透明的像素
        if (textureData[i + 3] < 1) continue;

        // 获取原始坐标
        const x = (i / 4) % pgmData.width;
        const y = Math.floor((i / 4) / pgmData.width);

        // 转换为PGM坐标系（Y轴翻转）
        const pgmIndex = (pgmData.height - 1 - y) * pgmData.width + x;

        // 将RGBA转换为灰度值（考虑原始maxVal）
        const gray = Math.round(
          (textureData[i] / 255) * pgmData.maxVal // R通道作为灰度值
        );

        // 直接覆盖（上层优先）
        mergedData[pgmIndex] = gray;
      }
    });

    // 生成最终PGM文件
    const updatedPGM: PGMImage = {
      ...pgmData,
      data: mergedData
    };

    // 创建下载
    const pgmString = createPGMFromData(updatedPGM);
    const blob = new Blob([pgmString], { type: "image/x-portable-graymap" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "edited.pgm";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div
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
        handleFileUpload={handleFileUpload}
        brushColor={brushColor}
        onLayerDrawerToggle={() => {
          setIsLayerDrawerOpen(!isLayerDrawerOpen);
        }}
        isLayerPanelOpen={isLayerDrawerOpen}
        brushSize={brushSize}
        onBrushSizeChange={handleBrushSizeChange}
        handleYamlUpload={handleYamlUpload}
      />

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
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
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
      </div>
    </div>
  );
};

export default PGMCanvasEditor;



