// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Typography, List, Button } from "antd";
import { useTranslation } from "react-i18next";

import TextMiddleTruncate from "@lichtblick/suite-base/components/TextMiddleTruncate";
import UdpMessageComponent from "@lichtblick/suite-base/components/UdpMessageComponent";
import { usePlayerSelection } from "@lichtblick/suite-base/context/PlayerSelectionContext";

const { Title } = Typography;

const NewStart = () => {
  const { t } = useTranslation("openDialog");

  const { recentSources, selectRecent } = usePlayerSelection();

  return (
    <div style={{ padding: "40px" }}>
      <Title level={2}>开始</Title>
      {/* <Card title={t("recentDataSources")} style={{ marginBottom: "20px" }}> */}
      <Title level={5}>{t("recentDataSources")}</Title>
      <List
        itemLayout="horizontal"
        dataSource={recentSources.slice(0, 5)}
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

      <Title level={5}>{t("activeClients")}</Title>
      <UdpMessageComponent />
    </div>
  );
};

export default NewStart;
