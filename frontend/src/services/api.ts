import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? '/api' : 'http://127.0.0.1:8000/api');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT access token
apiClient.interceptors.request.use(
  (config) => {
    const tokensStr = localStorage.getItem('scholarsetu_tokens');
    if (tokensStr) {
      try {
        const tokens = JSON.parse(tokensStr);
        if (tokens.access) {
          config.headers.Authorization = `Bearer ${tokens.access}`;
        }
      } catch (e) {
        console.error('Failed to parse tokens from localStorage', e);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to automatically attempt refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const tokensStr = localStorage.getItem('scholarsetu_tokens');
      if (tokensStr) {
        try {
          const tokens = JSON.parse(tokensStr);
          if (tokens.refresh) {
            const refreshRes = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
              refresh: tokens.refresh,
            });
            const newAccess = refreshRes.data.access;
            tokens.access = newAccess;
            localStorage.setItem('scholarsetu_tokens', JSON.stringify(tokens));
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            return apiClient(originalRequest);
          }
        } catch (refreshErr) {
          // Token refresh expired or invalid
          localStorage.removeItem('scholarsetu_tokens');
          localStorage.removeItem('scholarsetu_user');
          window.dispatchEvent(new Event('auth:logout'));
        }
      }
    }
    return Promise.reject(error);
  }
);
