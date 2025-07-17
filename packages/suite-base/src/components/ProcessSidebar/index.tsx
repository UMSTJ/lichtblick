import { ReactElement, useEffect, useRef, useState } from "react";
import request from "umi-request";
import Stack from "@lichtblick/suite-base/components/Stack";
import {
  Box,
  Card,
  // CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  // List,
  // ListItem,
  // ListItemText,
  // Paper,
  Table,
  TableBody,
  TableCell,
  // TableContainer,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";

type ProcessInfo = {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: string;
};

export default function ProcessSidebar(): ReactElement {
  const [nowIPAddr] = useState<string>("");
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
            headers: { "Content-Type": "application/json" }
          }
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
        method: "POST"
      });
      // 操作成功后刷新列表
      setProcessInfo(prev => prev.filter(p => p.pid !== pid));
    } catch (error) {
      console.error(`终止进程 ${pid} 失败:`, error);
    }
  };

  // 杀死进程
  const handleKill = async (pid: number) => {
    try {
      await request(`http://${nowIPAddrRef.current}:8080/api/kill/${pid}`, {
        method: "POST"
      });
      setProcessInfo(prev => prev.filter(p => p.pid !== pid));
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
            <Box sx={{ p: 2, textAlign: 'center' }}>
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
                    <TableCell sx={{ maxWidth: 200 }}>{process.name}</TableCell>
                    <TableCell align="right">{process.cpu.toFixed(1)}%</TableCell>
                    <TableCell align="right">{process.memory.toFixed(1)}%</TableCell>
                    <TableCell>{process.status}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          color="warning"
                          size="small"
                          onClick={() => handleTerminate(process.pid)}
                        >
                          <Chip label="终止" />
                        </IconButton>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleKill(process.pid)}
                        >
                          <Chip label="杀死" />
                        </IconButton>
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
