// src/services/api/map.ts

/**
 * @fileoverview Centralized API Service for the application.
 *
 * This file contains functions for interacting with all backend endpoints,
 * using a dynamic backend IP provided at runtime.
 */

// --- Generic API Fetch Helper (no changes needed here) ---
const apiFetch = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage =
        typeof errorData?.message === "string" ? errorData.message : `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return await response.json().catch(() => ({}));
    }
    return {};
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') throw new Error("Request timed out.");
    throw error;
  }
};


// --- Type Definitions (Interfaces from your files) ---
export interface CreateMapRequest {
  mapName: string;
  mapType: string;
}
export interface MapCreationStatus {
  status: "pending" | "in_progress" | "completed" | "failed";
  message: string | null;
}
export interface LaunchRequest {
  rosPackageName: string;
  launchFilePath: string;
  workspaceSetupScript: string;
  parameters: string[];
  restartOnError: boolean;
}
export interface RosProcess {
  id: string;
  rosPackageName: string;
  launchFile: string;
  paramters: string[];
  workspaceSetupScript: string;
  alive: boolean;
  pid: number;
  restartCount: number;
  terminalSlotId: number;
  state: "RUNNING" | "STOPPED" | "ERROR";
  recentLogs?: string[];
}
export interface LocationControllerState {
  navigationService: { message: string; processId: string; serviceName: string; status: "IDLE" | "RUNNING" | "ERROR"; };
  positioningService: { message: string; serviceName: string; status: "IDLE" | "RUNNING" | "ERROR"; atStartPoint: boolean; currentMap: string; };
}


// --- Map Creation API ---
export const startMapCreation = async (backendIp: string, data: CreateMapRequest): Promise<any> => {
  return await apiFetch(`http://${backendIp}/api/map/create/start`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const getMapCreationStatus = async (backendIp: string): Promise<MapCreationStatus> => {
  return await apiFetch(`http://${backendIp}/api/map/create/status`);
};


// --- Location Controller API ---
export const fetchMapList = async (backendIp: string): Promise<string[]> => {
  return await apiFetch(`http://${backendIp}/mapServer/mapList`);
};

export const setMap = async (backendIp: string, mapName: string): Promise<unknown> => {
  return await apiFetch(`http://${backendIp}/api/location/map/set`, {
    method: "POST",
    body: JSON.stringify({ mapName }),
  });
};

export const fetchLocationStatus = async (backendIp: string): Promise<LocationControllerState> => {
  return await apiFetch(`http://${backendIp}/api/location/status`);
};

export const signalAtStartPoint = async (backendIp: string): Promise<unknown> => {
  return await apiFetch(`http://${backendIp}/api/location/signal/at_start_point`, { method: "POST" });
};


// --- ROS Launch Controller API ---
export const fetchRosLaunchList = async (backendIp: string): Promise<RosProcess[]> => {
  return await apiFetch(`http://${backendIp}/api/ros/launch/list`);
};

export const startRosProcess = async (backendIp: string, data: LaunchRequest): Promise<any> => {
  return await apiFetch(`http://${backendIp}/api/ros/launch/start`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const stopRosProcess = async (backendIp: string, id: string): Promise<any> => {
  return await apiFetch(`http://${backendIp}/api/ros/launch/stop/${id}`, { method: "POST" });
};

export const restartRosProcess = async (backendIp: string, id: string): Promise<any> => {
  return await apiFetch(`http://${backendIp}/api/ros/launch/restart/${id}`, { method: "POST" });
};

export const getRosProcessLog = async (backendIp: string, id: string): Promise<RosProcess> => {
  return await apiFetch(`http://${backendIp}/api/ros/launch/status/${id}`);
};
