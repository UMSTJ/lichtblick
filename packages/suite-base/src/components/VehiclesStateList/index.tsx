import { getIpAddress } from "@lichtblick/suite-base/components/AppBar/VerticalAppBar";
// import { isRunningInElectron } from "@lichtblick/suite-base/components/DataSourceDialog/Start";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import Stack from "@lichtblick/suite-base/components/Stack";
import UdpMessageComponent from "@lichtblick/suite-base/components/UdpMessage";
import { Box, Button, Card, Divider, Typography } from "@mui/material";
import * as _ from "lodash-es";
import { useRef, ReactElement, useEffect, useState } from "react";
import request from "umi-request";

const ANIMATION_RESET_DELAY_MS = 1500;

type SystemInfo = {
  rosId: string;
  ip: string;
  version: string;
  ubuntuVersion: string;
};
// 修改后的正确类型
type HardwareInfo = {
  timestamp: number;
  cpu: {
    percent: number;
    freq_mhz: number;
    temp_c: number;
    count: {
      physical: number;
      logical: number;
    };
  };
  memory: {
    total_gb: number;
    used_gb: number;
    percent: number;
  };
  swap: {
    total_gb: number;
    used_gb: number;
    percent: number;
  };
  disk: DiskInfo[];
  network: {
    bytes_sent_mb: number;
    bytes_recv_mb: number;
  };
  load_avg: {
    min1: number;
    min5: number;
    min15: number;
  };
};

// 注意：删除原类型中多余的嵌套层级
type DiskInfo = {
  device: string;
  mountpoint: string;
  fstype: string;
  total_gb: number;
  used_gb: number;
  free_gb: number;
  pecent: number;
}
export default function VehiclesStateList(): ReactElement {
  // Don't run the animation when the sidebar first renders
  const skipAnimation = useRef<boolean>(true);
  const selectPlayerName = (ctx: MessagePipelineContext) => ctx.playerState.name;

  const playerName = useMessagePipeline(selectPlayerName);
  const [nowIPAddr, setIPAddr] = useState<string>("");
  const nowIPAddrRef = useRef("");
  // const [codeOnlineState, setCodeOnlineState] = useState<boolean>(false);

  const [sysInfo, setSysInfo] = useState<SystemInfo>({ rosId: "", ip: "", version: "" , ubuntuVersion: ""});
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo | null>(null);

  // 修改后的 useEffect 逻辑
  useEffect(() => {
    nowIPAddrRef.current = nowIPAddr;

    let intervalId: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        const response = await request<HardwareInfo>( // 添加泛型类型
          `http://${nowIPAddrRef.current}:8080/api/hardware_info`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            timeout: 3000
          }
        );
        setHardwareInfo(response);
      } catch (error) {
        console.error("请求失败:", error);
        setHardwareInfo(null); // 清除无效数据
      }
    };

    if (nowIPAddr) {
      fetchData();
      intervalId = setInterval(fetchData, 500);
    }

    return () => {
      intervalId && clearInterval(intervalId);
    };
  }, [nowIPAddr]);
  useEffect(() => {
    console.log("playerName: ", playerName);
    if (playerName != undefined) {
      const currentIp = getIpAddress(playerName);
      if (currentIp != undefined) {
        setIPAddr(currentIp + "");
        // setCodeOnlineState(true);
      }
    }
  }, [playerName]);

  useEffect(() => {
    const timeoutId = setTimeout(() => (skipAnimation.current = false), ANIMATION_RESET_DELAY_MS);
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);
  const getSystemInfo = async () => {
    try {
      const response = await request("http://${nowIPAddrRef.current}:8080/api/sysmessage", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("Response:", response);
      if (response) {
        setSysInfo(response);
      }
    } catch (error) {
      //   message.error("Failed to update light" + error);
      console.error("Request failed:", error);
    }
  };
  useEffect(() => {

    if (nowIPAddr) getSystemInfo();
  }, [nowIPAddr]);
  return (
    <Stack flex="auto" fullWidth overflowX="auto">
      {/*{isRunningInElectron() && (*/}
      {(
        <Card variant="outlined">
          <Box sx={{ p: 2 }}>
            <Stack direction="row">
              <Typography gutterBottom variant="h6" component="div">
                在线设备切换
              </Typography>
            </Stack>
          </Box>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Typography gutterBottom variant="body2">
              当前活跃
            </Typography>

            <>
              <UdpMessageComponent />
            </>
          </Box>
        </Card>
      )}
      {/*{codeOnlineState && (*/}
      {(
        <Card variant="outlined">
          <Box sx={{ p: 2 }}>
            <Stack direction="row">
              <Typography gutterBottom variant="h6" component="div">
                当前设备状态
              </Typography>
            </Stack>
          </Box>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Typography gutterBottom variant="body2">
              软件版本：{sysInfo.version}
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Typography gutterBottom variant="body2">
              系统版本：{sysInfo.ubuntuVersion}
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Typography gutterBottom variant="body2">
              ROSID: {sysInfo.rosId}
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Typography gutterBottom variant="body2">
              IP地址：{sysInfo.ip}
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            软件更新
            <Button
            onClick={getSystemInfo}>检查更新</Button>
          </Box>
        </Card>
      )}

      {/* 新增硬件信息展示 */}
      {hardwareInfo && (
        <Card variant="outlined" sx={{ mt: 2 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              硬件状态
            </Typography>
            <Divider sx={{ my: 2 }} />

            {/* CPU 信息 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1">CPU</Typography>
              <Typography variant="body2">
                使用率: {hardwareInfo.cpu?.percent?.toFixed(1)}%
              </Typography>
              <Typography variant="body2">
                频率: {hardwareInfo.cpu?.freq_mhz} MHz
              </Typography>
              <Typography variant="body2">
                温度: {hardwareInfo.cpu?.temp_c}°C
              </Typography>
            </Box>

            {/* 内存 & 交换空间 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1">内存</Typography>
              <Typography variant="body2">
                总内存: {hardwareInfo.memory?.total_gb?.toFixed(2)} GB
              </Typography>
              <Typography variant="body2">
                已用: {hardwareInfo.memory?.used_gb?.toFixed(2)} GB (
                {hardwareInfo.memory?.percent?.toFixed(1)}%)
              </Typography>

              <Typography variant="subtitle1" sx={{ mt: 2 }}>
                交换空间
              </Typography>
              <Typography variant="body2">
                已用: {hardwareInfo.swap?.used_gb?.toFixed(2)} GB (
                {hardwareInfo.swap?.percent?.toFixed(1)}%)
              </Typography>
            </Box>

            {/* 磁盘信息 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1">磁盘</Typography>
              {hardwareInfo.disk?.map((disk, index) => (
                <Box key={index} sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    {disk.mountpoint} ({disk.device})
                  </Typography>
                  <Typography variant="body2">
                    已用: {disk.used_gb?.toFixed(2)} GB / {disk.total_gb?.toFixed(2)} GB (
                    {disk.pecent?.toFixed(1)}%)
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* 网络 & 负载 */}
            <Box>
              <Typography variant="subtitle1">网络</Typography>
              <Typography variant="body2">
                上传: {hardwareInfo.network?.bytes_sent_mb?.toFixed(2)} MB
              </Typography>
              <Typography variant="body2">
                下载: {hardwareInfo.network?.bytes_recv_mb?.toFixed(2)} MB
              </Typography>

              <Typography variant="subtitle1" sx={{ mt: 2 }}>
                系统负载
              </Typography>
              <Typography variant="body2">
                1分钟: {hardwareInfo.load_avg?.min1?.toFixed(2)}
              </Typography>
              <Typography variant="body2">
                5分钟: {hardwareInfo.load_avg?.min5?.toFixed(2)}
              </Typography>
              <Typography variant="body2">
                15分钟: {hardwareInfo.load_avg?.min15?.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </Card>
      )}
    </Stack>
  );
}
