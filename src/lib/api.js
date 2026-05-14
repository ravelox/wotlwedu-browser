import axios from "axios";
import { getAuthToken, getSession, setSession } from "./session";

const API_VERSION = "v1";
const USE_REFRESH_COOKIE = import.meta.env.VITE_WOTLWEDU_REFRESH_COOKIE_ENABLED === "true";

function versionedBaseUrl(baseURL) {
  const trimmed = String(baseURL || "").replace(/\/+$/, "");
  if (/\/v\d+$/.test(trimmed)) return trimmed;
  return `${trimmed}/${API_VERSION}`;
}

function mergeSession(update) {
  const current = getSession() || {};
  const data = update?.data || update || {};
  const next = {
    ...current,
    authToken: data.authToken || current.authToken,
    refreshToken: data.refreshToken || current.refreshToken,
    sessionId: data.sessionId || current.sessionId,
    userId: data.userId || current.userId,
    email: data.email || current.email,
    alias: data.alias || current.alias,
    systemAdmin:
      data.systemAdmin === undefined ? current.systemAdmin : data.systemAdmin === true,
    organizationAdmin:
      data.organizationAdmin === undefined
        ? current.organizationAdmin
        : data.organizationAdmin === true,
    workgroupAdmin:
      data.workgroupAdmin === undefined
        ? current.workgroupAdmin
        : data.workgroupAdmin === true,
    organizationId: data.organizationId || current.organizationId || null,
    adminWorkgroupId: data.adminWorkgroupId || current.adminWorkgroupId || null,
  };
  setSession(next);
  return next;
}

export function createApi(baseURL, onUnauthorized, onSessionRefresh) {
  const api = axios.create({
    baseURL: versionedBaseUrl(baseURL),
    timeout: 30000,
    withCredentials: USE_REFRESH_COOKIE,
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

  api.interceptors.response.use(
    async (response) => {
      const originalRequest = response.config || {};
      const isRefreshRequest = String(originalRequest.url || "").includes("/login/refresh");
      if (response.status === 401 && !originalRequest._retry && !isRefreshRequest) {
        const refreshToken = getSession()?.refreshToken;
        if (refreshToken) {
          originalRequest._retry = true;
          const refreshResponse = await api.post("/login/refresh", { refreshToken });
          if (refreshResponse.status < 400) {
            const nextSession = mergeSession(refreshResponse.data);
            if (onSessionRefresh) onSessionRefresh(nextSession);
            originalRequest.headers = {
              ...(originalRequest.headers || {}),
              Authorization: `Bearer ${nextSession.authToken}`,
            };
            return api(originalRequest);
          }
        }
      }

      if (response.status === 401) {
        if (onUnauthorized) onUnauthorized(response);
      }
      return response;
    },
    (error) =>
      Promise.reject(
        toApiError(error?.response || null, error?.message || "Request failed")
      )
  );

  return api;
}

export function toApiError(response, fallback = "Request failed") {
  if (!response) {
    return new Error(
      `${fallback}. The API could not be reached. Check the API URL, HTTPS, and CORS configuration.`
    );
  }

  if (response.status === 413) {
    return new Error("File or request is too large. Choose a smaller file and try again.");
  }

  if (response.status === 421) {
    return new Error(response.data?.message || "Invalid or unsupported image file.");
  }

  if (response.status === 429) {
    const retryAfter = response.headers?.["retry-after"];
    const retryText = retryAfter
      ? ` Try again in ${retryAfter} second${retryAfter === "1" ? "" : "s"}.`
      : "";
    return new Error(`${response.data?.message || "Too many requests."}${retryText}`);
  }

  const msg = response.data?.message || response.data?.error || fallback;
  return new Error(`${msg} (HTTP ${response.status})`);
}
