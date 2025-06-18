import { ReactElement, useEffect, useRef, useState } from "react";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@lichtblick/suite-base/components/MessagePipeline";
import request from "umi-request";
import { getIpAddress } from "@lichtblick/suite-base/components/AppBar/VerticalAppBar";
import Stack from "@lichtblick/suite-base/components/Stack";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import UdpMessageComponent from "@lichtblick/suite-base/components/UdpMessageComponent";

type ProcessInfo = {
  pid: number;
  command: string;
  cpuUsage: number;
  memoryUsage: number;
  user: string;
};
export default function ProcessSidebar(): ReactElement {
  // Don't run the animation when the sidebar first renders

  const [nowIPAddr, setIPAddr] = useState<string>("");
  const nowIPAddrRef = useRef("");
  const [processInfo, setProcessInfo] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  // 获取进程列表（带定时刷新）
  useEffect(() => {
    const fetchProcesses = async () => {
      try {
        setLoading(true);
        nowIPAddrRef.current = nowIPAddr;
        const response = await request<ProcessInfo[]>(
          "http://${nowIPAddrRef.current}:8080/api/processes",
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          },
        );
        setProcessInfo(response);
      } catch (error) {
        console.error("获取进程列表失败:", error);
      } finally {
        setLoading(false);
      }
    };

    // 立即执行第一次请求
    fetchProcesses();

    // 设置定时器
    intervalRef.current = setInterval(fetchProcesses, 500);

    // 清理函数
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // 空依赖数组表示只在组件挂载/卸载时执行

  // 终止进程
  const handleTerminate = async (pid: number) => {
    try {
      await request(`http://${nowIPAddrRef.current}:8080/api/terminate/${pid}`, {
        method: "POST",
      });
      // 操作成功后刷新列表
      setProcessInfo((prev) => prev.filter((p) => p.pid !== pid));
    } catch (error) {
      console.error(`终止进程 ${pid} 失败:`, error);
    }
  };

  // 杀死进程
  const handleKill = async (pid: number) => {
    try {
      await request(`http://${nowIPAddrRef.current}:8080/api/kill/${pid}`, {
        method: "POST",
      });
      setProcessInfo((prev) => prev.filter((p) => p.pid !== pid));
    } catch (error) {
      console.error(`杀死进程 ${pid} 失败:`, error);
    }
  };

  return (
    <Stack flex="auto" fullWidth overflowX="auto">
      <Card variant="outlined" sx={{ m: 2 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            进程列表
          </Typography>
          <Divider />

          {loading ? (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>PID</TableCell>
                  <TableCell>命令</TableCell>
                  <TableCell align="right">CPU 使用率</TableCell>
                  <TableCell align="right">内存使用率</TableCell>
                  <TableCell>用户</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {processInfo.map((process) => (
                  <TableRow key={process.pid}>
                    <TableCell>{process.pid}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>{process.command}</TableCell>
                    <TableCell align="right">{process.cpuUsage.toFixed(1)}%</TableCell>
                    <TableCell align="right">{process.memoryUsage.toFixed(1)}%</TableCell>
                    <TableCell>{process.user}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          variant="contained"
                          color="warning"
                          size="small"
                          onClick={() => handleTerminate(process.pid)}
                          sx={{ textTransform: "none" }}
                        >
                          终止
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          onClick={() => handleKill(process.pid)}
                          sx={{ textTransform: "none" }}
                        >
                          杀死
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>
      </Card>
    </Stack>
  );
}
