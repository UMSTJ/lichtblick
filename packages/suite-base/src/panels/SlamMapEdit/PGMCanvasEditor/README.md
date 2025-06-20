# PGM Canvas Editor - Points Management

## 概述

PGM Canvas Editor 现在支持类似 Layer 展示效果的 Points 管理功能。通过 PointsDrawer 组件，您可以对编辑器中的点位进行可视化管理、编辑和刷新。

## 功能特性

### PointsDrawer 功能
- **点位列表显示**: 显示所有点位的名称、ID和坐标信息
- **点位可见性控制**: 可以隐藏/显示特定点位
- **点位名称编辑**: 支持内联编辑点位名称
- **点位删除**: 支持删除不需要的点位
- **点位刷新**: 从服务器重新加载点位数据
- **点位选择**: 点击点位进行选择，支持高亮显示

### 工具栏集成
- 在 DrawingToolbar 中添加了 Points 按钮
- 点击按钮可以打开/关闭 PointsDrawer
- 按钮状态会显示当前是否打开

## 使用方法

### 打开 PointsDrawer
1. 在工具栏中点击 Points 按钮（位置图标）
2. PointsDrawer 将在右侧打开，显示所有点位

### 编辑点位名称
1. 在点位列表中点击编辑按钮（铅笔图标）
2. 输入新的名称
3. 按 Enter 保存或按 Escape 取消

### 控制点位可见性
1. 点击点位右侧的眼睛图标
2. 点位将在地图上隐藏/显示

### 删除点位
1. 点击点位右侧的删除按钮（垃圾桶图标）
2. 点位将从列表中移除

### 刷新点位数据
1. 点击 PointsDrawer 顶部的刷新按钮
2. 系统将从服务器重新加载最新的点位数据

## 技术实现

### 组件结构
- `PointsDrawer.tsx`: 主要的点位管理组件
- `DrawingToolbar.tsx`: 集成了 Points 按钮的工具栏
- `index.tsx`: 主编辑器组件，集成了所有功能

### 数据结构
```typescript
interface Point {
  id: number;
  name: string;
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  visible?: boolean;
}
```

### 主要功能函数
- `handlePointSelect`: 处理点位选择
- `handlePointVisibilityChange`: 处理点位可见性切换
- `handlePointNameChange`: 处理点位名称修改
- `handleDeletePoint`: 处理点位删除
- `handleRefreshPoints`: 处理点位数据刷新

## 与 LayerDrawer 的相似性

PointsDrawer 的设计参考了 LayerDrawer 的结构和样式，提供了一致的用户体验：

- 相同的抽屉式布局
- 相似的操作按钮布局
- 一致的视觉样式
- 相同的交互模式

## 注意事项

1. 点位可见性控制会影响 Three.js 场景中的渲染
2. 点位名称编辑支持键盘快捷键（Enter 保存，Escape 取消）
3. 删除点位后会自动重新分配 ID
4. 刷新功能会从服务器获取最新的点位数据
