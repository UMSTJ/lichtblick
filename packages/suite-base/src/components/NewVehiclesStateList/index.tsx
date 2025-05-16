import { getIpAddress } from "@lichtblick/suite-base/components/AppBar/VerticalAppBar";
import { isRunningInElectron } from "@lichtblick/suite-base/components/DataSourceDialog/Start";
import {
  MessagePipelineContext,
  useMessagePipeline, useMessagePipelineSubscribe
} from "@lichtblick/suite-base/components/MessagePipeline";
import Stack from "@lichtblick/suite-base/components/Stack";

import { Box, Button, Card, Divider, Typography } from "@mui/material";
import * as _ from "lodash-es";
import { useRef, ReactElement, useEffect, useState } from "react";
import request from "umi-request";
import { useMessageDataItem } from "../MessagePathSyntax/useMessageDataItem";

const ANIMATION_RESET_DELAY_MS = 1500;

type SystemInfo = {
  rosId: string;
  ip: string;
  version: string;
};
type driveStatus = {
  power: number;
  speed: number;
  angle: number;
}
export default function NewVehiclesStateList(): ReactElement {
  // Don't run the animation when the sidebar first renders
  const skipAnimation = useRef<boolean>(true);
  const selectPlayerName = (ctx: MessagePipelineContext) => ctx.playerState?.name ?? "192.168.31.1";
  const [codeOnlineState, setCodeOnlineState] = useState<boolean>(false);
  const playerName = useMessagePipeline(selectPlayerName);
  const [nowIPAddr, setIPAddr] = useState<string>("");

  const [ driveStatus, setDriveStatus] = useState<driveStatus>({ power: 0, speed: 0, angle: 0});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    console.log("playerName: ", playerName);
    if (playerName != undefined) {
      const currentIp = getIpAddress(playerName);
      if (currentIp != undefined) {
        setIPAddr(currentIp + "");
        setCodeOnlineState(true);
      }
    }
  }, [playerName]);


  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)

    // 原点
    const ox = W / 2
    const oy = H / 2
    // 轴长
    const len = 80
    const arrowSize = 8

    // → X 轴（正方向）
    ctx.beginPath()
    ctx.moveTo(ox, oy)
    ctx.lineTo(ox + len, oy)
    ctx.stroke()
    // 箭头
    ctx.beginPath()
    ctx.moveTo(ox + len, oy)
    ctx.lineTo(ox + len - arrowSize, oy - arrowSize / 2)
    ctx.lineTo(ox + len - arrowSize, oy + arrowSize / 2)
    ctx.closePath()
    ctx.fill()

    // ↑ Y 轴（正方向——向上）
    ctx.beginPath()
    ctx.moveTo(ox, oy)
    ctx.lineTo(ox, oy - len)
    ctx.stroke()
    // 箭头
    ctx.beginPath()
    ctx.moveTo(ox, oy - len)
    ctx.lineTo(ox - arrowSize / 2, oy - len + arrowSize)
    ctx.lineTo(ox + arrowSize / 2, oy - len + arrowSize)
    ctx.closePath()
    ctx.fill()

    // ↗ Z 轴（正方向——斜上）
    // 这里我们让 Z 轴终点再偏正向一段 dx, dy
    const dx = len * Math.cos(Math.PI / 4)
    const dy = len * Math.sin(Math.PI / 4)
    // 修正这里：终点改为 ox + dx, oy + dy
    const zx = ox - dx;
    const zy = oy + dy;

    ctx.beginPath()
    ctx.moveTo(ox, oy)
    ctx.lineTo(zx, zy)
    ctx.stroke()
    // 箭头
    ctx.beginPath()
    // 反向单位向量
    const ux = (ox - zx) / len, uy = (oy - zy) / len
    // 垂直向量
    const px = -uy, py = ux
    ctx.moveTo(zx, zy)
    ctx.lineTo(
      zx + ux * arrowSize + px * (arrowSize / 2),
      zy + uy * arrowSize + py * (arrowSize / 2),
    )
    ctx.lineTo(
      zx + ux * arrowSize - px * (arrowSize / 2),
      zy + uy * arrowSize - py * (arrowSize / 2),
    )
    ctx.closePath()
    ctx.fill()

    // 画立方体：正方形边长 60，中心在画布中心
    const s = 60
    const frontX = ox - s / 2
    const frontY = oy + s / 2
    ctx.beginPath()
    // 前面
    ctx.rect(frontX, frontY - s, s, s)
    ctx.stroke()

    // 后面顶面
    ctx.beginPath()
    ctx.moveTo(frontX, frontY - s)
    ctx.lineTo(frontX + 20, frontY - s - 20)
    ctx.lineTo(frontX + 20 + s, frontY - s - 20)
    ctx.lineTo(frontX + s, frontY - s)
    ctx.closePath()
    ctx.stroke()

    // 侧面连边
    ctx.beginPath()
    ctx.moveTo(frontX + s, frontY)
    ctx.lineTo(frontX + s + 20, frontY - 20)
    ctx.moveTo(frontX, frontY - s)
    ctx.lineTo(frontX + 20, frontY - s - 20)
    ctx.stroke()

    // …前面、顶面、连边都画完之后，补上右侧的竖边：
    ctx.beginPath()
    ctx.moveTo(frontX + s + 20, frontY - s - 20)  // 后面右上角
    ctx.lineTo(frontX + s + 20, frontY - 20)      // 后面右下角
    ctx.stroke()


  }, [driveStatus])


  useEffect(() => {
    const timeoutId = setTimeout(() => (skipAnimation.current = false), ANIMATION_RESET_DELAY_MS);
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);
  useMessageDataItem("/battery_state")
  useMessageDataItem("/odom")
  // 订阅硬件信息主题
  // const Messages = useMessagePipeline(ctx=>ctx);
  // console.log("Messages: ", Messages)
  const battaryData = useMessageDataItem("/battery_state")
  const odomData = useMessageDataItem("/odom")
  // console.log("battaryData: ", battaryData)
  // console.log("odomData: ", odomData)
  // useEffect(() => {
  //   if (battaryData.length > 0) {
  //     const battaryinfo = battaryData[battaryData.length - 1] as {
  //       queriedData: {
  //         value: {
  //           percentage: number
  //         }
  //       }[];
  //     };
  //     if(odomData.length > 0){
  //       const odominfo = odomData[odomData.length - 1] as {
  //         queriedData: {
  //           value: {
  //             twist: {
  //               twist: {
  //                 linear: {
  //                   x: number
  //                 },
  //                 angular: {
  //                   z: number
  //                 }
  //               }
  //             }
  //           }
  //         }[];
  //       };
  //       setDriveStatus({
  //         power: battaryinfo.queriedData[0]?.value.percentage ?? 0,
  //         angle: odominfo.queriedData[0]?.value.twist.twist.angular.z ?? 0,
  //         speed: odominfo.queriedData[0]?.value.twist.twist.linear.x ?? 0,
  //       })
  //     }
  //
  //   } else {
  //
  //   }
  // }, [battaryData,odomData]);
  const dataRef = useRef({ battaryData, odomData });

  useEffect(() => {
    dataRef.current = { battaryData, odomData };
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const { battaryData, odomData } = dataRef.current;
      // 使用可选链操作符简化代码
      const latestBattery = battaryData[battaryData.length - 1];
      const latestOdom = odomData[odomData.length - 1];

      setDriveStatus({
        power: latestBattery?.queriedData[0]?.value.percentage ?? 0,
        angle: latestOdom?.queriedData[0]?.value.twist.twist.angular.z ?? 0,
        speed: latestOdom?.queriedData[0]?.value.twist.twist.linear.x ?? 0,
      });
    }, 500);
    return () => clearInterval(interval);
  }, []); // 空依赖数组表示只运行一次
  return (
    <Stack flex="auto" fullWidth overflowX="auto">
      {/*{isRunningInElectron() && (*/}
      {(
        <Card variant="outlined">
        <Box sx={{ p: 2 }}>
          <Typography variant="h6">车辆行驶状态</Typography>
        </Box>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Stack>
            <Typography>电量：{driveStatus.power}%</Typography>
            <Typography>当前速度：{driveStatus.speed} cm/s</Typography>
            <Typography>当前转角：{driveStatus.angle} rad</Typography>
          </Stack>
        </Box>
        <Divider />
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <canvas
            ref={canvasRef}
            width={200}
            height={200}

          />
        </Box>
        </Card>
      )}
    </Stack>
  );
}
