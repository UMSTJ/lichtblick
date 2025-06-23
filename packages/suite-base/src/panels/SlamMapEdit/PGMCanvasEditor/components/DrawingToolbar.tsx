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
  SaveArrowRight24Filled,
  Location24Regular,
} from "@fluentui/react-icons";
import {
  AppBar,
  Toolbar,
  IconButton,
  Divider,
  Box,
  Tooltip,
  styled,
  Slider,
  Popover,
  Paper,
  Typography,
} from "@mui/material";
import React, { useState } from "react";

// 自定义样式的 AppBar
const StyledAppBar = styled(AppBar)(() => ({
  background: "#f5f5f5",
  boxShadow: "none",
  borderBottom: "1px solid #e0e0e0",
}));

// 工具按钮组件
const ToolButton = styled(IconButton)(
  ({ selected }: { selected?: boolean }) => ({
    padding: "8px",
    margin: "0 2px",
    borderRadius: "4px",
    backgroundColor: selected ? "#e0e0e0" : "transparent",
    "&:hover": {
      backgroundColor: "#e8e8e8",
    },
    color: "#000",
  }),
);

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
  onExportPoints:  () => void;
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
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  drawing,
  drawPoint, onExportPoints,
  toggleDrawing,
  toggleDrawPoint,
  savePGM,
  brushColor,
  onLayerDrawerToggle,
  isLayerPanelOpen,
  brushSize,
  onBrushSizeChange, onBrushColorChange,
  loadPoints,
  onPointsDrawerToggle,
  isPointsPanelOpen,
  onDownloadMaskMap,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpand = () => {
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
      <ToolButton onClick={toggleExpand}>
        <Pin24Regular />
      </ToolButton>
    </AnchorContainer>
  );

  // 完整的工具栏
  const renderToolbar = () => (
    <StyledAppBar position="static">
      <Toolbar variant="dense" sx={{ minHeight: 48 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
          {/* 左侧工具组 */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
            <Tooltip title={`Drawing Mode: ${drawing ? "On" : "Off"}`}>
              <ToolButton
                onClick={toggleDrawing}
                sx={{ backgroundColor: drawing ? "#e0e0e0" : "transparent" }}
              >
                <DrawImage24Regular />
              </ToolButton>
            </Tooltip>
            <Tooltip title={`DrawMode: ${drawPoint ? "Point" : "Line"}`}>
              <ToolButton
                onClick={toggleDrawPoint}
                sx={{ backgroundColor: drawPoint ? "#e0e0e0" : "transparent" }}
              >
                <AddCircle24Filled />
              </ToolButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem />



            {/* 颜色选择器部分 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 180 }}>
              {/* 笔刷大小部分保持原样 */}
              <Tooltip title={`Brush Size: ${brushSize}`}>
                <ToolButton onClick={handleBrushSizeClick}>
                  <LineHorizontal124Regular />
                </ToolButton>
              </Tooltip>
              <Tooltip title="Brush Color">
                <ToolButton>
                  <ColorLine24Regular />
                </ToolButton>
              </Tooltip>
              <Slider
                value={brushColor}
                onChange={handleColorChange}
                min={0}
                max={255}
                step={1}
                sx={{
                  width: 120,
                  '& .MuiSlider-rail': {
                    background: 'linear-gradient(to right, #000, #fff)',
                    height: 8,
                    borderRadius: 4,
                  },
                  '& .MuiSlider-track': {
                    background: 'transparent',
                    height: 8,
                  },
                  '& .MuiSlider-thumb': {
                    width: 16,
                    height: 16,
                    marginTop: -4,
                    backgroundColor: `rgb(${brushColor},${brushColor},${brushColor})`,
                    border: '2px solid #fff',
                  },
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  minWidth: 40,
                  color: 'black' // 这里添加固定黑色
                }}
              >
                {brushColor}
              </Typography>
            </Box>

            <Divider orientation="vertical" flexItem />

            <Tooltip title="Save PGM">
              <ToolButton onClick={savePGM}>
                <Save24Regular />
              </ToolButton>
            </Tooltip>
            <Tooltip title="Download MaskMap">
              <ToolButton onClick={onDownloadMaskMap}>
                <SaveArrowRight24Filled />
              </ToolButton>
            </Tooltip>
            <Tooltip title="EXPORT Points">
              <ToolButton onClick={onExportPoints}>
                {/*<SaveArrowRight24Filled />*/}
                <BoxArrowUpRegular />
              </ToolButton>
            </Tooltip>
            <Tooltip title="Download Points">
              <ToolButton onClick={loadPoints}>
                <SaveArrowRight24Filled />
              </ToolButton>
            </Tooltip>

            {/* 其余部分保持不变 */}
            <Divider orientation="vertical" flexItem />
            <Tooltip title="Layers">
              <ToolButton
                onClick={onLayerDrawerToggle}
                sx={{ backgroundColor: isLayerPanelOpen ? "#e0e0e0" : "transparent" }}
              >
                <Layer24Regular />
              </ToolButton>
            </Tooltip>

            <Tooltip title="Points">
              <ToolButton
                onClick={onPointsDrawerToggle}
                sx={{ backgroundColor: isPointsPanelOpen ? "#e0e0e0" : "transparent" }}
              >
                <Location24Regular />
              </ToolButton>
            </Tooltip>


          </Box>

          {/* 右侧最小化按钮 */}
          <Tooltip title={isExpanded ? "Minimize" : "Expand"}>
            <ToolButton onClick={toggleExpand}>
              {isExpanded ? <ChevronUp24Regular /> : <ChevronDown24Regular />}
            </ToolButton>
          </Tooltip>
        </Box>
      </Toolbar>

      {/* 保留笔刷大小弹出窗口 */}
      <BrushSizePopover
        open={Boolean(brushAnchorEl)}
        anchorEl={brushAnchorEl}
        onClose={handleBrushSizeClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography gutterBottom>Brush Size: {brushSize}</Typography>
          <Slider
            value={brushSize}
            onChange={handleBrushSizeChange}
            min={1}
            max={20}
            step={1}
            marks
            valueLabelDisplay="auto"
            sx={{
              width: "100%",
              "& .MuiSlider-mark": {
                height: 4,
              },
            }}
          />
        </Box>
      </BrushSizePopover>
    </StyledAppBar>
  );

  return isExpanded ? renderToolbar() : renderAnchor();
};
