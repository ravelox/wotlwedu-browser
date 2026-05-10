import axios from "axios";
import { getAuthToken } from "./session";

const API_VERSION = "v1";

function versionedBaseUrl(baseURL) {
  const trimmed = String(baseURL || "").replace(/\/+$/, "");
  if (/\/v\d+$/.test(trimmed)) return trimmed;
  return `${trimmed}/${API_VERSION}`;
}

export function createApi(baseURL, onUnauthorized) {
  const api = axios.create({
    baseURL: versionedBaseUrl(baseURL),
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

  api.interceptors.response.use(
    (response) => {
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
