// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0




/* eslint-disable @typescript-eslint/no-explicit-any */
// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import * as THREE from "three";

// RFID 交互管理类

export type RfidObject = {
  init?: {
    rfidScale?: number;
  };
  canvas: {
    width: number;
    height: number;
    objects: RfidObject[];
  };
  type: string;
  left: number;
  top: number;
  name: string;
  stroke?: string;
  data: {
    id: number;

    [key: string]: any;
  };
  objects: RfidObject[];
};

export class RFIDInteractionManager {
  #scene: THREE.Scene;
  #raycaster: THREE.Raycaster;
  #mouse: THREE.Vector2;
  #rfidPoints: Map<number, THREE.Mesh>; // 存储 RFID ID 和对应的 Mesh
  #pathGroups: Map<number, THREE.Group>; // 存储路径组
  #defaultColor: string;
  #deafultPathColor: string;
  #selectedRfidId: number | undefined;
  #currentPositionMarker: THREE.Group | undefined = undefined;
  #currentPositionRfidId: number | undefined = undefined;
  #lastPathIds: number[] = [];

  public constructor(
    scene: THREE.Scene,
    defaultColor: string = "#ffffff",
    deafultPathColor: string = "#000000",
  ) {
    this.#scene = scene;
    this.#raycaster = new THREE.Raycaster();
    this.#mouse = new THREE.Vector2();
    this.#rfidPoints = new Map();
    this.#defaultColor = defaultColor;
    this.#selectedRfidId = undefined;
    this.#pathGroups = new Map();
    this.#deafultPathColor = deafultPathColor;
  }

  // 注册 RFID 点
  public registerRfidPoint(rfidId: number, rfidMesh: THREE.Mesh): void {
    this.#rfidPoints.set(rfidId, rfidMesh);
  }
  // 注册路径组
  public registerPath(pathId: number, pathGroup: THREE.Group): void {
    this.#pathGroups.set(pathId, pathGroup);
  }

  // 高亮显示路径
  public highlightPath(pathId: number, color: string = "#FF0000"): void {
    const pathGroup = this.#pathGroups.get(pathId);
    if (!pathGroup) {
      return;
    }

    // 遍历路径组中的所有对象
    pathGroup.traverse((object) => {
      if (object instanceof THREE.Line || object instanceof THREE.Mesh) {
        if (
          object.material instanceof THREE.LineBasicMaterial ||
          object.material instanceof THREE.MeshBasicMaterial
        ) {
          object.material.color.set(color);
        }
      }
    });
  }

  public resetPathColor(): void {
    // console.log("resetPathColor");
    // console.log("this.#lastPathIds", this.#lastPathIds);
    this.#lastPathIds.forEach((pathId) => {
      this.highlightPath(pathId, this.#deafultPathColor);
    });
    this.#lastPathIds = [];
  }

  // 高亮一组 RFID 和它们之间的路径
  public highlightRoute(
    rfidSequence: number[],
    pathColor: string = "#FF0000",
    rfidColor: string = "#FFC5C5",
  ): void {
    // 重置之前的高亮状态
    this.resetAllColors();

    // 重置之前高亮的路径
    this.resetPathColor();

    // 高亮 RFID 点
    rfidSequence.forEach((rfidId) => {
      this.changeRfidColor(rfidId, rfidColor);
    });

    // 找到并高亮相连的路径
    this.#pathGroups.forEach((pathGroup, pathId) => {
      const { startRfid, endRfid } = pathGroup.userData;

      // 检查这条路径是否连接序列中相邻的两个 RFID
      for (let i = 0; i < rfidSequence.length - 1; i++) {
        if (
          (startRfid === rfidSequence[i] && endRfid === rfidSequence[i + 1]) ||
          (endRfid === rfidSequence[i] && startRfid === rfidSequence[i + 1])
        ) {
          this.#lastPathIds.push(pathId);
          this.highlightPath(pathId, pathColor);
          break;
        }
      }
    });
  }

  // 改变 RFID 颜色的方法
  public changeRfidColor(rfidId: number, color: string = "#FFFF00"): void {
    // 首先重置之前选中的 RFID 颜色

    // 设置新选中的 RFID 颜色
    const rfidMesh = this.#rfidPoints.get(rfidId);
    if (rfidMesh && rfidMesh.material instanceof THREE.MeshBasicMaterial) {
      rfidMesh.material.color.set(color);
      this.#selectedRfidId = rfidId;
    }
  }

  public resetRfidColor(rfidId: number): void {
    const previousRfid = this.#rfidPoints.get(rfidId);
    if (previousRfid && previousRfid.material instanceof THREE.MeshBasicMaterial) {
      previousRfid.material.color.set(this.#defaultColor);
    }
  }

  // 处理点击事件
  public handleClick(event: MouseEvent, camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
    const rect = renderer.domElement.getBoundingClientRect();
    this.#mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.#mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.#raycaster.setFromCamera(this.#mouse, camera);
    const intersects = this.#raycaster.intersectObjects(this.#scene.children, true);

    for (const intersect of intersects) {
      let parent = intersect.object.parent;
      while (parent) {
        if (parent.userData.type === "rfid") {
          // 调用颜色改变方法
          if (typeof parent.userData.id === "number") {
            this.changeRfidColor(parent.userData.id);
          }
          return;
        }
        parent = parent.parent;
      }
    }
  }
  // 设置当前位置
  public setCurrentPosition(rfidId: number): void {
    // console.log("setCurrentPosition", rfidId);
    // console.log("this.#select", this.#selectedRfidId);
    // 如果之前的标记存在，先移除
    if (this.#currentPositionMarker) {
      this.#scene.remove(this.#currentPositionMarker);
      this.#currentPositionMarker = undefined;
    }

    // 如果已经到终点 ，清除路径
    if (rfidId === this.#selectedRfidId) {
      // console.log("到达终点");
      this.resetAllColors();
      this.resetPathColor();
    }

    // 获取目标 RFID 的位置
    const rfidMesh = this.#rfidPoints.get(rfidId);
    if (!rfidMesh) {
      return;
    }

    // 创建新的位置标记
    const markerSize = 0.2; // 可以根据需要调整大小
    this.#currentPositionMarker = this.#createPositionMarker(markerSize);

    // 将标记放置在 RFID 位置
    const worldPosition = new THREE.Vector3();
    rfidMesh.getWorldPosition(worldPosition);

    this.#currentPositionMarker.position.x = worldPosition.x;

    this.#currentPositionMarker.position.y = worldPosition.y;

    // 添加到场景

    this.#scene.add(this.#currentPositionMarker);

    this.#currentPositionRfidId = rfidId;
  }

  // 移除当前位置标记
  public removeCurrentPosition(): void {
    if (this.#currentPositionMarker) {
      this.#scene.remove(this.#currentPositionMarker);
      this.#currentPositionMarker = undefined;
      this.#currentPositionRfidId = undefined;
    }
  }
  // 可以添加一个动画效果
  public animateCurrentPosition(): void {
    if (!this.#currentPositionMarker) {
      return;
    }

    const animate = () => {
      if (!this.#currentPositionMarker) {
        return;
      }

      // 添加呼吸效果
      const scale = 1 + Math.sin(Date.now() * 0.003) * 0.1;
      this.#currentPositionMarker.scale.set(scale, scale, 1);

      requestAnimationFrame(animate);
    };

    animate();
  }

  // 创建当前位置标记
  #createPositionMarker(size: number): THREE.Group {
    const group = new THREE.Group();

    // 创建蓝色圆片
    const circleGeometry = new THREE.CircleGeometry(size, 32);
    const circleMaterial = new THREE.MeshBasicMaterial({
      color: "#0066FF",
      // transparent: true,
      opacity: 0.8,
    });
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);

    // 创建文字精灵
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (context) {
      canvas.width = 64;
      canvas.height = 64;

      // 设置文字样式
      context.fillStyle = "#FFFFFF";
      context.font = "bold 40px Arial";
      context.textAlign = "center";
      context.textBaseline = "middle";

      // 绘制文字
      context.fillText("🚘", canvas.width / 2, canvas.height / 2);

      // 创建纹理
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
      });

      const textSprite = new THREE.Sprite(spriteMaterial);
      textSprite.scale.set(size * 4, size * 4, 1);
      textSprite.position.z = 0.01; // 略微在圆片上方
      group.add(textSprite);
    }

    group.add(circle);

    // 将整个组放在稍高的 z 位置，确保在 RFID 点上方
    group.position.z = 0.1;

    return group;
  }

  // 重置所有 RFID 颜色
  public resetAllColors(): void {
    this.#rfidPoints.forEach((rfidMesh) => {
      if (rfidMesh.material instanceof THREE.MeshBasicMaterial) {
        rfidMesh.material.color.set(this.#defaultColor);
      }
    });
    this.#selectedRfidId = undefined;
  }

  // 获取当前位置的 RFID ID
  public getCurrentPositionRfidId(): number | undefined {
    return this.#currentPositionRfidId;
  }

  // 获取当前选中的 RFID ID
  public getSelectedRfidId(): number | undefined {
    return this.#selectedRfidId;
  }
}
export const convertCoordinates = (
  canvasX: number, // 画布（像素）坐标X
  canvasY: number, // 画布（像素）坐标Y
  mapSize: { width: number; height: number }, // 地图的像素宽高
  worldWidth: number, // Three.js 平面宽度
): { x: number; y: number } => {
  // 1. 将画布坐标归一化到 0-1 范围
  // 例如：canvasX=50, mapSize.width=100，则 normalizedX=0.5
  const normalizedX = canvasX / mapSize.width;
  const normalizedY = canvasY / mapSize.height;

  // 2. 计算Three.js世界坐标系下的高度
  // 保证Three.js平面宽高比和图片一致
  // worldHeight = worldWidth * (图片高/图片宽)
  const worldHeight = worldWidth * (mapSize.height / mapSize.width);

  // 3. 归一化坐标映射到Three.js平面坐标
  // X轴：0~1 -> -worldWidth/2 ~ worldWidth/2（中心为0）
  const worldX = normalizedX * worldWidth - worldWidth / 2;
  // Y轴：0~1 -> worldHeight/2 ~ -worldHeight/2（中心为0，且Y轴方向翻转）
  // 这样图片左上角对应Three.js平面左上角，右下角对应右下角
  const worldY = -(normalizedY * worldHeight) + worldHeight / 2;

  // 返回Three.js世界坐标
  return { x: worldX, y: worldY };
};

// 在渲染 RFID 的函数中使用
export const parseAndRenderNavPoints = (
  jsonData: {
    mapName: string;
    points: Array<{
      x: number;
      y: number;
      id: number;
      name: string;
      orientation: { x: number; y: number; z: number; w: number };
    }>;
    edges: Array<{
      id: number;
      nodeStart: number;
      nodeEnd: number;
      weight: number;
      points: Array<{
        worldy: number | undefined;
        worldx: number | undefined;
        x: number;
        y: number;
      }>;
    }>;
  },
  scene: THREE.Scene,
  mapSize: { width: number; height: number },
  options: Partial<{
    origin: number[];
    resolution: number;
    pgmWidth: number;
    pgmHeight: number;
    mesh: THREE.Mesh | null;
  }> = {},
): RFIDInteractionManager | undefined => {
  // if (!jsonData.points || !jsonData.edges) {
  //   return;
  // }
  // console.log("options", options);
  // console.log("jsonData", jsonData);
  // console.log("mapSize", mapSize);

  const {
    origin = [0, 0],
    resolution = 1,
    pgmWidth = 0,
    pgmHeight = 0,
    mesh = null,
  } = options;
  // 创建交互管理器
  const interactionManager = new RFIDInteractionManager(scene, "#ffffff", "#000000");
  const rfidSize = 0.12; // 放大400%

  // 辅助函数：世界坐标转本地坐标
  function worldToLocal(worldX: number, worldY: number) {
    // 1. 世界坐标转像素坐标
    const pixelX = (worldX - (origin[0] ?? 0)) / resolution - 0.5;
    const pixelY = (worldY - (origin[1] ?? 0)) / resolution - 0.5;
    // 2. 归一化
    const uvX = pixelX / pgmWidth;
    const uvY = pixelY / pgmHeight;
    // 3. mesh映射
    if (mesh?.geometry.boundingBox) {
      const boundingBox = mesh.geometry.boundingBox;
      const size = new THREE.Vector3();
      boundingBox.getSize(size);
      const localX = uvX * size.x + boundingBox.min.x;
      const localY = (1 - uvY) * size.y + boundingBox.min.y;
      return { x: localX, y: localY };
    } else {
      // fallback: 映射到[-mapWidth/2, mapWidth/2]
      return {
        x: uvX * mapSize.width - mapSize.width / 2,
        y: uvY * mapSize.height - mapSize.height / 2,
      };
    }
  }

  // 渲染导航点
  jsonData.points.forEach((point) => {
    const { x, y } = worldToLocal(point.x, point.y);
    // 创建RFID点几何体
    const geometry = new THREE.CircleGeometry(rfidSize, 32);
    const material = new THREE.MeshBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const rfidPoint = new THREE.Mesh(geometry, material);
    rfidPoint.position.set(x, y, 0.01);

    // 创建边框
    const strokeGeometry = new THREE.CircleGeometry(rfidSize * 1.1, 32);
    const strokeMaterial = new THREE.MeshBasicMaterial({
      color: "#050215",
      transparent: false,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const strokeCircle = new THREE.Mesh(strokeGeometry, strokeMaterial);
    strokeCircle.position.set(x, y, 0.005);

    // 创建文字标签
    const createTextSprite = (text: string, color = "#003C80FF", fontSize = 12) => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        return undefined;
      }
      canvas.width = 256;
      canvas.height = 256;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.font = `${fontSize * 6 }px Arial`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = color;
      context.fillText(text, canvas.width / 2, canvas.height / 2);
      const texture = new THREE.Texture(canvas);
      texture.needsUpdate = true;
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(0.5 * 2, 0.5 * 2, 1);
      return sprite;
    };
    const textSprite = createTextSprite(point.id.toString(), "#003C80FF", 12);
    if (textSprite) {
      textSprite.position.x = x;
      textSprite.position.y = y + 0.001 * 2;
      textSprite.position.z = 0.011;
    }
    // 创建RFID组
    const rfidGroup = new THREE.Group();
    rfidGroup.add(rfidPoint);
    rfidGroup.add(strokeCircle);
    if (textSprite) {
      rfidGroup.add(textSprite);
    }
    rfidGroup.userData = {
      id: point.id,
      type: "rfid",
    };
    scene.add(rfidGroup);
    // 注册RFID点到交互管理器
    interactionManager.registerRfidPoint(point.id, rfidPoint);
  });

  // 渲染origin点（左下角）
  if (origin.length >= 2) {
    const oxVal = 0;
    const oyVal = 0;
    const { x: ox, y: oy } = worldToLocal(oxVal, oyVal);
    const originSize = rfidSize * 1.5;
    // 主圆
    const originGeometry = new THREE.CircleGeometry(originSize, 32);
    const originMaterial = new THREE.MeshBasicMaterial({
      color: "#ff6600",
      transparent: false,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const originCircle = new THREE.Mesh(originGeometry, originMaterial);
    originCircle.position.set(ox, oy, 0.02);
    // 描边
    const strokeGeometry = new THREE.CircleGeometry(originSize * 1.1, 32);
    const strokeMaterial = new THREE.MeshBasicMaterial({
      color: "#cc3300",
      transparent: false,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const strokeCircle = new THREE.Mesh(strokeGeometry, strokeMaterial);
    strokeCircle.position.set(ox, oy, 0.015);
    // 文字"O"
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `bold ${12 * 6}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#cc3300";
      ctx.shadowColor = "rgba(255,255,255,0.8)";
      ctx.shadowBlur = 8;
      ctx.fillText("O", canvas.width / 2, canvas.height / 2);
      const texture = new THREE.Texture(canvas);
      texture.needsUpdate = true;
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const textSprite = new THREE.Sprite(spriteMaterial);
      textSprite.scale.set(1.0, 1.0, 1); // 比普通点大
      textSprite.position.set(ox, oy + 0.001, 0.03);
      // 组合
      const group = new THREE.Group();
      group.add(originCircle);
      group.add(strokeCircle);
      group.add(textSprite);
      group.userData = { id: -1, type: "origin" };
      scene.add(group);
    }
  }

  // 渲染路径边
  jsonData.edges.forEach((edge) => {
    const group = new THREE.Group();
    // 创建路径线段
    const points: THREE.Vector3[] = [];
    if (edge.points.length > 0) {
      edge.points.forEach((pt) => {
        const {x, y } = worldToLocal(pt.worldx ?? 0, pt.worldy ?? 0)
        points.push(new THREE.Vector3(x, y, 0.05));
      });
    }
    // 样式区分
    const isBidirectional = (edge as any).lang === 1;
    const lineColor = isBidirectional ? 0x0066ff : 0x00ff00;
    const lineWidth = isBidirectional ? 3 : 2;
    // 创建线段几何体
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: lineColor,
      linewidth: lineWidth,
      opacity: 0.8,
      transparent: true,
    });
    const line = new THREE.Line(geometry, material);
    group.add(line);
    group.userData = {
      id: edge.id,
      type: "path",
      startRfid: edge.nodeStart,
      endRfid: edge.nodeEnd,
    };
    scene.add(group);
    interactionManager.registerPath(edge.id, group);
  });
  return interactionManager;
};

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): T & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeout != null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };

  debounced.cancel = () => {
    if (timeout != null) {
      clearTimeout(timeout);
    }
  };

  return debounced as T & { cancel: () => void };
}
