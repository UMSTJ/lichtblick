// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import {
  Box,
  Typography,
  TextField,
  Button,
  Slider,
  Divider,
  Alert,
} from "@mui/material";
import { useState, useEffect } from "react";
import { NewPIDPLOTConfig } from "./config";
import { t } from "i18next";

type PIDParameterPanelProps = {
  config: NewPIDPLOTConfig;
  saveConfig: (config: Partial<NewPIDPLOTConfig>) => void;
};

export const PIDParameterPanel = ({ config, saveConfig }: PIDParameterPanelProps) => {
  const [localParams, setLocalParams] = useState({
    kp: config.pidParameters.kp,
    ki: config.pidParameters.ki,
    kd: config.pidParameters.kd,
  });
  const [rosParameterPrefix, setRosParameterPrefix] = useState(
    config.pidParameters.rosParameterPrefix || "/pid_controller/"
  );
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setLocalParams({
      kp: config.pidParameters.kp,
      ki: config.pidParameters.ki,
      kd: config.pidParameters.kd,
    });
  }, [config.pidParameters]);

  const handleParameterChange = (param: "kp" | "ki" | "kd", value: number) => {
    setLocalParams(prev => ({ ...prev, [param]: value }));
  };

  const handleApplyParameters = () => {
    saveConfig({
      pidParameters: {
        ...config.pidParameters,
        ...localParams,
        rosParameterPrefix,
      },
    });

    // 这里可以添加ROS参数设置逻辑
    console.log("应用PID参数:", localParams);
    console.log("ROS参数前缀:", rosParameterPrefix);
  };

  const handleReadFromROS = () => {
    // 这里可以添加从ROS读取参数的逻辑
    console.log("从ROS读取参数...");
    //TODO: 从ROS读取参数
    setIsConnected(true);
  };

  const handleWriteToROS = () => {
    // 这里可以添加向ROS写入参数的逻辑
    console.log("向ROS写入参数:", localParams);
    //TODO: 向ROS写入参数
  };

  return (
    <Box sx={{ p: 2, height: "100%", overflow: "auto" }}>
      <Typography variant="h6" gutterBottom>
        {t("parameterPanel.title", "PID参数控制")}
      </Typography>

      <Divider sx={{ my: 2 }} />

      {/* ROS连接状态 */}
      <Alert
        severity={isConnected ? "success" : "warning"}
        sx={{ mb: 2 }}
      >
        {isConnected
          ? t("parameterPanel.connected", "已连接到ROS")
          : t("parameterPanel.disconnected", "未连接到ROS")
        }
      </Alert>

      {/* ROS参数前缀设置 */}
      <Typography variant="subtitle2" gutterBottom>
        {t("parameterPanel.rosPrefix", "ROS参数前缀")}
      </Typography>
      <TextField
        fullWidth
        size="small"
        value={rosParameterPrefix}
        onChange={(e) => setRosParameterPrefix(e.target.value)}
        placeholder="/pid_controller/"
        sx={{ mb: 2 }}
      />

      {/* PID参数滑块 */}
      <Typography variant="subtitle2" gutterBottom>
        {t("parameterPanel.pidParameters", "PID参数")}
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          Kp (比例系数): {localParams.kp}
        </Typography>
        <Slider
          value={localParams.kp}
          onChange={(_, value) => handleParameterChange("kp", value as number)}
          min={0}
          max={10}
          step={0.01}
          marks
          valueLabelDisplay="auto"
          sx={{ mb: 1 }}
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          Ki (积分系数): {localParams.ki}
        </Typography>
        <Slider
          value={localParams.ki}
          onChange={(_, value) => handleParameterChange("ki", value as number)}
          min={0}
          max={5}
          step={0.01}
          marks
          valueLabelDisplay="auto"
          sx={{ mb: 1 }}
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          Kd (微分系数): {localParams.kd}
        </Typography>
        <Slider
          value={localParams.kd}
          onChange={(_, value) => handleParameterChange("kd", value as number)}
          min={0}
          max={2}
          step={0.01}
          marks
          valueLabelDisplay="auto"
          sx={{ mb: 1 }}
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* 参数输入框 */}
      <Typography variant="subtitle2" gutterBottom>
        {t("parameterPanel.preciseControl", "精确控制")}
      </Typography>

      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <TextField
          label="Kp"
          type="number"
          size="small"
          value={localParams.kp}
          onChange={(e) => handleParameterChange("kp", parseFloat(e.target.value) || 0)}
          inputProps={{ step: 0.01 }}
        />
        <TextField
          label="Ki"
          type="number"
          size="small"
          value={localParams.ki}
          onChange={(e) => handleParameterChange("ki", parseFloat(e.target.value) || 0)}
          inputProps={{ step: 0.01 }}
        />
        <TextField
          label="Kd"
          type="number"
          size="small"
          value={localParams.kd}
          onChange={(e) => handleParameterChange("kd", parseFloat(e.target.value) || 0)}
          inputProps={{ step: 0.01 }}
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* 操作按钮 */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Button
          variant="contained"
          onClick={handleApplyParameters}
          fullWidth
        >
          {t("parameterPanel.apply", "应用参数")}
        </Button>

        <Button
          variant="outlined"
          onClick={handleReadFromROS}
          fullWidth
        >
          {t("parameterPanel.readFromROS", "从ROS读取")}
        </Button>

        <Button
          variant="outlined"
          onClick={handleWriteToROS}
          fullWidth
        >
          {t("parameterPanel.writeToROS", "写入ROS")}
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* 参数信息 */}
      <Typography variant="subtitle2" gutterBottom>
        {t("parameterPanel.parameterInfo", "参数信息")}
      </Typography>

      <Box sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
        <Typography variant="body2">
          Kp: {rosParameterPrefix}kp = {localParams.kp}
        </Typography>
        <Typography variant="body2">
          Ki: {rosParameterPrefix}ki = {localParams.ki}
        </Typography>
        <Typography variant="body2">
          Kd: {rosParameterPrefix}kd = {localParams.kd}
        </Typography>
      </Box>
    </Box>
  );
};
