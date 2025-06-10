// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

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
} from "@mui/material";
import { styled, createTheme, ThemeProvider } from "@mui/material/styles";
import React, { useState, useEffect, useCallback } from "react";

// --- API Helper Function ---
// A generic helper to handle fetch requests and errors.
const apiFetch = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    timeout: 5000,
  });

  if (!response.ok) {
    // Try to get error message from response body, otherwise use status text
    const errorData = await response.json().catch(() => null);
    const errorMessage = errorData?.message || response.statusText;
    throw new Error(errorMessage || `HTTP error! status: ${response.status}`);
  }

  // Return JSON, or an empty object for responses with no content (like 204)
  return await response.json().catch(() => ({}));
};

// --- API Call Functions using fetch ---

/**
 * Fetches the list of available maps.
 * Corresponds to: GET /mapServer/mapList
 */
const fetchMapList = async (backendIp: string): Promise<string[]> => {
  console.log(`Fetching map list from: ${backendIp}/mapServer/mapList`);
  return await apiFetch(`http://${backendIp}/mapServer/mapList`);
};

/**
 * Sets the current map.
 * Corresponds to: POST /api/location/map/set
 */
const setMap = async (backendIp: string, mapName: string): Promise<any> => {
  console.log(`Setting map to: ${mapName} at ${backendIp}/api/location/map/set`);
  return await apiFetch(`http://${backendIp}/api/location/map/set`, {
    method: "POST",
    body: JSON.stringify({ mapName }),
  });
};

/**
 * Fetches the current location service status.
 * Corresponds to: GET /api/location/status
 */
const fetchLocationStatus = async (
  backendIp: string,
): Promise<{ status: string; timestamp: number }> => {
  console.log(`Fetching location status from: ${backendIp}/api/location/status`);
  return await apiFetch(`http://${backendIp}/api/location/status`);
};

/**
 * Signals that the robot is at the start point.
 * Corresponds to: POST /api/location/signal/at_start_point
 */
const signalAtStartPoint = async (backendIp: string): Promise<any> => {
  console.log(`Signaling: at start point to ${backendIp}/api/location/signal/at_start_point`);
  return await apiFetch(`http://${backendIp}/api/location/signal/at_start_point`, {
    method: "POST",
  });
};

/**
 * Signals that the robot has left the start point.
 * Corresponds to: POST /api/location/signal/left_start_point
 */
const signalLeftStartPoint = async (backendIp: string): Promise<any> => {
  console.log(`Signaling: left start point to ${backendIp}/api/location/signal/left_start_point`);
  return await apiFetch(`http://${backendIp}/api/location/signal/left_start_point`, {
    method: "POST",
  });
};

// --- Styled Components (Unchanged) ---
const StyledContainer = styled("div")(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  padding: theme.spacing(4),
  gap: theme.spacing(4),
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  flexWrap: "wrap",
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius * 2,
  width: "100%",
  maxWidth: "400px",
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2.5),
}));

const HeaderTypography = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  fontWeight: 500,
  color: theme.palette.primary.main,
  borderBottom: `2px solid ${theme.palette.primary.light}`,
  paddingBottom: theme.spacing(1),
}));

const StatusDisplay = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  marginTop: theme.spacing(1),
  backgroundColor: theme.palette.grey[100],
  borderLeft: `5px solid ${theme.palette.secondary.main}`,
  width: "100%",
  maxWidth: "400px",
  minHeight: "80px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
}));

const ButtonContainer = styled("div")(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(2),
  marginTop: theme.spacing(1),
}));

// --- Main Component ---

interface LocationControllerProps {
  backendIp: string;
}

const LocationController: React.FC<LocationControllerProps> = ({ backendIp }) => {
  // State for data
  const [mapList, setMapList] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState<string>("");
  const [locationStatus, setLocationStatus] = useState<string>("正在获取状态...");

  // State for UI control
  const [loading, setLoading] = useState({
    maps: true,
    status: true,
    setMap: false,
    signal: false,
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (message: string, severity: "success" | "error" = "error") => {
    setSnackbar({ open: true, message, severity });
  };

  // Fetch initial map list
  useEffect(() => {
    if (!backendIp) {
      return;
    }
    const getMapList = async () => {
      try {
        const maps = await fetchMapList(backendIp);
        setMapList(maps);
        if (maps.length > 0) {
          setSelectedMap(maps[0]);
        }
      } catch (error: any) {
        console.error("Failed to fetch map list:", error);
        showSnackbar(`获取地图列表失败: ${error.message || "网络错误"}`);
      } finally {
        setLoading((prev) => ({ ...prev, maps: false }));
      }
    };
    getMapList();
  }, [backendIp]);

  // Poll for location status every 2 seconds
  useEffect(() => {
    if (!backendIp) {
      return;
    }
    const pollStatus = async () => {
      try {
        const data = await fetchLocationStatus(backendIp);
        setLocationStatus(data.status || "状态未知");
      } catch (error: any) {
        console.error("Failed to fetch status:", error);
        setLocationStatus("获取状态失败");
      } finally {
        if (loading.status) {
          setLoading((prev) => ({ ...prev, status: false }));
        }
      }
    };

    pollStatus();
    const intervalId = setInterval(pollStatus, 2000);
    return () => {
      clearInterval(intervalId);
    };
  }, [backendIp, loading.status]);

  const handleMapChange = (event: SelectChangeEvent) => {
    setSelectedMap(event.target.value);
  };

  const handleSubmitMap = async () => {
    if (!selectedMap) {
      showSnackbar("请先选择一张地图");
      return;
    }
    setLoading((prev) => ({ ...prev, setMap: true }));
    try {
      await setMap(backendIp, selectedMap);
      showSnackbar(`地图 '${selectedMap}' 设置成功`, "success");
    } catch (error: any) {
      console.error("Failed to set map:", error);
      showSnackbar(`设置地图失败: ${error.message || "网络错误"}`);
    } finally {
      setLoading((prev) => ({ ...prev, setMap: false }));
    }
  };

  const handleSignal = useCallback(
    async (signalFn: (ip: string) => Promise<any>, successMessage: string) => {
      setLoading((prev) => ({ ...prev, signal: true }));
      try {
        await signalFn(backendIp);
        showSnackbar(successMessage, "success");
      } catch (error: any) {
        console.error(`Failed to send signal: ${successMessage}`, error);
        showSnackbar(`发送信号失败: ${error.message || "网络错误"}`);
      } finally {
        setLoading((prev) => ({ ...prev, signal: false }));
      }
    },
    [backendIp],
  );

  return (
    <StyledContainer>
      <StyledPaper elevation={3}>
        <HeaderTypography variant="h5">地图与定位</HeaderTypography>

        <FormControl fullWidth disabled={loading.maps || !backendIp}>
          <InputLabel id="map-select-label">选择地图</InputLabel>
          <Select
            labelId="map-select-label"
            value={selectedMap}
            label="选择地图"
            onChange={handleMapChange}
          >
            {loading.maps ? (
              <MenuItem disabled>
                <em>加载中...</em>
              </MenuItem>
            ) : (
              mapList.map((map) => (
                <MenuItem key={map} value={map}>
                  {map}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={handleSubmitMap}
          disabled={loading.setMap || loading.maps || !selectedMap || !backendIp}
        >
          {loading.setMap ? <CircularProgress size={24} color="inherit" /> : "设置当前地图"}
        </Button>

        <ButtonContainer>
          <Button
            variant="outlined"
            fullWidth
            onClick={async () => {
              await handleSignal(signalAtStartPoint, "已发送“在起始点”信号");
            }}
            disabled={loading.signal || !backendIp}
          >
            在起始点
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            onClick={async () => {
              await handleSignal(signalLeftStartPoint, "已发送“离开起始点”信号");
            }}
            disabled={loading.signal || !backendIp}
          >
            离开起始点
          </Button>
        </ButtonContainer>
        {loading.signal && (
          <CircularProgress size={24} style={{ margin: "auto", marginTop: "8px" }} />
        )}
      </StyledPaper>

      <StatusDisplay elevation={3}>
        <Typography variant="h6" gutterBottom>
          服务状态
        </Typography>
        {loading.status ? (
          <CircularProgress size={28} />
        ) : (
          <Typography variant="body1" style={{ fontStyle: "italic", color: "#333" }}>
            {locationStatus}
          </Typography>
        )}
      </StatusDisplay>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => {
          setSnackbar({ ...snackbar, open: false });
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => {
            setSnackbar({ ...snackbar, open: false });
          }}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </StyledContainer>
  );
};


// --- App Entry Point ---
const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
      light: "#42a5f5",
    },
    secondary: {
      main: "#dc004e",
    },
  },
});
export default LocationController;
