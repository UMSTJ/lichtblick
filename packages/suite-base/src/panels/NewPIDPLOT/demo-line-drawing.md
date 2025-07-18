# 线段绘制功能演示

## 功能概述

NewPIDPLOT面板支持线段绘制功能，可以连接数据点形成连续的曲线，便于观察PID控制系统的动态响应。

## 配置选项

### 基本线段配置
```json
{
  "showLine": true,    // 是否显示线段（默认true）
  "lineSize": 2,       // 线段宽度（默认2）
  "color": "#ff0000"   // 线段颜色
}
```

### 线段样式示例

#### 1. 默认线段
```json
{
  "showLine": true,
  "lineSize": 2,
  "color": "#ff0000"
}
```
效果：红色，线宽2像素的连续线段

#### 2. 粗线段
```json
{
  "showLine": true,
  "lineSize": 5,
  "color": "#00ff00"
}
```
效果：绿色，线宽5像素的粗线段

#### 3. 细线段
```json
{
  "showLine": true,
  "lineSize": 1,
  "color": "#0000ff"
}
```
效果：蓝色，线宽1像素的细线段

#### 4. 仅显示数据点
```json
{
  "showLine": false,
  "lineSize": 1,
  "color": "#ff00ff"
}
```
效果：只显示数据点，不连接线段

## 实际应用场景

### PID控制曲线
```
设定值: 红色线段 (lineSize: 2)
反馈值: 绿色线段 (lineSize: 2)
输出值: 蓝色线段 (lineSize: 2)
```

### 视觉效果
```
   16 |    设定值 ──────●──────●──────●
      |                │      │      │
    0 |    反馈值 ──────●──────●──────●
      |                │      │      │
 -16  |    输出值 ──────●──────●──────●
      |    0    2    4    6    8    10
```

## 配置示例

### 完整的PID路径配置
```json
{
  "paths": [
    {
      "value": "/pcl_pose.pose.position.x",
      "enabled": true,
      "label": "设定值",
      "timestampMethod": "receiveTime",
      "parameterType": "setpoint",
      "color": "#ff0000",
      "showLine": true,
      "lineSize": 2
    },
    {
      "value": "/pcl_pose.pose.position.y",
      "enabled": true,
      "label": "反馈值",
      "timestampMethod": "receiveTime",
      "parameterType": "feedback",
      "color": "#00ff00",
      "showLine": true,
      "lineSize": 2
    },
    {
      "value": "/pcl_pose.pose.position.z",
      "enabled": true,
      "label": "输出值",
      "timestampMethod": "receiveTime",
      "parameterType": "output",
      "color": "#0000ff",
      "showLine": true,
      "lineSize": 2
    }
  ]
}
```

## 技术实现

### 数据处理流程
1. **路径解析**: 解析ROS话题路径
2. **数据提取**: 从消息中提取数值数据
3. **线段配置**: 应用showLine和lineSize设置
4. **渲染绘制**: 使用Chart.js绘制线段

### 性能优化
- 线段绘制使用Canvas渲染，性能优异
- 支持大数据量的实时更新
- 自动处理数据点之间的插值

## 使用建议

1. **线宽选择**:
   - 1-2像素：适合精细观察
   - 3-5像素：适合演示展示
   - 5+像素：适合大屏幕显示

2. **颜色搭配**:
   - 使用对比度高的颜色
   - 避免使用过于相似的颜色
   - 考虑色盲友好的配色方案

3. **线段显示**:
   - 对于快速变化的数据，建议显示线段
   - 对于离散数据，可以关闭线段显示
   - 可以通过showLine动态控制显示效果
