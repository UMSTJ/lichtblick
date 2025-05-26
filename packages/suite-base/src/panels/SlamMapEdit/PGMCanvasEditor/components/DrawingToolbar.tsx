import {
  DrawImage24Regular,
  Save24Regular,
  ColorLine24Regular,
  DocumentArrowUpRegular,
  Layer24Regular,
  BoxArrowUpRegular,
  ChevronUp24Regular,
  ChevronDown24Regular,
  Pin24Regular,
  LineHorizontal124Regular,
  AddCircle24Filled,
  SaveEditFilled,
  SaveArrowRight24Filled,
} from "@fluentui/react-icons";
import {
  AppBar,
  Toolbar,
  IconButton,
  Divider,
  Box,
  Tooltip,
  styled,
  Collapse,
  Slider,
  Popover,
  Paper,
  Typography,
} from "@mui/material";
import React, { useState } from "react";

// 自定义样式的 AppBar
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  background: "#f5f5f5",
  boxShadow: "none",
  borderBottom: "1px solid #e0e0e0",
}));

// 工具按钮组件
const ToolButton = styled(IconButton)(
  ({ theme, selected }: { theme: any; selected?: boolean }) => ({
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
const AnchorContainer = styled(Paper)(({ theme }) => ({
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

const BrushSizePopover = styled(Popover)(({ theme }) => ({
  "& .MuiPopover-paper": {
    padding: "16px",
    background: "#f5f5f5",
    width: "200px",
  },
}));

// 隐藏文件输入
const HiddenFileInput = styled("input")({
  display: "none",
});

interface DrawingToolbarProps {
  drawing: boolean;
  drawPoint: boolean;
  toggleDrawing: () => void;
  toggleDrawPoint: () => void;
  onExportPoints:  () => void;
  savePGM: () => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  brushColor: number;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  onLayerDrawerToggle: () => void;
  isLayerPanelOpen: boolean;
  onBrushColorChange: (color: number) => void;
  handleYamlUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  drawing,
  drawPoint,
                                                                onExportPoints,
  toggleDrawing,
  toggleDrawPoint,
  savePGM,
  handleFileUpload,
  brushColor,
  onLayerDrawerToggle,
  isLayerPanelOpen,
  brushSize,
  onBrushSizeChange,
   onBrushColorChange,
  handleYamlUpload,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 在DrawingToolbar组件内添加：
  const yamlInputRef = React.useRef<HTMLInputElement>(null);
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const [brushAnchorEl, setBrushAnchorEl] = useState<HTMLElement | null>(null);
  const [colorAnchorEl, setColorAnchorEl] = useState<HTMLElement | null>(null);
  const handleBrushSizeClick = (event: React.MouseEvent<HTMLElement>) => {
    setBrushAnchorEl(event.currentTarget);
  };

  const handleBrushSizeClose = () => {
    setBrushAnchorEl(null);
  };

  const handleBrushSizeChange = (event: Event, newValue: number | number[]) => {
    onBrushSizeChange(newValue as number);
  };

  // 颜色选择弹窗处理
  const handleColorClick = (event: React.MouseEvent<HTMLElement>) => {
    setColorAnchorEl(event.currentTarget);
  };

  const handleColorClose = () => {
    setColorAnchorEl(null);
  };

  const handleColorChange = (event: Event, newValue: number | number[]) => {
    onBrushColorChange(newValue as number);
  };

  // 在return语句前添加颜色选择弹窗
  const ColorSelectPopover = styled(Popover)(({ theme }) => ({
    "& .MuiPopover-paper": {
      padding: "16px",
      background: "#f5f5f5",
      width: "240px",
    },
  }));


  // 颜色预览组件
  const ColorPreview = styled(Box)({
    width: "100%",
    height: "24px",
    borderRadius: "4px",
    background: `linear-gradient(to right, #000 0%, #333 33%, #666 66%, #fff 100%)`,
    margin: "12px 0",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  });

  // 修改工具栏布局，添加内联颜色选择器
  const ToolbarContainer = styled(Box)({
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '0 16px',
    width: '100%',
  });

  const ColorControl = styled(Box)({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 180,
  });

  const CompactSlider = styled(Slider)({
    width: 120,
    margin: '0 8px',
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
    },
  });


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
              <ToolButton selected={drawing} onClick={toggleDrawing}>
                <DrawImage24Regular />
              </ToolButton>
            </Tooltip>
            <Tooltip title={`DrawMode: ${drawPoint ? "Point" : "Line"}`}>
              <ToolButton selected={drawPoint} onClick={toggleDrawPoint}>
                <AddCircle24Filled />
              </ToolButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem />

            <Tooltip title="Save PGM">
              <ToolButton onClick={savePGM}>
                <Save24Regular />
              </ToolButton>
            </Tooltip>
            <Tooltip title="EXPORT Points">
              <ToolButton onClick={onExportPoints}>
                <SaveArrowRight24Filled />
              </ToolButton>
            </Tooltip>

            {/* 颜色选择器部分 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 180 }}>
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

            {/*<Divider orientation="vertical" flexItem />*/}

            {/* 笔刷大小部分保持原样 */}
            <Tooltip title={`Brush Size: ${brushSize}`}>
              <ToolButton onClick={handleBrushSizeClick}>
                <LineHorizontal124Regular />
              </ToolButton>
            </Tooltip>

            {/* 其余部分保持不变 */}
            <Divider orientation="vertical" flexItem />
            <Tooltip title="Layers">
              <ToolButton onClick={onLayerDrawerToggle} selected={isLayerPanelOpen}>
                <Layer24Regular />
              </ToolButton>
            </Tooltip>

            <Tooltip title="Upload PGM File">
              <ToolButton onClick={handleFileButtonClick}>
                <DocumentArrowUpRegular />
              </ToolButton>
            </Tooltip
            ><Tooltip title="Upload YAML File">
            <ToolButton
              onClick={() => yamlInputRef.current?.click()} // 触发隐藏的input
            >
              <BoxArrowUpRegular />
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

      {/* 隐藏的文件输入 */}
      <HiddenFileInput ref={fileInputRef} type="file" accept=".pgm" onChange={handleFileUpload} />
      // 在组件return的末尾添加隐藏的input
      <HiddenFileInput
        ref={yamlInputRef}
        type="file"
        accept=".yaml"
        onChange={handleYamlUpload}
        style={{ display: 'none' }}
      />
    </StyledAppBar>
  );

  return isExpanded ? renderToolbar() : renderAnchor();
};
