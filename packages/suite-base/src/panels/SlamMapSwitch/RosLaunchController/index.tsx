// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  SelectChangeEvent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Modal,
  TextField,
  Checkbox,
  FormControlLabel,
  IconButton,
} from "@mui/material";
import { styled, createTheme, ThemeProvider } from "@mui/material/styles";
import React, { useState, useEffect, useCallback } from "react";
// --- API Helper Function ---
const apiFetch = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);

  const response = await fetch(url, {
    ...options,
    signal: controller.signal,
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return await response.json().catch(() => ({}));
  }
  return {};
};

// --- API Definitions ---
// Schemas
interface LaunchRequest {
  rosPackageName: string;
  launchFilePath: string;
  workspaceSetupScript: string;
  parameters: string[];
  restartOnError: boolean;
}
interface RosProcess {
  id: string;
  name: string;
  status: "running" | "stopped" | "error" | "unknown";
}
interface RosProcessStatus extends RosProcess {
  logs: string[];
}

// == ROS Launch Controller APIs ==
const fetchRosLaunchList = async (backendIp: string): Promise<RosProcess[]> => {
  return await apiFetch(`http://${backendIp}/api/ros/launch/list`);
};
const fetchRosProcessStatus = async (backendIp: string, id: string): Promise<RosProcessStatus> => {
  return await apiFetch(`http://${backendIp}/api/ros/launch/status/${id}`);
};
const stopRosProcess = async (backendIp: string, id: string) =>
  await apiFetch(`http://${backendIp}/api/ros/launch/stop/${id}`, { method: "POST" });
const startRosProcess = async (backendIp: string, data: LaunchRequest) =>
  await apiFetch(`http://${backendIp}/api/ros/launch/start`, {
    method: "POST",
    body: JSON.stringify(data),
  });

// --- Styled Components ---

const ControllerCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius * 2,
  width: "100%",
  maxWidth: "600px",
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2.5),
}));
const HeaderTypography = styled(Typography)(({ theme }) => ({
  flexGrow: 1,
  fontWeight: 500,
  color: theme.palette.primary.main,
}));
const HeaderContainer = styled("div")({
  display: "flex",
  alignItems: "center",
  borderBottom: "2px solid #42a5f5",
  paddingBottom: "8px",
  marginBottom: "8px",
});
//const StatusDisplay = styled(Paper)(({ theme }) => ({ padding: theme.spacing(2, 3), backgroundColor: theme.palette.grey[100], borderLeft: `5px solid ${theme.palette.secondary.main}`, minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }));
const ButtonContainer = styled("div")(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(2),
  marginTop: theme.spacing(1),
}));
const LogContainer = styled("pre")(({ theme }) => ({
  backgroundColor: theme.palette.grey[200],
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  maxHeight: "300px",
  overflowY: "auto",
  color: "#333",
  fontSize: "0.875rem",
}));
const StatusIndicator = styled("span")<{ status: string }>(({ theme, status }) => ({
  width: "12px",
  height: "12px",
  borderRadius: "50%",
  marginRight: theme.spacing(1.5),
  backgroundColor:
    status === "running"
      ? theme.palette.success.main
      : status === "error"
        ? theme.palette.error.main
        : theme.palette.grey[500],
}));
const ModalPaper = styled(Paper)(({ theme }) => ({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 450,
  padding: theme.spacing(4),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
}));

// --- LocationController Component (Collapsed for brevity) ---
interface ControllerProps {
  backendIp: string;
}

// --- NewLaunchModal Component ---
interface NewLaunchModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: LaunchRequest) => Promise<void>;
}
const NewLaunchModal: React.FC<NewLaunchModalProps> = ({ open, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<LaunchRequest>({
    rosPackageName: "",
    launchFilePath: "",
    workspaceSetupScript: "",
    parameters: [""],
    restartOnError: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleParamChange = (index: number, value: string) => {
    const newParams = [...formData.parameters];
    newParams[index] = value;
    setFormData((prev) => ({ ...prev, parameters: newParams }));
  };

  const addParam = () => {
    setFormData((prev) => ({ ...prev, parameters: [...prev.parameters, ""] }));
  };
  const removeParam = (index: number) => {
    setFormData((prev) => ({ ...prev, parameters: prev.parameters.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose(); // Close modal on success
    } catch (error) {
      // Error is handled by the caller, which shows a snackbar.
      // We keep the modal open for the user to correct the data.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalPaper component="form" onSubmit={handleSubmit}>
        <Typography variant="h6">新建 Launch</Typography>
        <TextField
          name="rosPackageName"
          label="ROS 包名"
          value={formData.rosPackageName}
          onChange={handleChange}
          required
          fullWidth
        />
        <TextField
          name="launchFilePath"
          label="Launch 文件路径"
          value={formData.launchFilePath}
          onChange={handleChange}
          required
          fullWidth
        />
        <TextField
          name="workspaceSetupScript"
          label="工作区 Setup 脚本"
          value={formData.workspaceSetupScript}
          onChange={handleChange}
          required
          fullWidth
        />
        <Typography variant="subtitle1">参数</Typography>
        {formData.parameters.map((param, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <TextField
              label={`参数 ${index + 1}`}
              value={param}
              onChange={(e) => {
                handleParamChange(index, e.target.value);
              }}
              fullWidth
            />
            <IconButton
              onClick={() => {
                removeParam(index);
              }}
            >
              <DeleteIcon />
            </IconButton>
          </div>
        ))}
        <Button onClick={addParam} startIcon={<AddIcon />}>
          添加参数
        </Button>
        <FormControlLabel
          control={
            <Checkbox
              name="restartOnError"
              checked={formData.restartOnError}
              onChange={handleChange}
            />
          }
          label="出错时重启"
        />
        <ButtonContainer>
          <Button onClick={onClose} color="secondary">
            取消
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : "提交"}
          </Button>
        </ButtonContainer>
      </ModalPaper>
    </Modal>
  );
};

// --- RosLaunchController Component ---
const RosLaunchController: React.FC<ControllerProps> = ({ backendIp }) => {
  const [processes, setProcesses] = useState<RosProcess[]>([]);
  const [logs, setLogs] = useState<Record<string, string[]>>({});
  const [expanded, setExpanded] = useState<string | false>(false);
  const [loading, setLoading] = useState({ list: true, log: false, stop: "" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const showSnackbar = (message: string, severity: "success" | "error" = "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const refreshList = useCallback(async () => {
    if (!backendIp) {
      return;
    }
    // Don't set list to loading on interval refresh, only on initial load.
    if (!loading.list) {
      setLoading((p) => ({ ...p, list: true }));
    }
    try {
      const data = await fetchRosLaunchList(backendIp);
      setProcesses(data);
    } catch (error) {
      console.error("Failed to fetch ROS launch list:", error);
    } finally {
      setLoading((p) => ({ ...p, list: false }));
    }
  }, [backendIp, loading.list]);

  useEffect(() => {
    refreshList();
    const intervalId = setInterval(refreshList, 20000);
    return () => {
      clearInterval(intervalId);
    };
  }, [refreshList]);

  const handleAccordionChange =
    (panelId: string) => async (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panelId : false);
      if (isExpanded) {
        setLoading((p) => ({ ...p, log: true }));
        try {
          const processDetails = await fetchRosProcessStatus(backendIp, panelId);
          setLogs((prev) => ({ ...prev, [panelId]: processDetails.logs }));
        } catch (error: any) {
          setLogs((prev) => ({ ...prev, [panelId]: [`获取日志失败: ${error.message}`] }));
        } finally {
          setLoading((p) => ({ ...p, log: false }));
        }
      }
    };

  const handleStopProcess = async (id: string) => {
    setLoading((p) => ({ ...p, stop: id }));
    try {
      await stopRosProcess(backendIp, id);
      showSnackbar(`进程 ${id} 已成功发送停止命令。`, "success");
      await refreshList(); // Refresh list immediately after action
    } catch (error: any) {
      showSnackbar(`停止进程失败: ${error.message}`);
    } finally {
      setLoading((p) => ({ ...p, stop: "" }));
    }
  };

  const handleStartProcess = async (data: LaunchRequest) => {
    try {
      await startRosProcess(backendIp, data);
      showSnackbar(`成功创建新 Launch: ${data.launchFilePath}`, "success");
      await refreshList();
    } catch (error: any) {
      showSnackbar(`创建 Launch 失败: ${error.message}`);
      throw error; // Re-throw to keep modal open on error
    }
  };

  return (
    <ControllerCard elevation={3}>
      <HeaderContainer>
        <HeaderTypography variant="h5">ROS 启动管理器</HeaderTypography>
        <Button
          variant="contained"
          size="small"
          onClick={() => {
            setIsModalOpen(true);
          }}
        >
          新建
        </Button>
      </HeaderContainer>
      {loading.list && processes.length === 0 ? (
        <CircularProgress />
      ) : (
        processes.map((proc) => (
          <Accordion
            key={proc.id}
            expanded={expanded === proc.id}
            onChange={handleAccordionChange(proc.id)}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "8px" }}>
                <StatusIndicator status={proc.state} title={proc.state} />
                <Typography sx={{ flexGrow: 1 }}>{proc.launchFile}</Typography>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  disabled={proc.state !== "RUNNING" || loading.stop === proc.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStopProcess(proc.id);
                  }}
                >
                  {loading.stop === proc.id ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    "结束"
                  )}
                </Button>
              </div>
            </AccordionSummary>
            <AccordionDetails>
              {loading.log && expanded === proc.id ? (
                <CircularProgress />
              ) : (
                <LogContainer>
                  <code>{(proc.recentLogs || []).join("\n")}</code>
                </LogContainer>
              )}
            </AccordionDetails>
          </Accordion>
        ))
      )}
      <NewLaunchModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        onSubmit={handleStartProcess}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => {
          setSnackbar((p) => ({ ...p, open: false }));
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => {
            setSnackbar((p) => ({ ...p, open: false }));
          }}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ControllerCard>
  );
};

// --- App Entry Point ---
const theme = createTheme({
  palette: {
    primary: { main: "#1976d2", light: "#42a5f5" },
    secondary: { main: "#dc004e" },
    success: { main: "#2e7d32" },
    error: { main: "#d32f2f" },
  },
});

export default RosLaunchController;
