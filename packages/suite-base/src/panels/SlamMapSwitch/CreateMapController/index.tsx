/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/restrict-plus-operands */

// src/components/RosLaunchController.tsx

import {
  Button,
  TextField,
  Typography,
  Stack,
  FormControl,
  CircularProgress,
  Alert,
  AlertTitle,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
} from "@mui/material";
import React, { useState, useEffect } from "react";

import {
  startMapCreation,
  CreateMapRequest,
  getMapCreationStatus,
  MapCreationStatus,
} from "../service/api/map"; // 假设的路径

/**
 * @fileoverview RosLaunchController Component
 *
 * This component provides a UI to create a new map and polls for its creation status.
 */

type RosLaunchControllerProps = {
  backendIp: string | null;
};
export const CreateMapController: React.FC<RosLaunchControllerProps> = ({ backendIp }) => {
  const [mapName, setMapName] = useState<string>("");

  const [mapType, setMapType] = useState<string>("2D"); // 默认 '2D'
  const [environment, setEnvironment] = useState<string>("indoor"); // 默认 'indoor'

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // a) 新增状态来管理轮询和显示状态
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [creationStatus, setCreationStatus] = useState<MapCreationStatus | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    // 只有在 isPolling 为 true 并且 backendIp 有效时才启动
    if (isPolling && backendIp) {
      intervalId = setInterval(async () => {
        try {
          // e) 将 backendIp 传递给API调用
          const statusData = await getMapCreationStatus(backendIp);
          setCreationStatus(statusData);

          if (statusData.status === "completed" || statusData.status === "failed") {
            setIsPolling(false);
          }
        } catch (err: unknown) {
          setError("无法获取地图创建状态，轮询已停止。");
          setIsPolling(false);
        }
      }, 5000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPolling, backendIp]); // 依赖数组加入 backendIp
  // 依赖数组，仅在 isPolling 的值改变时重新运行此 effect

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    // f) 增加对 backendIp prop 的校验
    if (!backendIp) {
      setError("后端IP地址未提供，无法发送请求。");
      return;
    }
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setCreationStatus(null); // 重置之前的状态

    if (!mapName.trim() || !mapType.trim()) {
      setError("地图名称和类型不能为空。");
      setIsSubmitting(false);
      return;
    }

    const requestData: CreateMapRequest = { mapName, mapType };

    try {
      // g) 将 backendIp 传递给API调用
      const response = await startMapCreation(backendIp, requestData);
      if (response.ok) {
        setIsPolling(true);
        setError(null);
      } else {
        const errorData = await response.json();
        setError("创建地图失败。" + (errorData.message || "请检查服务器日志以获取更多信息。"));
      }
    } catch (err: unknown) {
      setError("发生网络错误，无法连接到服务器。");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 根据状态返回不同的Alert严重性
  //   const getAlertSeverity = (): "success" | "info" | "warning" | "error" => {
  //     if (!creationStatus) {
  //       return "info";
  //     }
  //     switch (creationStatus.status) {
  //       case "completed":
  //         return "success";
  //       case "failed":
  //         return "error";
  //       case "in_progress":
  //         return "info";
  //       case "pending":
  //         return "warning";
  //       default:
  //         return "info";
  //     }
  //   };
  if (!backendIp) {
    return (
      <Alert severity="error">
        <AlertTitle>配置错误</AlertTitle>
        RosLaunchController 组件需要一个有效的 `backendIp` 属性才能工作。
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack
        spacing={3}
        padding={3}
        style={{ border: "1px solid #ccc", borderRadius: "8px", maxWidth: 500 }}
      >
        <Typography variant="h5" component="h1">
          创建新地图 (目标: {backendIp})
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}
        {/* ... Alert for polling status ... */}

        <FormControl fullWidth>
          <TextField
            label="地图基础名称 (Base Name)"
            variant="outlined"
            value={mapName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setMapName(e.target.value);
            }}
            disabled={isSubmitting || isPolling}
            required
          />
          <FormHelperText>
            最终名称将是: {mapName ? `${mapName}_${environment}` : `(名称)_${environment}`}
          </FormHelperText>
        </FormControl>

        {/* d) 地图类型选择 */}
        <FormControl disabled={isSubmitting || isPolling}>
          <FormLabel>地图类型 (Map Type)</FormLabel>
          <RadioGroup
            row
            aria-labelledby="map-type-radio-group"
            name="map-type-group"
            value={mapType}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setMapType(e.target.value);
            }}
          >
            <FormControlLabel value="2D" control={<Radio />} label="2D" />
            <FormControlLabel value="3D" control={<Radio />} label="3D" />
          </RadioGroup>
        </FormControl>

        {/* e) 环境类型选择 */}
        <FormControl disabled={isSubmitting || isPolling}>
          <FormLabel>环境类型 (Environment)</FormLabel>
          <RadioGroup
            row
            aria-labelledby="environment-radio-group"
            name="environment-group"
            value={environment}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setEnvironment(e.target.value);
            }}
          >
            <FormControlLabel value="indoor" control={<Radio />} label="Indoor" />
            <FormControlLabel value="outdoor" control={<Radio />} label="Outdoor" />
          </RadioGroup>
        </FormControl>

        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting || isPolling}
          >
            {isPolling ? "创建中..." : "开始创建"}
          </Button>
          {isSubmitting && <CircularProgress size={24} />}
        </Stack>
      </Stack>
      {creationStatus && (
        <Alert severity={creationStatus.status === "completed" ? "success" : "info"}>
          <AlertTitle>地图创建状态</AlertTitle>
          当前状态: {creationStatus.status} - {creationStatus.message ?? "无额外信息"}
        </Alert>
      )}
    </form>
  );
};

export default CreateMapController;
