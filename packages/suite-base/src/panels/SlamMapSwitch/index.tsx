// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Tab, Tabs } from "@mui/material";
import React, { useEffect, useState } from "react";

import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import Panel from "@lichtblick/suite-base/components/Panel";
import PanelToolbar from "@lichtblick/suite-base/components/PanelToolbar";
import Stack from "@lichtblick/suite-base/components/Stack";
import LocationController from "@lichtblick/suite-base/panels/SlamMapSwitch/LocationController";
import RosLaunchController from "@lichtblick/suite-base/panels/SlamMapSwitch/RosLaunchController";

const selectPlayerName = (ctx: MessagePipelineContext) => ctx.playerState.name;
const AutoBase: React.FC = () => {
  const playerName = useMessagePipeline(selectPlayerName);
  const [ipAddr, setIpAddr] = useState("");
  const [tabValue, setTabValue] = useState(0);
  useEffect(() => {
    if (playerName == undefined) {
      return;
    }
    const currentIp = getIpAddress(playerName);
    setIpAddr(currentIp);
  }, [playerName, setIpAddr]);
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getIpAddress = (name: string): string => {
    if (!name) {
      return "";
    }

    // 移除 "ws://" 前缀（如果存在）
    let addressPart = name.startsWith("ws://") ? name.substring(5) : name;

    // 只取第一个空格之前的部分 (例如 "10.51.129.39:8765" 或 "10.51.129.39")
    const firstSpaceIndex = addressPart.indexOf(" ");
    if (firstSpaceIndex !== -1) {
      addressPart = addressPart.substring(0, firstSpaceIndex);
    }

    // 现在 addressPart 类似于 "10.51.129.39:8765" 或 "10.51.129.39" 或 "[::1]:8000"
    // 我们需要提取主机部分
    let host = addressPart; // 如果找不到端口或格式不符合预期，则默认为整个字符串
    host = host.split(":")[0] ?? "";
    // 如果不是数字端口（例如，冒号是 IPv6 地址的一部分，如 "[::1]"），则 host 保持为 addressPart
    // 附加新的固定端口
    return `${host}:9000`;
  };

  return (
    <Stack fullHeight>
      <PanelToolbar />
      <Stack
        flex="auto"
        alignItems="center"
        justifyContent="center"
        fullHeight
        gap={2}
        paddingX={3}
      >
        <Tabs value={tabValue} centered onChange={handleTabChange} aria-label="device tables">
          <Tab label="地图切换" />
          <Tab label="系统状态" />
          {/* <Tab label="红绿灯调试" /> */}
        </Tabs>
        {tabValue === 0 && <LocationController backendIp={ipAddr} />}
        {tabValue === 1 && <RosLaunchController backendIp={ipAddr} />}
      </Stack>
    </Stack>
  );
};

export default Panel(
  Object.assign(React.memo(AutoBase), {
    panelType: "autobase",
    defaultConfig: {
      // Example: Default props that the Panel HOC might use
      // initialControlMode: ControlMode.AUTO_NAV,
      // initialBatteryLevel: 100,
    },
  }),
);
