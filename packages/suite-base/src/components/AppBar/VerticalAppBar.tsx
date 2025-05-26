// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  Code24Regular,
  AppsAddIn24Regular,
  ContentSettings24Regular,
  NotebookQuestionMark24Regular
} from "@fluentui/react-icons";
import { Layout } from "antd";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AddPanelMenu } from "@lichtblick/suite-base/components/AppBar/AddPanelMenu";
import AppBarButton from "@lichtblick/suite-base/components/AppBar/AppBarButton";
import { DataSource } from "@lichtblick/suite-base/components/AppBar/DataSource";
import { isRunningInElectron } from "@lichtblick/suite-base/components/DataSourceDialog/Start";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import { openCode } from "@lichtblick/suite-base/components/UdpMessage";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";
import React from "react";
import { Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import path from "path";
const { Sider } = Layout;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const getIpAddress = (name?: string) => {
  if (!name) {
    return undefined;
  }
  const ipRegex = /(\d{1,3}\.){3}\d{1,3}/g;

  // 使用正则表达式匹配 IP 地址

  const ipAddresses = name.match(ipRegex);

  if (ipAddresses) {
    return ipAddresses;
  } else {
    return undefined;
  }
};
const VerticalAppBar: React.FC = () => {
  // const selectLeftSidebarOpen = (store: WorkspaceContextStore) => store.sidebars.left.open;
  // const selectRightSidebarOpen = (store: WorkspaceContextStore) => store.sidebars.right.open;

  const selectPlayerName = (ctx: MessagePipelineContext) => ctx.playerState.name;
  // const { sidebarActions } = useWorkspaceActions();
  const { dialogActions } = useWorkspaceActions();
  const { t } = useTranslation("appBar");
  // const leftSidebarOpen = useWorkspaceStore(selectLeftSidebarOpen);
  // const rightSidebarOpen = useWorkspaceStore(selectRightSidebarOpen);
  const [panelAnchorEl, setPanelAnchorEl] = useState<undefined | HTMLElement>(undefined);
  const panelMenuOpen = Boolean(panelAnchorEl);
  const playerName = useMessagePipeline(selectPlayerName);
  const [nowIPAddr, setIPAddr] = useState<string>("");
  const [codeOnlineState, setCodeOnlineState] = useState<boolean>(false);
  const [openManual, setOpenManual] = React.useState(false);
  const [manualPath, setManualPath] = useState("");

// 在 useEffect 中动态拼接绝对路径
  useEffect(() => {
    if (window?.electron?.process?.resourcesPath) {
      const pdfPath = path.join(window.electron.process.resourcesPath, "usermanual.pdf");
      const fileUrl = `file://${pdfPath.replace(/\\/g, "/")}`; // 👈 注意 Windows 路径分隔符
      setManualPath(fileUrl);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line no-restricted-syntax

    if (playerName != undefined) {
      const currentIp = getIpAddress(playerName);
      if (currentIp != undefined) {
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        setIPAddr(currentIp + "");
        setCodeOnlineState(true);
      }
    }
  }, [playerName]);

  return (
    <Sider
      width={60}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        height: "100vh",
        zIndex: 9999,
        // backdropFilter: "blur(10px)",
        boxShadow: "0 0 5px rgba(0, 0, 0, 0.25)",
      }}
    >
      <div>
        <div
          style={{
            position: "absolute",
            top: 40,
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <DataSource />
        </div>
        <div
          style={{
            position: "absolute",
            top: 30 + 40 + 20 + 20,
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <AppBarButton
            icon={<AppsAddIn24Regular />}
            onClick={(event) => {
              setPanelAnchorEl(event.currentTarget);
            }}
            text={t("panels")}
          ></AppBarButton>

          {/* <Button
            type="text"
            icon={<AppstoreAddOutlined rev={undefined} />}
            onClick={(event) => {
              setPanelAnchorEl(event.currentTarget);
            }}
          /> */}
        </div>
        {/* <div
          style={{
            position: "absolute",
            top: 30 + 40 + 40 + 32 + 20 + 10,
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <Button
            type="text"
            // type="primary"
            icon={leftSidebarOpen ? <PanelLeft24Filled /> : <PanelLeft24Regular />}
            onClick={() => sidebarActions.left.setOpen(!leftSidebarOpen)}
          />
        </div>
        <div
          style={{
            position: "absolute",
            top: 30 + 40 + 40 + 32 + 20 + 10 + 40,
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <Button
            type="text"
            // type="primary"
            icon={rightSidebarOpen ? <PanelRight24Filled /> : <PanelRight24Regular />}
            onClick={() => sidebarActions.right.setOpen(!rightSidebarOpen)}
          />
        </div> */}

        <div
          style={{
            position: "absolute",
            top: 30 + 10 + 40 + 32 + 20 + 20 + 20 + 20,
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <AppBarButton
            icon={<Code24Regular />}
            disabled={!codeOnlineState}
            onClick={() => {
              if (isRunningInElectron()) {
                openCode(nowIPAddr);
              } else {
                window.open("http://" + nowIPAddr + ":8080");
              }
            }}
            text="Code"
          ></AppBarButton>

        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <AppBarButton
          icon={<ContentSettings24Regular />}
          onClick={() => {
            dialogActions.preferences.open("general");
          }}
          text={t("general")}
        ></AppBarButton>
        <AppBarButton
          icon={<NotebookQuestionMark24Regular />}
          onClick={() => setOpenManual(true)}
          text={t("usermanual")}
        ></AppBarButton>
        <Dialog
          fullWidth
          maxWidth="lg"
          open={openManual}
          onClose={() => setOpenManual(false)}
        >
          <DialogTitle sx={{ m: 0, p: 2 }}>
            {t("usermanual")}
            <IconButton
              aria-label="close"
              onClick={() => setOpenManual(false)}
              sx={{
                position: "absolute",
                right: 8,
                top: 8,
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers sx={{ height: "80vh", p: 0 }}>
            <iframe
              src={manualPath}
              title="User Manual"
              width="100%"
              height="100%"
              style={{ border: "none" }}
            />
          </DialogContent>
        </Dialog>
        {/* <Button
          type="text"
          // type="primary"
          block
          onClick={() => dialogActions.preferences.open("general")}
        >
          <SettingFilled rev={undefined} />
          <div>设置</div>
        </Button> */}
      </div>
      <AddPanelMenu
        anchorEl={panelAnchorEl}
        open={panelMenuOpen}
        handleClose={() => {
          setPanelAnchorEl(undefined);
        }}
      />
    </Sider>
  );
};

export default VerticalAppBar;
