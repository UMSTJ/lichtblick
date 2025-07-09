// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/* eslint-disable react/forbid-component-props */
import {
  DrawImage24Regular,
  Save24Regular,
  ColorLine24Regular,
  Layer24Regular,
  BoxArrowUpRegular,
  ChevronUp24Regular,
  ChevronDown24Regular,
  Pin24Regular,
  LineHorizontal124Regular,
  AddCircle24Filled,
  Location24Regular,
} from "@fluentui/react-icons";
import { Eraser24Regular,Pen24Regular } from "@fluentui/react-icons";
import {
  AppBar,
  Toolbar,
  IconButton,
  Divider,
  // eslint-disable-next-line no-restricted-imports
  Box,
  Tooltip,
  // eslint-disable-next-line @lichtblick/no-restricted-imports
  styled,
  Slider,
  Popover,
  Paper,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";

import { PointInteractionManager } from "@lichtblick/suite-base/panels/SlamMapEdit/PGMCanvasEditor/manager/PointInteractionManager";

// 自定义样式的 AppBar
const StyledAppBar = styled(AppBar)(() => ({
  background: "#f5f5f5",
  boxShadow: "none",
  borderBottom: "1px solid #e0e0e0",
}));

// 工具按钮组件
const ToolButton = styled(IconButton)(({ selected }: { selected?: boolean }) => ({
  padding: "8px",
  margin: "0 2px",
  borderRadius: "4px",
  backgroundColor: selected ?? false ? "#e0e0e0" : "transparent",
  "&:hover": {
    backgroundColor: "#e8e8e8",
  },
  color: "#000",
}));

// 锚钉容器
const AnchorContainer = styled(Paper)(() => ({
  position: "absolute",
  top: 0,
  left: "50%",
  transform: "translateX(-50%)",
  padding: "4px",
  background: "#f5f5f5",
  borderRadius: "0 0 8px 8px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  zIndex: 1100,
  display: "flex",
  alignItems: "center",
  gap: "8px",
}));

const BrushSizePopover = styled(Popover)(() => ({
  "& .MuiPopover-paper": {
    padding: "16px",
    background: "#f5f5f5",
    width: "200px",
  },
}));

// 隐藏文件输入
// const HiddenFileInput = styled("input")({
//   display: "none",
// });

interface DrawingToolbarProps {
  drawing: boolean;
  drawPoint: boolean;
  toggleDrawing: () => void;
  toggleDrawPoint: () => void;
  onExportPoints: () => void;
  savePGM: () => void;
  brushColor: number;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  onLayerDrawerToggle: () => void;
  isLayerPanelOpen: boolean;
  onBrushColorChange: (color: number) => void;
  loadPoints: () => void;
  onPointsDrawerToggle: () => void;
  isPointsPanelOpen: boolean;
  onDownloadMaskMap: () => void;
  onCancelCreatingLine?: () => void;
  children?: React.ReactNode; // 新增children插槽
  pointManagerRef: React.RefObject<PointInteractionManager>;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  drawing,
  drawPoint,
  onExportPoints,
  toggleDrawing,
  toggleDrawPoint,
  savePGM,
  brushColor,
  onLayerDrawerToggle,
  isLayerPanelOpen,
  brushSize,
  onBrushSizeChange,
  onBrushColorChange,
  loadPoints,
  onPointsDrawerToggle,
  isPointsPanelOpen,
  onDownloadMaskMap,
  onCancelCreatingLine,
  children,
  pointManagerRef,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [mode, setMode] = useState<"drawing" | "point" | "delete" | "none">("none");
  useEffect(() => {
    if (mode === "none") {
      if(drawing){
        toggleDrawing();
      }
      if( drawPoint ) {
        toggleDrawPoint();
      }
      if( isPointsPanelOpen){
        onPointsDrawerToggle();
      }
      if( isLayerPanelOpen){
        onLayerDrawerToggle();
      }
    }
    if (mode === "point") {
      // if( !drawing ) {
      //   toggleDrawing();
      // }
      if( !drawPoint ) {
        toggleDrawPoint();
      }
      // loadPoints();

    }
    if (mode === "drawing") {
      // if( !drawing ) {
      //   toggleDrawing();
      // }
      // onDownloadMaskMap();
    }
    if (mode === "delete") {
      // if( !drawing ) {
      //   toggleDrawing();

      // }

      // onDownloadMaskMap();
    }
  }, [drawPoint, drawing, loadPoints, mode, onBrushColorChange, onDownloadMaskMap, toggleDrawPoint, toggleDrawing]);


  const toggleExpand = () => {
    // if( isExpanded ) {
    //   setMode("none");
    // }
    setIsExpanded(!isExpanded);
  };

  const [brushAnchorEl, setBrushAnchorEl] = useState<HTMLElement | null>(null);

  const handleBrushSizeClick = (event: React.MouseEvent<HTMLElement>) => {
    setBrushAnchorEl(event.currentTarget);
  };

  const handleBrushSizeClose = () => {
    setBrushAnchorEl(null);
  };

  const handleBrushSizeChange = (_event: Event, newValue: number | number[]) => {
    onBrushSizeChange(newValue as number);
  };

  const handleColorChange = (_event: Event, newValue: number | number[]) => {
    onBrushColorChange(newValue as number);
  };

  // 当工具栏最小化时显示的锚钉
  const renderAnchor = () => (
    <AnchorContainer>
      <Tooltip title="展开工具栏">
      <ToolButton onClick={toggleExpand}>
        <Pin24Regular />
        <Typography variant="caption">展开工具栏</Typography>
      </ToolButton>

      </Tooltip>
    </AnchorContainer>
  );

  // 完整的工具栏
  const renderToolbar = () => (
    <StyledAppBar position="static">
      <Toolbar variant="dense" sx={{ minHeight: 48 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
          {/* 左侧插槽：地图选择器 */}
          {Boolean(children) && (
            <Box sx={{ mr: 2, minWidth: 180, display: 'flex', alignItems: 'center' }}>
              {children}
            </Box>
          )}
          {/* 文件/编辑操作区 */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {mode === "point" && <Tooltip title={`添加点位模式：${drawing ? "开启" : "关闭"}`}>
              <ToolButton onClick={toggleDrawing} sx={{ backgroundColor: drawing ? "#e0e0e0" : "transparent" }}>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <AddCircle24Filled />
                  <Typography variant="caption">添加</Typography>
                </Box>
              </ToolButton>
            </Tooltip>}
            {mode === "point" && drawPoint && <Tooltip title="点位管理">
              <ToolButton onClick={onPointsDrawerToggle} sx={{ backgroundColor: isPointsPanelOpen ? "#e0e0e0" : "transparent" }}>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <Location24Regular />
                  <Typography variant="caption">点位</Typography>
                </Box>
              </ToolButton>
            </Tooltip>}
            {mode === "drawing" && <Tooltip title={`画刷模式：${drawing ? "开启" : "关闭"}`}>
              <ToolButton onClick={
                () => {
                  toggleDrawing();
                  onBrushColorChange(0);
                }
              } sx={{ backgroundColor: (!drawing || brushColor === 255) ?  "transparent" :"#e0e0e0"}}>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <DrawImage24Regular />
                  <Typography variant="caption">画刷</Typography>
                </Box>
              </ToolButton>
            </Tooltip>}
            {mode === "drawing" && <Tooltip title={`擦除模式：${drawing ? "开启" : "关闭"}`}>
              <ToolButton onClick={
                () => {
                  onBrushColorChange(255);
              }} sx={{ backgroundColor: brushColor === 255 ?  "#e0e0e0" : "transparent"}}>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <Eraser24Regular />
                  <Typography variant="caption">擦除</Typography>
                </Box>
              </ToolButton>
            </Tooltip>}

            {/* <Tooltip title="下载掩码图（MaskMap）">
              <ToolButton onClick={onDownloadMaskMap}>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <SaveArrowRight24Filled />
                  <Typography variant="caption">下载掩码</Typography>
                </Box>
              </ToolButton>
            </Tooltip> */}

            {/* <Tooltip title="导入点位数据">
              <ToolButton onClick={loadPoints}>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <SaveArrowRight24Filled />
                  <Typography variant="caption">导入点</Typography>
                </Box>
              </ToolButton>
            </Tooltip> */}
          </Box>
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          {/* 绘图工具区 */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>

            {mode === "none" && <Tooltip title="添加导航点">
              <ToolButton onClick={
                () => {
                  loadPoints();
                  setMode("point"); }
              } sx={{ backgroundColor: drawing ? "#e0e0e0" : "transparent" }}>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <AddCircle24Filled />
                  <Typography variant="caption">添加导航点</Typography>
                </Box>
              </ToolButton>
            </Tooltip>}

            {mode === "none" && <Tooltip title="绘制虚拟墙">
              <ToolButton onClick={
                () => {
                  onDownloadMaskMap();
                  onBrushColorChange(0);
                  pointManagerRef.current?.setPoints([]);
                  setMode("drawing"); }
              } sx={{ backgroundColor: drawing ? "#e0e0e0" : "transparent" }}>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <Pen24Regular />
                  <Typography variant="caption">绘制虚拟墙</Typography>
                </Box>
              </ToolButton>
            </Tooltip>}

            {/* {mode === "none" && <Tooltip title="删除障碍物">
              <ToolButton onClick={
                () => {
                  onDownloadMaskMap();
                  onBrushColorChange(255);
                  pointManagerRef.current?.setPoints([]);
                  setMode("delete"); }
              } sx={{ backgroundColor: drawing ? "#e0e0e0" : "transparent" }}>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <Eraser24Regular />
                  <Typography variant="caption">删除障碍物</Typography>
                </Box>
              </ToolButton>
            </Tooltip>} */}



            {/* {drawing && <Tooltip title={`切换点/线模式：${drawPoint ? "点" : "线"}`}>
              <ToolButton onClick={toggleDrawPoint} sx={{ backgroundColor: drawPoint ? "#e0e0e0" : "transparent" }}>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <AddCircle24Filled />
                  <Typography variant="caption">点/线</Typography>
                </Box>
              </ToolButton>
            </Tooltip>
            } */}
            {mode === "drawing" && !drawPoint && <Tooltip title={`调整画刷粗细：${brushSize}`}>
              <ToolButton onClick={handleBrushSizeClick}>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <LineHorizontal124Regular />
                  <Typography variant="caption">粗细</Typography>
                </Box>
              </ToolButton>
            </Tooltip>}
            {mode === "drawing" && !drawPoint && <Tooltip title="图层管理">
              <ToolButton onClick={onLayerDrawerToggle} sx={{ backgroundColor: isLayerPanelOpen ? "#e0e0e0" : "transparent" }}>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <Layer24Regular />
                  <Typography variant="caption">图层</Typography>
                </Box>
              </ToolButton>
            </Tooltip>}

            {/* {mode === "drawing" && !drawPoint && <Tooltip title="调整画刷颜色">
              <ToolButton>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <ColorLine24Regular />
                  <Typography variant="caption">颜色</Typography>
                </Box>
              </ToolButton>
            </Tooltip>}
            {mode === "drawing" && !drawPoint && <Slider
              value={brushColor}
              onChange={handleColorChange}
              min={0}
              max={255}
              step={1}
              sx={{
                width: 80,
                mx: 1,
                "& .MuiSlider-rail": {
                  background: "linear-gradient(to right, #000, #fff)",
                  height: 16, // 提高滑道高度
                  borderRadius: 8,
                },
                "& .MuiSlider-track": {
                  background: "transparent",
                  height: 16, // 提高滑道高度
                },
                "& .MuiSlider-thumb": {
                  width: 16, // 加粗thumb
                  height: 16,
                  marginTop: -2,
                  backgroundColor: `rgb(${brushColor},${brushColor},${brushColor})`,
                  border: "2px solid #fff",
                },
              }}
            />} */}
            {/* {mode === "drawing"  && !drawPoint && <Typography variant="body2" sx={{ minWidth: 32, color: "black" }}>{brushColor}</Typography>} */}
          </Box>
          {mode === "drawing" && !drawPoint && <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />}

          {/* 图层/点位区 */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>


            {/* {drawing && drawPoint && (
              <Tooltip title="取消折线创建">
                <ToolButton onClick={onCancelCreatingLine} sx={{ backgroundColor: "#ffebee", color: "#d32f2f", "&:hover": { backgroundColor: "#ffcdd2" } }}>
                  <Box display="flex" flexDirection="column" alignItems="center">
                    <Typography variant="h6" sx={{ lineHeight: 1 }}>✕</Typography>
                    <Typography variant="caption">取消</Typography>
                  </Box>
                </ToolButton>
              </Tooltip>
            )} */}
            {mode === "drawing" && !drawPoint && <Tooltip title="保存当前PGM文件">
              <ToolButton onClick={savePGM}>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <Save24Regular />
                  <Typography variant="caption">保存</Typography>
                </Box>
              </ToolButton>
            </Tooltip>}
             {drawPoint && <Tooltip title="导出点位数据">
              <ToolButton onClick={onExportPoints}>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <BoxArrowUpRegular />
                  <Typography variant="caption">保存点位</Typography>
                </Box>
              </ToolButton>
            </Tooltip>}
            {mode !== "none" && (
              <Tooltip title="返回">
                <ToolButton onClick={
                  () => {
                    loadPoints();
                    setMode("none"); }
                } sx={{ backgroundColor: "#ffebee", color: "#d32f2f", "&:hover": { backgroundColor: "#ffcdd2" } }}>
                  <Box display="flex" flexDirection="column" alignItems="center">
                    <Typography variant="h6" sx={{ lineHeight: 1 }}>✕</Typography>
                    <Typography variant="caption">返回</Typography>
                  </Box>
                </ToolButton>
              </Tooltip>
            )}
          </Box>

          {/* 右侧最小化按钮固定最右侧 */}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
            <Tooltip title={isExpanded ? "收起工具栏" : "展开工具栏"}>
              <ToolButton onClick={toggleExpand}>
                <Box display="flex" flexDirection="column" alignItems="center">
                  {isExpanded ? <ChevronUp24Regular /> : <ChevronDown24Regular />}
                  <Typography variant="caption">{isExpanded ? "收起" : "展开"}</Typography>
                </Box>
              </ToolButton>
            </Tooltip>
          </Box>
        </Box>
      </Toolbar>

      {/* 保留笔刷大小弹出窗口 */}
      <BrushSizePopover
        open={Boolean(brushAnchorEl)}
        anchorEl={brushAnchorEl}
        onClose={handleBrushSizeClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography gutterBottom>画刷粗细: {brushSize}</Typography>
          <Slider
            value={brushSize}
            onChange={handleBrushSizeChange}
            min={1}
            max={20}
            step={1}
            marks
            valueLabelDisplay="auto"
            sx={{ width: "100%", "& .MuiSlider-mark": { height: 4 } }}
          />
        </Box>
      </BrushSizePopover>
    </StyledAppBar>
  );

  return isExpanded ? renderToolbar() : renderAnchor();
};
