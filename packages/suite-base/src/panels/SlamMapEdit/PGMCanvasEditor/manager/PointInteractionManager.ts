// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import * as THREE from "three";
import sendNotification from "@lichtblick/suite-base/util/sendNotification";

// 点位数据结构
export interface Point {
  id: number;
  name: string;
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  visible: boolean;
}

// 线段数据结构
export interface Line {
  id: number;
  startPointId: number;
  endPointId: number;
  points: THREE.Vector3[]; // 折线的所有点
  visible: boolean;
}

// 地图配置接口
export interface MapConfig {
  image: string;
  resolution: number;
  origin: number[];
  negate: 0 | 1;
  occupied_thresh: number;
  free_thresh: number;
}

// PGM图像接口
export interface PGMImage {
  width: number;
  height: number;
  maxVal: number;
  data: Uint8Array;
}

export class PointInteractionManager {
  #scene: THREE.Scene;
  #raycaster: THREE.Raycaster;
  #mouse: THREE.Vector2;
  #pointMarkers: Map<number, THREE.Group>; // 存储点位ID和对应的标记组
  #defaultColor: string;
  #selectedPointId: number | undefined;
  #draggingId: number | null = null;
  #dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  #points: Point[] = [];
  #mapConfig: MapConfig;
  #pgmData: PGMImage;
  #ipAddr: string;
  #selectedMap: string;
  #layers: any[];

  // 线段相关属性
  #lines: Line[] = [];
  #lineMeshes: Map<number, THREE.Line> = new Map();
  #isCreatingLine: boolean = false;
  #currentLinePoints: THREE.Vector3[] = [];
  #currentLineStartPointId: number | null = null;
  #currentLineMesh: THREE.Line | null = null;
  #selectedPointForMenu: number | null = null;

  // 新增：记录上一次点击的位置
  #lastLinePoint: THREE.Vector3 | null = null;

  public constructor(
    scene: THREE.Scene,
    mapConfig: MapConfig,
    pgmData: PGMImage,
    ipAddr: string,
    selectedMap: string,
    layers: any[],
    defaultColor: string = "#ff0000",
  ) {
    this.#scene = scene;
    this.#raycaster = new THREE.Raycaster();
    this.#mouse = new THREE.Vector2();
    this.#pointMarkers = new Map();
    this.#defaultColor = defaultColor;
    this.#selectedPointId = undefined;
    this.#mapConfig = mapConfig;
    this.#pgmData = pgmData;
    this.#ipAddr = ipAddr;
    this.#selectedMap = selectedMap;
    this.#layers = layers;
  }

  // 注册点位标记
  public registerPointMarker(pointId: number, markerGroup: THREE.Group): void {
    this.#pointMarkers.set(pointId, markerGroup);
  }

  // 获取所有点位
  public getPoints(): Point[] {
    return this.#points;
  }

  // 设置点位数据
  public setPoints(points: Point[]): void {
    this.#points = points;
    this.renderPoints();
  }



  // 添加点位
  public addPoint(point: Point): void {
    this.#points.push(point);
    this.renderPoints();
    this.#draggingId = null; // 新增点位后清理拖动状态
  }

  // 删除点位
  public deletePoint(pointId: number): void {
    // 从场景中移除标记
    const marker = this.#pointMarkers.get(pointId);
    if (marker) {
      this.#scene.remove(marker);
      this.#pointMarkers.delete(pointId);
    }

    // 从点位列表中移除
    this.#points = this.#points.filter(p => p.id !== pointId);

    // 重新分配ID
    this.#points = this.#points.map((point, index) => ({
      ...point,
      id: index + 1
    }));

    // 重新渲染所有点位
    this.renderPoints();
  }

  // 更新点位
  public updatePoint(pointId: number, updates: Partial<Point>): void {
    this.#points = this.#points.map(point =>
      point.id === pointId ? { ...point, ...updates } : point
    );
    this.renderPoints();
  }

  // 选择点位
  public selectPoint(pointId: number): void {
    this.#selectedPointId = pointId;
  }

  // 获取选中的点位ID
  public getSelectedPointId(): number | undefined {
    return this.#selectedPointId;
  }

  // 获取线段列表
  public getLines(): Line[] {
    return this.#lines;

  }



  // 设置线段列表
  public setLines(lines: Line[]): void {
    // console.log("setLines 被调用，线段数量:", lines.length);
    // console.log("线段数据:", lines);
    // console.log("lines:", lines);
    // 清理现有的线段网格
    this.#lineMeshes.forEach(mesh => {
      this.#scene.remove(mesh);
    });
    this.#lineMeshes.clear();

    // 设置新的线段数据
    this.#lines = lines;

    // 渲染所有线段
    this.#lines.forEach(line => {
      if (line.visible !== false) {
        // console.log("创建线段网格，ID:", line.id, "点数:", line.points.length);
        // console.log("线段点坐标:", line.points.map(p => `(${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)})`));
        this.createLineMesh(line);
      }
    });
  }

  // 获取当前选中的点位（用于菜单）
  public getSelectedPointForMenu(): number | null {
    return this.#selectedPointForMenu;
  }

  // 设置选中的点位（用于菜单）
  public setSelectedPointForMenu(pointId: number | null): void {
    this.#selectedPointForMenu = pointId;
    this.renderPoints(); // 选中变化时刷新高亮
  }

  // 删除线段
  public deleteLine(lineId: number): void {
    const lineMesh = this.#lineMeshes.get(lineId);
    if (lineMesh) {
      this.#scene.remove(lineMesh);
      this.#lineMeshes.delete(lineId);
    }
    this.#lines = this.#lines.filter(line => line.id !== lineId);
  }

  // 开始创建线段
  public startCreatingLine(startPointId: number): void {
    this.#isCreatingLine = true;
    this.#currentLineStartPointId = startPointId;
    this.#currentLinePoints = [];
    const startPoint = this.#points.find(p => p.id === startPointId);
    if (startPoint) {
      const v = new THREE.Vector3(startPoint.x, startPoint.y, 0.5);
      this.#currentLinePoints.push(v);
      this.#lastLinePoint = v;
      this.updateCurrentLineMesh(); // 立即渲染起点（即使只有一个点）
    }
    sendNotification("开始创建折线，右键点击空白处或点位继续，点击点位完成", "", "user", "info");
  }

  // 添加线段中间点
  public addLinePoint(worldPosition: THREE.Vector3): void {
    if (!this.#isCreatingLine) return;

    this.#currentLinePoints.push(worldPosition.clone());
    this.updateCurrentLineMesh();
  }

  // 完成线段创建
  public finishCreatingLine(endPointId: number): void {
    if (!this.#isCreatingLine || !this.#currentLineStartPointId) return;
    // 不再push终点，因为已在handleRightClick中push
    const lineId = this.#lines.length > 0 ? Math.max(...this.#lines.map(l => l.id)) + 1 : 1;
    const newLine: Line = {
      id: lineId,
      startPointId: this.#currentLineStartPointId,
      endPointId: endPointId,
      points: [...this.#currentLinePoints],
      visible: true
    };
    console.log("newLine:", newLine);
    this.#lines.push(newLine);
    console.log("this.#lines:", this.#lines);
    this.createLineMesh(newLine);
    this.cancelCreatingLine();
  }

  // 取消线段创建
  public cancelCreatingLine(): void {
    this.#isCreatingLine = false;
    this.#currentLineStartPointId = null;
    this.#currentLinePoints = [];
    this.#lastLinePoint = null;
    if (this.#currentLineMesh) {
      this.#scene.remove(this.#currentLineMesh);
      this.#currentLineMesh = null;
    }
    sendNotification("线段创建已取消", "", "user", "info");
  }

  // 检查是否正在创建线段
  public isCreatingLine(): boolean {
    return this.#isCreatingLine;
  }

  // 更新当前线段网格 - 修改为显示连续的折线
  private updateCurrentLineMesh(): void {
    if (this.#currentLineMesh) {
      this.#scene.remove(this.#currentLineMesh);
    }

    if (this.#currentLinePoints.length >= 2) {
      const geometry = new THREE.BufferGeometry().setFromPoints(this.#currentLinePoints);
      const material = new THREE.LineBasicMaterial({
        color: 0xff0000,
        linewidth: 2,
        transparent: true,
        opacity: 0.8
      });
      this.#currentLineMesh = new THREE.Line(geometry, material);
      this.#scene.add(this.#currentLineMesh);
    }
  }

  // 创建线段网格
  private createLineMesh(line: Line): void {
    // console.log("createLineMesh 被调用，线段ID:", line.id);

    if (line.points.length === 0) {
      console.warn("Point点数为0，跳过创建");
      return;
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(line.points);
    const material = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      linewidth: 2,
      transparent: true,
      opacity: 0.8
    });
    const lineMesh = new THREE.Line(geometry, material);
    console.log("lineMesh:", lineMesh);
    this.#scene.add(lineMesh);
    this.#lineMeshes.set(line.id, lineMesh);
    // console.log("线段网格已添加到场景，ID:", line.id);
  }

  // 更新layers数组
  public updateLayers(layers: any[]): void {
    this.#layers = layers;
  }

  // 切换点位可见性
  public togglePointVisibility(pointId: number): void {
    this.#points = this.#points.map(point =>
      point.id === pointId ? { ...point, visible: !point.visible } : point
    );
    this.renderPoints();
  }

  // 渲染所有点位
  private renderPoints(): void {
    // 清理现有标记
    this.#pointMarkers.forEach(marker => {
      this.#scene.remove(marker);
    });
    this.#pointMarkers.clear();

    // 渲染可见的点位
    this.#points.forEach(point => {
      if (point.visible !== false) {
        const highlight = point.id === this.#selectedPointForMenu;
        const marker = this.createPointMarker(point, highlight);
        this.#scene.add(marker);
        this.#pointMarkers.set(point.id, marker);
      }
    });
  }
  // 创建点位标记
  private createPointMarker(point: Point, highlight: boolean = false): THREE.Group {
    const group = new THREE.Group();

    // 使用与NavSelect相同的样式参数，但调整大小以适应SlamMapEdit
    const baseSize = 0.12;
    const pointSize = baseSize * 0.2  ; // 稍微缩小一点以适应SlamMapEdit的比例

    // 创建主圆环（高亮则红色，否则白色）
    const markerGeometry = new THREE.CircleGeometry(pointSize, 32);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: highlight ? "#ff0000" : "#ffffff",
      transparent: false,
      opacity: 0.8,
    });
    const circle = new THREE.Mesh(markerGeometry, markerMaterial);
    circle.position.set(point.x, point.y, 0.01);
    circle.userData = { id: point.id, type: 'main' };

    // 创建描边圆环（深色边框）
    const strokeGeometry = new THREE.CircleGeometry(pointSize * 1.1, 32);
    const strokeMaterial = new THREE.MeshBasicMaterial({
      color: "#050215",
      transparent: false,
      opacity: 0.8,
    });
    const strokeCircle = new THREE.Mesh(strokeGeometry, strokeMaterial);
    strokeCircle.position.set(point.x, point.y, 0.005);
    strokeCircle.raycast = () => {}; // 彻底忽略
    strokeCircle.userData = { id: point.id, type: 'stroke' };

    // 创建文字精灵
    const textSprite = this.createTextSprite(point.id.toString(), "#003C80", 4);
    textSprite.position.x = point.x;
    textSprite.position.y = point.y + 0.001;
    textSprite.position.z = 0.5; // 确保文字在圆点上方
    textSprite.userData = { id: point.id, type: 'label' };
    textSprite.raycast = () => {};

    // 添加到组
    group.add(circle);
    group.add(strokeCircle);
    group.add(textSprite);
    group.userData = { id: point.id, type: 'group' };

    return group;
  }

  // 创建文字精灵
  private createTextSprite(text: string, color: string = "#003C80", fontSize: number = 13): THREE.Sprite {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法获取2D上下文");

    // 清空背景
    context.clearRect(0, 0, canvas.width, canvas.height);

    // 设置文字样式
    context.font = `bold ${fontSize * 6}px Arial`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = color;

    // 添加阴影增强可读性
    context.shadowColor = "rgba(255,255,255,0.8)";
    context.shadowBlur = 8;

    // 绘制文字
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    // 创建纹理
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    // 创建精灵材质
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });

    // 创建精灵
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.5, 0.5, 1);

    return sprite;
  }

  // 处理点击事件
  public handleClick(event: MouseEvent, camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
    const rect = renderer.domElement.getBoundingClientRect();
    this.#mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.#mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.#raycaster.setFromCamera(this.#mouse, camera);
    const intersects = this.#raycaster.intersectObjects(this.#scene.children, true);

    for (const intersect of intersects) {
      // 直接检查相交对象
      if (intersect.object.userData && typeof intersect.object.userData.id === "number") {
        this.selectPoint(intersect.object.userData.id);
        return;
      }

      // 也检查父对象（兼容性）
      let parent = intersect.object.parent;
      while (parent) {
        if (parent.userData && typeof parent.userData.id === "number") {
          this.selectPoint(parent.userData.id);
          return;
        }
        parent = parent.parent;
      }
    }
  }

  // 处理右键点击
  public handleRightClick(event: MouseEvent, camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
    console.log("PointInteractionManager handleRightClick 被调用");
    const rect = renderer.domElement.getBoundingClientRect();
    this.#mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.#mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.#raycaster.setFromCamera(this.#mouse, camera);
    const intersects = this.#raycaster.intersectObjects(this.#scene.children, true);
    // console.log("射线检测到的对象数量:", intersects.length);
    let block;
    block = true;
    for (const intersect of intersects) {
      // return;
      // console.warn("射线检测到的对象:", intersect.object.userData.type);
      if (
        intersect.object.userData &&
        typeof intersect.object.userData.id === "number" &&
        ["main"].includes(intersect.object.userData.type)
      ) {
        block = false;
        const pointId = intersect.object.userData.id;
        const point = this.#points.find(p => p.id === pointId);
        if (this.#isCreatingLine) {
          if (this.#lastLinePoint && point) {
            const v = new THREE.Vector3(point.x, point.y, 0.5);
            this.#currentLinePoints.push(v);
            this.updateCurrentLineMesh();
            this.finishCreatingLine(pointId);
          }
          return;
        }
        if (!this.#isCreatingLine) {
          // console.log("设置选中打开菜单的点位ID:", pointId);
          this.setSelectedPointForMenu(pointId);
        }
        return;
      }
    }
    if( this.#isCreatingLine && block){
      const intersection = new THREE.Vector3();
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      if (!this.#raycaster.ray.intersectPlane(plane, intersection)) return;
      const v = new THREE.Vector3(intersection.x, intersection.y, 0.5);
      this.#currentLinePoints.push(v);
      this.updateCurrentLineMesh();
    }
    return;
    // 空白处
    if (this.#isCreatingLine) {
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersection = new THREE.Vector3();
      if (this.#raycaster.ray.intersectPlane(plane, intersection)) {
        if (this.#lastLinePoint) {
          this.#currentLinePoints.push(intersection.clone());
          this.#lastLinePoint = intersection.clone();
          this.updateCurrentLineMesh();
          sendNotification("已添加折线点，继续右键点击空白处或点位", "", "user", "info");
        }
      }
    } else {
      this.setSelectedPointForMenu(null);
    }
  }

  // 处理拖拽开始
  public handleDragStart(event: MouseEvent, camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
    const rect = renderer.domElement.getBoundingClientRect();
    this.#mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.#mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.#raycaster.setFromCamera(this.#mouse, camera);
    const intersects = this.#raycaster.intersectObjects(this.#scene.children, true);

    for (const intersect of intersects) {
      // 直接检查相交对象
      if (intersect.object.userData && typeof intersect.object.userData.id === "number") {
        this.#draggingId = intersect.object.userData.id;
        const hitPoint = intersect.point;
        const markerPos = intersect.object.position;
        this.#dragOffset = { x: markerPos.x - hitPoint.x, y: markerPos.y - hitPoint.y };
        return;
      }

      // 也检查父对象（兼容性）
      let parent = intersect.object.parent;
      while (parent) {
        if (parent.userData && typeof parent.userData.id === "number") {
          this.#draggingId = parent.userData.id;
          const hitPoint = intersect.point;
          const markerPos = parent.position;
          this.#dragOffset = { x: markerPos.x - hitPoint.x, y: markerPos.y - hitPoint.y };
          return;
        }
        parent = parent.parent;
      }
    }
  }

  // 处理拖拽结束
  public handleDragEnd(): void {
    this.#draggingId = null;
  }

  // 处理拖拽移动
  public handleDragMove(event: MouseEvent, camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
    if (this.#draggingId === null) return;

    const rect = renderer.domElement.getBoundingClientRect();
    this.#mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.#mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.#raycaster.setFromCamera(this.#mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersection = new THREE.Vector3();

    if (this.#raycaster.ray.intersectPlane(plane, intersection)) {
      const marker = this.#pointMarkers.get(this.#draggingId);
      if (marker) {
        marker.position.x = intersection.x + this.#dragOffset.x;
        marker.position.y = intersection.y + this.#dragOffset.y;

        // 更新点位数据
        this.updatePoint(this.#draggingId, {
          x: marker.position.x,
          y: marker.position.y
        });
      }
    }
  }

  // 下载点位数据
  public async downloadPoints(): Promise<void> {
    if (!this.#selectedMap || !this.#pgmData || !this.#mapConfig) {
      sendNotification("下载失败：缺少必要的地图数据或配置", "", "user", "error");
      return;
    }
    console.log("this.#pgmData", this.#pgmData);
    console.log("this.#mapConfig", this.#mapConfig);

    try {
      const url = `http://${this.#ipAddr}/mapServer/download/navPoints?mapname=${this.#selectedMap}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP 错误: ${response.status}`);
      }

      const data = await response.json();
      const { origin, resolution } = this.#mapConfig;

      // 处理点位数据
      if (data.points && Array.isArray(data.points)) {
        const formattedPoints = data.points.map((point: any) => {
          if (!this.#pgmData.height || !this.#pgmData.width) {
            console.warn("PGM 高宽数据无效");
            return null;
          }

          // 计算出像素坐标
          const pixelX = (point.x - (origin[0] ?? 0)) / resolution - 0.5;
          const pixelY = this.#pgmData.height - (point.y - (origin[1] ?? 0)) / resolution - 0.5;

          // 归一化像素到 [0, 1]
          const uvX = pixelX / this.#pgmData.width;
          const uvY = pixelY / this.#pgmData.height;

          const mesh = this.#layers?.[0]?.mesh;
          if (!mesh) {
            console.warn("Mesh 不存在，无法反推坐标");
            return null;
          }

          const geometry = mesh.geometry;
          geometry.computeBoundingBox();
          const boundingBox = geometry.boundingBox;
          if (!boundingBox) {
            console.warn("无法计算边界框");
            return null;
          }
          const size = new THREE.Vector3();
          boundingBox.getSize(size);

          const localX = uvX * size.x + boundingBox.min.x;
          const localY = (1 - uvY) * size.y + boundingBox.min.y;

          return {
            id: point.id,
            name: point.name,
            x: localX,
            y: -localY,
            worldX: point.x,
            worldY: point.y,
            visible: true
          };
        }).filter(Boolean);

        this.setPoints(formattedPoints);
        // console.log(`点位下载成功！共下载 ${formattedPoints.length} 个点位`);
      }

      // 处理线段数据（必须在点位数据设置之后）
      if (data.edges && Array.isArray(data.edges)) {
        // console.log("原始线段数据:", data.edges);
        const formattedLines: Line[] = data.edges.map((edge: any) => {
          // 创建线段点数组
          const linePoints: THREE.Vector3[] = [];
          // 添加中间点（如果有的话）
          if (edge.points && Array.isArray(edge.points)) {
            // console.log(`处理线段 ${edge.id} 的中间点，数量:`, edge.points.length);
            edge.points.forEach((point: any) => {
              linePoints.push(new THREE.Vector3(point.x, point.y, 0.5));
            });
          } else {
            // console.log(`线段 ${edge.id} 没有中间点数据`);
          }

          const result = {
            id: edge.id,
            startPointId: edge.nodeStart,
            endPointId: edge.nodeEnd,
            points: linePoints,
            visible: true
          };

          this.#lines.push(result);
          this.createLineMesh(result);

          // console.log(`线段 ${edge.id} 处理完成，点数:`, linePoints.length);
          return result;
        }).filter(Boolean);
        this.setLines(formattedLines);
        // console.log(`线段下载成功！共下载 ${formattedLines.length} 条线段`);
      } else {
        console.log("没有线段数据或线段数据格式不正确");
      }

      const totalPoints = data.points?.length || 0;
      const totalEdges = data.edges?.length || 0;
      // sendNotification(`地图数据下载成功！共下载 ${totalPoints} 个点位，${totalEdges} 条线段`, "", "user", "info");
    } catch (error) {
      console.error('地图数据下载错误:', error);
      sendNotification(`地图数据下载失败：${error instanceof Error ? error.message : '未知错误'}`, "", "user", "error");
    }
  }

  // 导出线段数据
  public async exportEdges(): Promise<void> {
    if (!this.#mapConfig || !this.#lines || this.#lines.length === 0) {
      sendNotification("导出失败：没有可导出的线段数据", "", "user", "error");
      return;
    }
    const mapName = this.#selectedMap;
    const payload = {
      mapName,
      edges: this.#lines.map(line => {

        return ({
          id: line.id,
          nodeStart: line.startPointId,
          nodeEnd: line.endPointId,
          weight: 1.0, // 如有权重字段可替换
          lang: 0,     // 如有方向字段可替换
          points:  line.points.map(point=>{
            const mesh = this.#layers?.[0]?.mesh;
            if (!mesh) {
              console.warn("Mesh 不存在，无法反推坐标");
              return null;
            }
            const intersection = new THREE.Vector3(point.x, point.y, 0.5);
            // 转换到纹理坐标
            const worldToLocal = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
            const localPoint = intersection.clone().applyMatrix4(worldToLocal);

            const { x: pixelX, y: pixelY } = this.uvToTextureCoords(localPoint, mesh);

            const { worldX, worldY } = this.textureToWorldCoords(pixelX, pixelY);

            return ({
              x: point.x,
              y: point.y,
              worldx: worldX,
              worldy: worldY,
              z: point.z,
            })
          })
        })
      })
    };
    console.log("payload:", payload);
    try {
      const url = `http://${this.#ipAddr}/mapServer/save/edges`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`保存失败: ${response.status} ${response.statusText}`);
      }
      sendNotification(`线段导出成功！共导出 ${this.#lines.length} 条线段`, "", "user", "info");
    } catch (error) {
      console.error("保存线段失败:", error);
      sendNotification(`线段导出失败：${error instanceof Error ? error.message : '未知错误'}` , "", "user", "error");
    }
  }

  // 导出点位数据
  public async exportPoints(): Promise<void> {
    if (!this.#mapConfig || this.#points.length === 0) {
      sendNotification("导出失败：没有可导出的点位数据", "", "user", "error");
      return;
    }
    const mapName = this.#selectedMap;
    const payload = {
      mapName: mapName,
      points: this.#points.map(p => ({
        x: p.worldX,
        y: p.worldY,
        id: p.id,
        name: p.name,
      }))
    };
    try {
      const url = `http://${this.#ipAddr}/mapServer/save/points`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      console.log("payload:", payload);
      if (!response.ok) {
        throw new Error(`保存失败: ${response.status} ${response.statusText}`);
      }
      sendNotification(`点位导出成功！共导出 ${this.#points.length} 个点位`, "", "user", "info");
      // 点位导出成功后自动导出线段
      await this.exportEdges();
    } catch (error) {
      console.error("保存点位失败:", error);
      sendNotification(`点位导出失败：${error instanceof Error ? error.message : '未知错误'}` , "", "user", "error");
    }
  }

  /**
   * 纹理像素坐标转世界坐标
   */
  private textureToWorldCoords(pixelX: number, pixelY: number): { worldX: number; worldY: number } {
    const { origin, resolution } = this.#mapConfig;
    const worldX = (origin[0] ?? 0) + (pixelX + 0.5) * resolution;
    const worldY = (origin[1] ?? 0) + (this.#pgmData.height - pixelY - 0.5) * resolution;
    return { worldX, worldY };
  }

  /**
   * 世界坐标转纹理像素坐标
   */
  private worldToTextureCoords(worldX: number, worldY: number): { pixelX: number; pixelY: number } {
    const { origin, resolution } = this.#mapConfig;
    const pixelX = ((worldX - (origin[0] ?? 0)) / resolution) - 0.5;
    const pixelY = this.#pgmData.height - ((worldY - (origin[1] ?? 0)) / resolution) - 0.5;
    return { pixelX, pixelY };
  }

  public addPointFromClick(event: React.MouseEvent<HTMLCanvasElement>, camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    if (!this.#pgmData || !this.#layers || this.#layers.length === 0 || !this.#layers[0]?.mesh) {
      console.warn("无法添加点位：缺少必要的数据或图层");
      return;
    }

    const mesh = this.#layers[0].mesh;

    // 获取鼠标位置
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
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
    const { x: pixelX, y: pixelY } = this.uvToTextureCoords(localPoint, mesh);

    // 使用新方法转换为实际坐标（使用YAML参数）
    const { worldX, worldY } = this.textureToWorldCoords(pixelX, pixelY);

    // 添加点到状态
    const newId = this.#points.length > 0 ? Math.max(...this.#points.map(p => p.id)) + 1 : 1;
    const newPoint: Point = {
      id: newId,
      x: intersection.x,
      y: intersection.y,
      worldX: worldX,
      worldY: worldY,
      name: `点${newId}`,
      visible: true
    };
    console.log("newPoint:", newPoint);
    this.addPoint(newPoint);
  }

  // 坐标转换辅助函数
  private uvToTextureCoords(localPoint: THREE.Vector3, mesh: THREE.Mesh): { x: number; y: number } {
    const geometry = mesh.geometry as THREE.PlaneGeometry;
    const meshWidth = geometry.parameters?.width ?? 1;
    const meshHeight = geometry.parameters?.height ?? 1;

    // 将局部坐标归一化到[0,1]
    const u = (localPoint.x + meshWidth / 2) / meshWidth;
    const v = (localPoint.y + meshHeight / 2) / meshHeight;

    return {
      x: Math.max(0, Math.min(Math.floor(u * this.#pgmData.width), this.#pgmData.width - 1)),
      y: Math.max(0, Math.min(Math.floor(v * this.#pgmData.height), this.#pgmData.height - 1)),
    };
  }

  // 清理资源
  public dispose(): void {
    // 清理点位标记
    this.#pointMarkers.forEach(marker => {
      this.#scene.remove(marker);
      marker.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          }
        }
      });
    });
    this.#pointMarkers.clear();

    // 清理线段网格
    this.#lineMeshes.forEach(lineMesh => {
      this.#scene.remove(lineMesh);
      lineMesh.geometry.dispose();
      if (lineMesh.material instanceof THREE.Material) {
        lineMesh.material.dispose();
      }
    });
    this.#lineMeshes.clear();

    // 清理当前线段
    if (this.#currentLineMesh) {
      this.#scene.remove(this.#currentLineMesh);
      this.#currentLineMesh.geometry.dispose();
      if (this.#currentLineMesh.material instanceof THREE.Material) {
        this.#currentLineMesh.material.dispose();
      }
      this.#currentLineMesh = null;
    }
  }

  // 强制重新渲染所有线段
  public forceRenderLines(): void {
    // console.log("强制重新渲染所有线段，当前线段数量:", this.#lines.length);

    // 清理现有的线段网格
    this.#lineMeshes.forEach(mesh => {
      this.#scene.remove(mesh);
    });
    this.#lineMeshes.clear();

    // 重新渲染所有线段
    this.#lines.forEach(line => {
      if (line.visible !== false) {
        // console.log("重新创建线段网格，ID:", line.id, "点数:", line.points.length);
        this.createLineMesh(line);
      }
    });
  }

  // 动态更新scene对象
  public updateScene(scene: THREE.Scene) {
    this.#scene = scene;
  }
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): T & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };

  debounced.cancel = () => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
  };

  return debounced as T & { cancel: () => void };
}
