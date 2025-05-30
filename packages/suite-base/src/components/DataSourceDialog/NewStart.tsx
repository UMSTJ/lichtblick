// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Typography, List, Button, Input } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";

// 假设这些组件已经在你的项目中存在
import TextMiddleTruncate from "@lichtblick/suite-base/components/TextMiddleTruncate";
import UdpMessageComponent from "@lichtblick/suite-base/components/UdpMessage";
import {
  DataSourceArgs,
  usePlayerSelection,
} from "@lichtblick/suite-base/context/PlayerSelectionContext";

const { Title } = Typography;

const NewStart = () => {
  const { t } = useTranslation("openDialog");
  const { selectSource } = usePlayerSelection();
  const [inputIP, setInputIP] = useState("");

  const createNewPlayer = async (ip: string) => {
    const newSourceId = "foxglove-websocket"; // 替换为实际的数据源 ID
    const connectionParams: DataSourceArgs = {
      type: "connection",
      params: {
        url: "ws://" + ip + ":8765", // 替换为实际的 URL
      },
    };

    selectSource(newSourceId, connectionParams);
  };

  // 这个函数用于检测是否在Electron环境中运行
  const isRunningInElectron = () => {
    return window.electron !== undefined || (window.process && window.process.type === "renderer");
  };

  // 假设这些数据和函数在你的应用中已定义
  const { recentSources, selectRecent } = usePlayerSelection();

  //   const selectRecent = (id) => {
  //     console.log(`选择了ID为${id}的源`);
  //     // 这里添加你的选择逻辑
  //   };

  return (
    <div style={{ padding: "40px" }}>
      <Title level={2}>开始</Title>
      {/* <Card title={t("recentDataSources")} style={{ marginBottom: "20px" }}> */}
      <Title level={5}>{t("recentDataSources")}</Title>
      <List
        itemLayout="horizontal"
        dataSource={recentSources.slice(0, 3)}
        renderItem={(recent) => (
          <List.Item key={recent.id} id={recent.id} style={{ padding: 0 }}>
            <Button
              type="text"
              block
              onClick={() => {
                selectRecent(recent.id);
              }}
              style={{
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 16px",
              }}
            >
              <div
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "45%",
                }}
              >
                <TextMiddleTruncate text={recent.label ?? ""} />
              </div>
              <div
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "45%",
                }}
              >
                <TextMiddleTruncate text={recent.title} />
              </div>
            </Button>
          </List.Item>
        )}
      />
      <Button
        onClick={async () => {
          await createNewPlayer("192.168.100.101");
        }}
      >
        连接到轮椅
      </Button>
      {isRunningInElectron() && (
        <>
          <Title level={5}>{t("activeClients")}</Title>
          <UdpMessageComponent />
        </>
      )}
      {/* </Card> */}

      <Title level={5}>手动连接</Title>
      <Input
        placeholder="输入IP地址"
        onChange={(e) => {
          setInputIP(e.target.value);
        }}
      />
      <Button
        type="primary"
        disabled={inputIP === ""}
        style={{ marginTop: "10px" }}
        onClick={async () => {
          await createNewPlayer(inputIP);
        }}
      >
        连接
      </Button>
    </div>
  );
};

export default NewStart;
