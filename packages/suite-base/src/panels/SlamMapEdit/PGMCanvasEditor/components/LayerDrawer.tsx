// import {
//   Add24Regular,
//   Delete24Regular,
//   Eye24Regular,
//   EyeOff24Regular,
//   ArrowUp24Regular,
//   ArrowDown24Regular,
//   Layer24Regular,
// } from "@fluentui/react-icons";
// import {
//   Drawer,
//   List,
//   ListItem,
//   ListItemButton,
//   ListItemIcon,
//   ListItemText,
//   IconButton,
//   Box,
//   Typography,
//   Stack,
//   Switch,
//   styled,
// } from "@mui/material";
// import React from "react";
//
// export interface Layer {
//   id: string;
//   name: string;
//   visible: boolean;
//   texture: THREE.DataTexture;
//   selected?: boolean;
//   mesh: THREE.Mesh;
// }
//
// interface LayerDrawerProps {
//   open: boolean;
//   layers: Layer[];
//   selectedLayer?: string;
//   onClose: () => void;
//   onAddLayer: () => void;
//   onDeleteLayer: (id: string) => void;
//   onLayerVisibilityChange: (id: string) => void;
//   onLayerSelect: (id: string) => void;
//   onLayerMove: (id: string, direction: "up" | "down") => void;
// }
//
// const StyledDrawer = styled(Drawer)(({ theme }) => ({
//   "& .MuiDrawer-paper": {
//     width: 280,
//     position: "absolute", // 改为绝对定位
//     height: "calc(100% - 48px)", // 减去 toolbar 的高度
//     top: "48px", // toolbar 的高度
//     borderTop: "1px solid #e0e0e0",
//     backgroundColor: "#f5f5f5",
//     overflow: "hidden",
//   },
//   "& .MuiBackdrop-root": {
//     display: "none", // 移除背景遮罩
//   },
// }));
//
// export const LayerDrawer: React.FC<LayerDrawerProps> = ({
//   open,
//   layers,
//   selectedLayer,
//   onClose,
//   onAddLayer,
//   onDeleteLayer,
//   onLayerVisibilityChange,
//   onLayerSelect,
//   onLayerMove,
// }) => {
//   return (
//     <StyledDrawer
//       variant="persistent"
//       anchor="right"
//       open={open}
//       onClose={onClose}
//       ModalProps={{
//         keepMounted: true, // 保持组件挂载
//       }}
//     >
//       <Box
//         sx={{
//           p: 2,
//           height: "100%",
//           display: "flex",
//           flexDirection: "column",
//         }}
//       >
//         <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
//           <Typography variant="h6" component="div">
//             Layers
//           </Typography>
//           <IconButton onClick={onAddLayer} size="small">
//             <Add24Regular />
//           </IconButton>
//         </Stack>
//
//         <List
//           sx={{
//             width: "100%",
//             flex: 1,
//             overflow: "auto",
//           }}
//         >
//           {layers.map((layer, index) => (
//             <ListItem
//               key={layer.id}
//               disablePadding
//               secondaryAction={
//                 <Stack direction="row" spacing={1}>
//                   <IconButton
//                     edge="end"
//                     onClick={() => {
//                       onLayerVisibilityChange(layer.id);
//                     }}
//                     size="small"
//                   >
//                     {layer.visible ? <Eye24Regular /> : <EyeOff24Regular />}
//                   </IconButton>
//                   <IconButton
//                     edge="end"
//                     onClick={() => {
//                       onDeleteLayer(layer.id);
//                     }}
//                     size="small"
//                   >
//                     <Delete24Regular />
//                   </IconButton>
//                 </Stack>
//               }
//               sx={{
//                 backgroundColor: layer.id === selectedLayer ? "#e3f2fd" : "transparent",
//                 "&:hover": {
//                   backgroundColor: "#e8eaf6",
//                 },
//               }}
//             >
//               <ListItemButton
//                 onClick={() => {
//                   onLayerSelect(layer.id);
//                 }}
//                 dense
//               >
//                 <ListItemIcon>
//                   <Layer24Regular />
//                 </ListItemIcon>
//                 <ListItemText primary={layer.name} />
//               </ListItemButton>
//             </ListItem>
//           ))}
//         </List>
//       </Box>
//     </StyledDrawer>
//   );
// };



import {
  Add24Regular,
  Delete24Regular,
  Eye24Regular,
  EyeOff24Regular,
  ArrowUp24Regular,
  ArrowDown24Regular,
  Layer24Regular,
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
} from "@mui/material";
import React from "react";

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  texture: THREE.DataTexture;
  selected?: boolean;
  mesh: THREE.Mesh;
}

interface LayerDrawerProps {
  open: boolean;
  layers: Layer[];
  selectedLayer?: string;
  onClose: () => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onLayerVisibilityChange: (id: string) => void;
  onLayerSelect: (id: string) => void;
  onLayerMove: (id: string, direction: "up" | "down") => void;
}

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  "& .MuiDrawer-paper": {
    width: 280,
    position: "absolute",
    height: "calc(100% - 48px)",
    top: "48px",
    borderTop: "1px solid #e0e0e0",
    backgroundColor: "#f5f5f5",
    overflow: "hidden",
  },
  "& .MuiBackdrop-root": {
    display: "none",
  },
}));

export const LayerDrawer: React.FC<LayerDrawerProps> = ({
                                                          open,
                                                          layers,
                                                          selectedLayer,
                                                          onClose,
                                                          onAddLayer,
                                                          onDeleteLayer,
                                                          onLayerVisibilityChange,
                                                          onLayerSelect,
                                                          onLayerMove,
                                                        }) => {
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
          <Typography variant="h6">Layers</Typography>
          <IconButton onClick={onAddLayer} size="small">
            <Add24Regular />
          </IconButton>
        </Stack>

        <List sx={{ flex: 1, overflow: "auto" }}>
          {layers.map((layer, index) => (
            <ListItem
              key={layer.id}
              disablePadding
              secondaryAction={
                <Stack direction="row" spacing={1}>
                  <IconButton
                    size="small"
                    onClick={() => onLayerMove(layer.id, 'up')}
                    disabled={index === 0}
                  >
                    <ArrowUp24Regular />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onLayerMove(layer.id, 'down')}
                    disabled={index === layers.length - 1}
                  >
                    <ArrowDown24Regular />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onLayerVisibilityChange(layer.id)}
                  >
                    {layer.visible ? <Eye24Regular /> : <EyeOff24Regular />}
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onDeleteLayer(layer.id)}
                  >
                    <Delete24Regular />
                  </IconButton>
                </Stack>
              }
              sx={{
                backgroundColor:
                  layer.id === selectedLayer ? theme => theme.palette.action.selected : 'transparent',
                '&:hover': { backgroundColor: theme => theme.palette.action.hover },
              }}
            >
              <ListItemButton
                selected={layer.id === selectedLayer}
                onClick={() => onLayerSelect(layer.id)}
                dense
              >
                <ListItemIcon>
                  <Layer24Regular />
                </ListItemIcon>
                <ListItemText primary={layer.name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </StyledDrawer>
  );
};
