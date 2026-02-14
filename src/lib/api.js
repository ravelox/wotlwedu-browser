import axios from "axios";
import { getAuthToken } from "./session";

export function createApi(baseURL, onUnauthorized) {
  const api = axios.create({
    baseURL,
    timeout: 30000,
    validateStatus: () => true,
  });

  api.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Don't force JSON for multipart uploads (FormData must set its own boundary).
    const isFormData =
      typeof FormData !== "undefined" && config.data instanceof FormData;
    if (!isFormData) {
      config.headers["Content-Type"] =
        config.headers["Content-Type"] || "application/json";
    }
    return config;
  });

  api.interceptors.response.use((response) => {
    if (response.status === 401 || response.status === 403) {
      if (onUnauthorized) onUnauthorized(response);
    }
    return response;
  });

  return api;
}

export function toApiError(response, fallback = "Request failed") {
  if (!response) return new Error(fallback);
  const msg = response.data?.message || fallback;
  return new Error(`${msg} (HTTP ${response.status})`);
}
