import axios, { AxiosError, type AxiosResponse } from "axios";

const RAW_BASE = import.meta.env.VITE_API_BASE_URL?.trim();

function resolveBaseUrl(): string {
  if (!RAW_BASE) return "/api/v1";
  const trimmed = RAW_BASE.replace(/\/+$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

export const API_BASE_URL = resolveBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { Accept: "application/json" },
});

export class ApiMisconfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiMisconfiguredError";
  }
}

const ACCESS_TOKEN_KEY = "8888_dashboard_access_token";
const REFRESH_TOKEN_KEY = "8888_dashboard_refresh_token";

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function htmlGuard(response: AxiosResponse): AxiosResponse {
  const contentType = String(response.headers?.["content-type"] ?? "");
  if (contentType.includes("text/html")) {
    throw new ApiMisconfiguredError(
      `The API returned an HTML page instead of JSON (requested ${response.config?.url}). ` +
        "The console's own index.html is answering API routes, so requests never reach the " +
        "backend. Check the reverse proxy and the VITE_API_BASE_URL used at build time.",
    );
  }
  return response;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) return null;

  try {
    // Deliberately bare axios: using apiClient here would re-enter this same
    // interceptor on a 401 and recurse.
    const { data } = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { Accept: "application/json" } },
    );
    tokenStorage.set(data.access_token, data.refresh_token);
    return data.access_token as string;
  } catch {
    tokenStorage.clear();
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => htmlGuard(response),
  async (error: AxiosError<{ detail?: unknown }>) => {
    if (error instanceof ApiMisconfiguredError) return Promise.reject(error);

    const contentType = String(error.response?.headers?.["content-type"] ?? "");
    if (error.response && contentType.includes("text/html")) {
      return Promise.reject(
        new ApiMisconfiguredError(
          `The API host answered ${error.response.status} with an HTML page. The request did ` +
            "not reach the backend — verify the deployed API URL and proxy configuration.",
        ),
      );
    }

    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

    if (error?.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;

      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }

      tokenStorage.clear();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }

    if (!error.response) {
      return Promise.reject(
        new Error("Could not reach the API. Check your connection and try again."),
      );
    }

    const detail = error.response.data?.detail;
    const message =
      typeof detail === "string" ? detail : error.message || "Something went wrong.";
    return Promise.reject(new Error(message));
  },
);