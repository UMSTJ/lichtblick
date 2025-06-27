import {
  Add24Regular,
  Delete24Regular,
  Eye24Regular,
  EyeOff24Regular,
  ArrowClockwise24Regular,
  Edit24Regular,
  Save24Regular,
  Dismiss24Regular,
} from "@fluentui/react-icons";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Typography,
  Stack,
  styled,
  TextField,
  InputAdornment,
} from "@mui/material";
import React, { useState } from "react";

export interface Point {
  id: number;
  name: string;
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  visible?: boolean;
}

interface PointsDrawerProps {
  open: boolean;
  points: Point[];
  selectedPoint?: number;
  onClose: () => void;
  onDeletePoint: (id: number) => void;
  onPointVisibilityChange: (id: number) => void;
  onPointSelect: (id: number) => void;
  onPointNameChange: (id: number, newName: string) => void;
  onRefreshPoints: () => void;
}

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  "& .MuiDrawer-paper": {
    width: 320,
    position: "absolute",
    height: "calc(100% - 48px)",
    top: "48px",
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    overflow: "hidden",
  },
  "& .MuiBackdrop-root": {
    display: "none",
  },
}));

const PointItem = styled(ListItem)(({ theme }) => ({
  padding: "4px 8px",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

const PointNameInput = styled(TextField)(() => ({
  "& .MuiInputBase-root": {
    fontSize: "14px",
    padding: "4px 8px",
  },
  "& .MuiInputBase-input": {
    padding: "4px 8px",
  },
}));

export const PointsDrawer: React.FC<PointsDrawerProps> = ({
  open,
  points,
  selectedPoint,
  onClose,
  onDeletePoint,
  onPointVisibilityChange,
  onPointSelect,
  onPointNameChange,
  onRefreshPoints,
}) => {
  const [editingPointId, setEditingPointId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>("");

  const handleEditStart = (point: Point) => {
    setEditingPointId(point.id);
    setEditingName(point.name);
  };

  const handleEditSave = () => {
    if (editingPointId !== null) {
      onPointNameChange(editingPointId, editingName);
      setEditingPointId(null);
      setEditingName("");
    }
  };

  const handleEditCancel = () => {
    setEditingPointId(null);
    setEditingName("");
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleEditSave();
    } else if (event.key === "Escape") {
      handleEditCancel();
    }
  };

  return (
    <StyledDrawer
      variant="persistent"
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
    >
      <Box sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6">Points</Typography>
          <Stack direction="row" spacing={1}>
            <IconButton onClick={onRefreshPoints} size="small" title="刷新点位">
              <ArrowClockwise24Regular />
            </IconButton>
            {/* <IconButton onClick={onAddPoint} size="small" title="添加点位">
              <Add24Regular />
            </IconButton> */}
          </Stack>
        </Stack>

        <List sx={{ flex: 1, overflow: "auto" }}>
          {points.map((point) => (
            <PointItem
              key={point.id}
              disablePadding
              secondaryAction={
                <Stack direction="row" spacing={1}>
                  {editingPointId === point.id ? (
                    <>
                      <IconButton
                        size="small"
                        onClick={handleEditSave}
                        title="保存"
                      >
                        <Save24Regular />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={handleEditCancel}
                        title="取消"
                      >
                        <Dismiss24Regular />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <IconButton
                        size="small"
                        onClick={() => onPointVisibilityChange(point.id)}
                        title={point.visible !== false ? "隐藏" : "显示"}
                      >
                        {point.visible !== false ? <Eye24Regular /> : <EyeOff24Regular />}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleEditStart(point)}
                        title="编辑名称"
                      >
                        <Edit24Regular />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => onDeletePoint(point.id)}
                        title="删除"
                      >
                        <Delete24Regular />
                      </IconButton>
                    </>
                  )}
                </Stack>
              }
              sx={{
                backgroundColor:
                  point.id === selectedPoint ? (theme) => theme.palette.action.selected : "transparent",
                "&:hover": {
                  backgroundColor: (theme) => theme.palette.action.hover,
                },
              }}
            >
              <ListItemButton
                selected={point.id === selectedPoint}
                onClick={() => onPointSelect(point.id)}
                dense
                sx={{ flex: 1 }}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      backgroundColor: "#ff0000",
                      border: "1px solid #fff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    editingPointId === point.id ? (
                      <PointNameInput
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={handleKeyPress}
                        onBlur={handleEditSave}
                        autoFocus
                        size="small"
                        fullWidth
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Typography variant="caption" color="text.secondary">
                                {point.id}
                              </Typography>
                            </InputAdornment>
                          ),
                        }}
                      />
                    ) : (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {point.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {point.id}
                        </Typography>
                      </Box>
                    )
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      ({point.worldX.toFixed(2)}, {point.worldY.toFixed(2)})
                    </Typography>
                  }
                />
              </ListItemButton>
            </PointItem>
          ))}
        </List>

        {points.length === 0 && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100px",
              color: "text.secondary",
            }}
          >
            <Typography variant="body2">暂无点位数据</Typography>
          </Box>
        )}
      </Box>
    </StyledDrawer>
  );
};
