import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 15000,
});

// ─── Request interceptor: attach access token ────────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('jwt');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Token refresh queue ──────────────────────────────────────────────────────
let isRefreshing = false;
type QueueEntry = { resolve: (token: string) => void; reject: (err: unknown) => void };
let failedQueue: QueueEntry[] = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error || !token) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

// ─── Response interceptor: refresh on 401 ────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    const isAuthEndpoint = originalRequest?.url?.includes('/v1/authorization');

    if (error.response?.status === 401 && !isAuthEndpoint && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { useAuthStore } = await import('@/stores/auth.store');
        const storedRefreshToken = useAuthStore.getState().refreshToken;

        if (!storedRefreshToken) throw new Error('No refresh token available');

        const { authService } = await import('@/services/auth.service');
        const tokens = await authService.refresh(storedRefreshToken);

        await useAuthStore.getState().updateTokens(tokens.token, tokens.refreshToken);

        processQueue(null, tokens.token);
        originalRequest.headers.Authorization = `Bearer ${tokens.token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        const { useAuthStore } = await import('@/stores/auth.store');
        await useAuthStore.getState().logout();
        const { useUIStore } = await import('@/stores/ui.store');
        useUIStore.getState().showToast('Session expired. Please sign in again.', 'warning');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (!error.response) {
      const { useUIStore } = await import('@/stores/ui.store');
      useUIStore.getState().showToast('No connection. Check your network.', 'error');
    }

    return Promise.reject(error);
  }
);

export default api;
