// src/services/api/map.ts

/**
 * @fileoverview Map API Service
 *
 * This file contains functions for interacting with the map creation endpoints.
 */

// ... (接口定义 CreateMapRequest, MapCreationStatus 保持不变)
export interface CreateMapRequest {
  mapName: string;
  mapType: string;
}
export interface MapCreationStatus {
  status: "pending" | "in_progress" | "completed" | "failed";
  message: string | null;
}

/**
 * Starts the map creation process.
 * @param {string} backendIp - The IP address of the backend server.
 * @param {CreateMapRequest} data - The data required to start map creation.
 * @returns {Promise<Response>} A promise that resolves to the fetch API Response object.
 */
export const startMapCreation = async (
  backendIp: string,
  data: CreateMapRequest,
): Promise<Response> => {
  // a) 使用传入的IP地址构造完整的URL
  const url = `http://${backendIp}/api/map/create/start`;
  //console.log(`Sending request to: ${url}`); // 用于调试，可以移除

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response;
};

/**
 * Fetches the current status of the map creation process.
 * @param {string} backendIp - The IP address of the backend server.
 * @returns {Promise<MapCreationStatus>} A promise that resolves to the map creation status.
 */
export const getMapCreationStatus = async (backendIp: string): Promise<MapCreationStatus> => {
  // b) 使用传入的IP地址构造完整的URL
  const url = `http://${backendIp}/api/map/create/status`;
  //console.log(`Polling status from: ${url}`); // 用于调试，可以移除

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch map creation status.");
  }

  const statusData: MapCreationStatus = await response.json();
  return statusData;
};
