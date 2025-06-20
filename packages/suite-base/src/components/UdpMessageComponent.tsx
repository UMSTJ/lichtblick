// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Button, List, ListItem } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { listen, Event as TauriEvent } from "@tauri-apps/api/event"; // Tauri 事件监听
import { IpcRendererEvent } from "electron"; // 导入正确的类型定义
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import TextMiddleTruncate from "@lichtblick/suite-base/components/TextMiddleTruncate";
import {
  DataSourceArgs,
  usePlayerSelection,
} from "@lichtblick/suite-base/context/PlayerSelectionContext";
import { ElectronAPI } from "@lichtblick/suite-desktop/src/preload"; // 确保正确导入 ElectronAPI

// 声明 Electron API 类型
declare global {
  interface Window {
    shell2: {
      openExternal: (url: string) => Promise<void>;
    };
    electron: ElectronAPI;
    __TAURI__?: {
      tauri: {
        invoke: (cmd: string, args?: any) => Promise<any>;
      };
      shell: {
        open: (url: string) => Promise<void>;
      };
      // Add other Tauri APIs if needed
    };
  }
}

async function startUdp(port: string) {
  try {
    await invoke("start_udp_listener", { port: parseInt(port, 10) });
    console.log(`UDP 监听器已在端口 ${port} 启动`);
  } catch (error) {
    console.error("启动 UDP 监听器失败:", error);
  }
}

export const openCode = (ip: string) => {
  window.electron.shell2
    .openExternal("http://" + ip + ":8080")
    .then(() => {
      console.log("Opened Google in the default browser.");
    })
    .catch((err) => {
      console.error("Failed to open Google in the default browser:", err);
    });
};

const isTauriEnvironment = (): boolean => {
  return true;
};
const UdpMessageComponent: React.FC = () => {
  const [udpIp, setUdpIp] = useState<string[]>([]);
  const { selectSource } = usePlayerSelection();

  const { t } = useTranslation("openDialog");

  useEffect(() => {
    let unlistenTauri: (() => void) | undefined;
    console.log("UdpMessageComponent useEffect - Checking environment...");

    if (isTauriEnvironment()) {
      // Tauri 环境
      const setupTauriListener = async () => {
        try {
          await startUdp("9999");
          // 将 listen 返回的函数赋值给 unlistenTauri
          unlistenTauri = await listen("udp_message_received", (event: TauriEvent<any>) => {
            // 假设 payload 结构为 { data: string, sourceAddress: string }
            // sourceAddress 可能包含 IP 和端口，例如 "192.168.1.100:12345"
            // 我们需要从中提取 IP 地址
            const rawSourceAddress = event.payload?.sourceAddress || event.payload?.data; // 根据实际情况选择

            if (rawSourceAddress && typeof rawSourceAddress === "string") {
              const ipAddress = rawSourceAddress.split(":")[0];
              if (ipAddress === "undefined" || ipAddress === "" || ipAddress == null) {
                return;
              } // 提取 IP 地址

              // 使用回调函数形式的 setState 来确保基于最新的状态进行判断
              setUdpIp((prevUdpIp) => {
                if (prevUdpIp.includes(ipAddress)) {
                  console.log(
                    "UDP message1 (IP already exists):",
                    ipAddress,
                    "Current IPs:",
                    prevUdpIp,
                  );
                  return prevUdpIp; // IP 已存在，不更新状态
                } else {
                  console.log("Received new UDP message (IP):", ipAddress, "Adding to:", prevUdpIp);
                  return [...prevUdpIp, ipAddress]; // 添加新的 IP
                }
              });
            }
          });
        } catch (error) {
          console.error("Failed to set up Tauri UDP listener:", error);
        }
      };
      void setupTauriListener();
    } else if (window.electron.ipcRenderer) {
      // Electron 环境
      const handleUdpMessage = (_event: IpcRendererEvent, message: string) => {
        // Electron 环境也可能需要从 message 中提取纯 IP
        const ipAddress = message.split(":")[0];
        if (ipAddress === "undefined" || ipAddress === "" || ipAddress == null) {
          return;
        }
        setUdpIp((prevUdpIp) => {
          if (prevUdpIp.includes(ipAddress)) {
            return prevUdpIp;
          }
          return [...prevUdpIp, ipAddress];
        });
      };
      window.electron.ipcRenderer.on("udp-message", handleUdpMessage);

      return () => {
        window.electron.ipcRenderer.removeAllListeners("udp-message");
      };
    } else {
      console.warn("No suitable IPC mechanism (Tauri or Electron) found for UDP messages.");
    }

    return () => {
      if (unlistenTauri) {
        unlistenTauri();
        //invoke("stop_udp_listener"); // 停止 Tauri 的 UDP 监听器
        // 可以选择在这里调用 stop_udp_listener
        // if (tauriInvoke) {
        //   tauriInvoke('stop_udp_listener').catch(console.error);
        // }
      }
    };
  }, [udpIp]);

  const createNewPlayer = async (ip: string) => {
    const newSourceId = "foxglove-websocket"; // 替换为实际的数据源 ID
    const connectionParams: DataSourceArgs = {
      type: "connection",
      params: {
        url: "ws://" + ip + ":8765", // 替换为实际的 URL
      },
    };

    try {
      await selectSource(newSourceId, connectionParams);
    } catch (error) {
      console.error("Failed to select source for new player:", error);
    }
  };

  return (
    <div>
      <List disablePadding>
        {udpIp.map((message, index) => (
          <ListItem disablePadding key={index}>
            <TextMiddleTruncate text={message} />

            <Button
              onClick={() => {
                openCode(message);
              }}
            >
              {t("open")} Code
            </Button>
            <Button
              onClick={async () => {
                await createNewPlayer(message);
              }}
            >
              {t("openConnection")}
            </Button>
          </ListItem>
        ))}
      </List>
    </div>
  );
};

export default UdpMessageComponent;
