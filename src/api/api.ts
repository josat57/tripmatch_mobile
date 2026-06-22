import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const DEFAULT_HOST = 'localhost';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? `http://${DEFAULT_HOST}:9000/api`;

const tokenStore = {
  getAccessToken: () => SecureStore.getItemAsync('accessToken'),
  getRefreshToken: () => SecureStore.getItemAsync('refreshToken'),
  setAccessToken: (t: string) => SecureStore.setItemAsync('accessToken', t),
  setRefreshToken: (t: string) => SecureStore.setItemAsync('refreshToken', t),
  clear: () =>
    Promise.all([
      SecureStore.deleteItemAsync('accessToken'),
      SecureStore.deleteItemAsync('refreshToken'),
    ]),
  hasToken: () => SecureStore.getItemAsync('accessToken').then(Boolean),
};

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
  timeout: 15000,
});

// Unwrap the backend's `{ status, data: { ... } }` envelope
const unwrap = (res: { data: { data?: unknown } }) =>
  (res.data as { data?: unknown }).data ?? res.data;

api.interceptors.request.use(async (config) => {
  const token = await tokenStore.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Shared promise so two simultaneous 401s don't both attempt refresh
let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const refreshToken = await tokenStore.getRefreshToken();
            if (!refreshToken) return null;
            const res = await api.post('/auth/refresh', { refreshToken });
            const newToken =
              (res.data as { data?: { accessToken?: string } }).data?.accessToken ??
              (res.data as { accessToken?: string }).accessToken;
            if (!newToken) return null;
            await tokenStore.setAccessToken(newToken);
            return newToken;
          } catch {
            await tokenStore.clear();
            return null;
          } finally {
            refreshPromise = null;
          }
        })();
      }

      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const Auth = {
  register: async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    travelPreferences?: Record<string, unknown>;
  }) => {
    const res = await api.post('/auth/signup', data);
    const payload = unwrap(res) as { accessToken?: string; refreshToken?: string; user?: unknown };
    if (payload.accessToken) {
      await tokenStore.setAccessToken(payload.accessToken);
      if (payload.refreshToken) await tokenStore.setRefreshToken(payload.refreshToken);
    }
    return payload;
  },
  signIn: async (email: string, password: string) => {
    const res = await api.post('/auth/signin', { email, password });
    const payload = unwrap(res) as { accessToken?: string; refreshToken?: string; user?: unknown };
    if (payload.accessToken) {
      await tokenStore.setAccessToken(payload.accessToken);
      if (payload.refreshToken) await tokenStore.setRefreshToken(payload.refreshToken);
    }
    return payload;
  },
  signOut: async () => {
    try { await api.post('/auth/signout'); } catch {}
    await tokenStore.clear();
  },
  getMe: async () => {
    const res = await api.get('/auth/get_profile_details');
    return unwrap(res);
  },
  resendVerification: async () => {
    const res = await api.post('/auth/resend-verification-email');
    return unwrap(res);
  },
  registerDeviceToken: async (token: string) => {
    const res = await api.post('/users/device-token', { token });
    return unwrap(res);
  },
  hasToken: tokenStore.hasToken,
};

// ── Buddy / Matches ───────────────────────────────────────────────────────────
export const Buddy = {
  getSuggestions: async (limit = 20) => {
    const res = await api.get(`/buddies/suggestions?limit=${limit}`);
    return unwrap(res);
  },
  sendRequest: async (userId: string, message?: string) => {
    const res = await api.post(`/buddies/request/${userId}`, { message });
    return unwrap(res);
  },
  getBuddies: async () => {
    const res = await api.get('/buddies');
    return unwrap(res);
  },
  getRequests: async () => {
    const res = await api.get('/buddies/requests');
    return unwrap(res);
  },
  respondToRequest: async (requestId: string, status: 'accepted' | 'declined') => {
    const res = await api.post(`/buddies/respond/${requestId}`, { status });
    return unwrap(res);
  },
};

// ── Messaging ─────────────────────────────────────────────────────────────────
export const Messaging = {
  getConversations: async () => {
    const res = await api.get('/messaging/conversations');
    return unwrap(res);
  },
  getDirectHistory: async (userId: string, limit = 50) => {
    const res = await api.get(`/messaging/history/direct/${userId}`, { params: { limit } });
    return unwrap(res);
  },
  sendDirectMessage: async (userId: string, content: string) => {
    const res = await api.post(`/messaging/direct/${userId}`, { content });
    return unwrap(res);
  },
  getWsToken: async () => {
    const res = await api.get('/messaging/ws-token');
    return unwrap(res) as { token: string };
  },
};

// ── Trips ─────────────────────────────────────────────────────────────────────
export const Trips = {
  list: async (page = 1, limit = 20, filters?: Record<string, unknown>) => {
    const res = await api.get('/trips/all_trips', { params: { page, limit, ...filters } });
    return unwrap(res);
  },
  listMine: async () => {
    const res = await api.get('/trips/my_trips');
    return unwrap(res);
  },
  getById: async (id: string) => {
    const res = await api.get(`/trips/${id}`);
    return unwrap(res);
  },
  create: async (data: Record<string, unknown>) => {
    const res = await api.post('/trips/create_trip', data);
    return unwrap(res);
  },
  requestToJoin: async (tripId: string, message?: string) => {
    const res = await api.post(`/trips/join_trip/${tripId}`, { message });
    return unwrap(res);
  },
  joinWaitlist: async (tripId: string) => {
    const res = await api.post(`/trips/${tripId}/waitlist`);
    return unwrap(res);
  },
  search: async (query: string, filters?: Record<string, unknown>) => {
    const res = await api.get('/search/trips', { params: { q: query, ...filters } });
    return unwrap(res);
  },
  searchNearby: async (latitude: number, longitude: number, radius = 50) => {
    const res = await api.get('/search/nearby', { params: { latitude, longitude, radius } });
    return unwrap(res);
  },
  getJoinRequests: async (tripId: string) => {
    const res = await api.get(`/trips/${tripId}/requests`);
    return unwrap(res);
  },
  approveRequest: async (tripId: string, requestId: string) => {
    const res = await api.post(`/trips/${tripId}/requests/${requestId}/approve`);
    return unwrap(res);
  },
  rejectRequest: async (tripId: string, requestId: string) => {
    const res = await api.post(`/trips/${tripId}/requests/${requestId}/reject`);
    return unwrap(res);
  },
  addReview: async (tripId: string, rating: number, comment: string) => {
    const res = await api.post(`/trips/${tripId}/reviews`, { rating, comment });
    return unwrap(res);
  },
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const Notifications = {
  getUnreadCount: async () => {
    const res = await api.get('/notifications/get_notification_count');
    return unwrap(res) as { count: number };
  },
  list: async () => {
    const res = await api.get('/notifications');
    return unwrap(res);
  },
  markAllRead: async () => {
    const res = await api.post('/notifications/mark_all_read');
    return unwrap(res);
  },
  markRead: async (id: string) => {
    const res = await api.post('/notifications/mark_read', { id });
    return unwrap(res);
  },
};

// ── User Profile ──────────────────────────────────────────────────────────────
export const UserProfile = {
  getMe: async () => {
    const res = await api.get('/users/get_profile');
    return unwrap(res);
  },
  update: async (data: Record<string, unknown>) => {
    const res = await api.put('/auth/updateprofile', data);
    return unwrap(res);
  },
  uploadPhoto: async (uri: string) => {
    const filename = uri.split('/').pop() ?? 'photo.jpg';
    const ext = /\.(\w+)$/.exec(filename)?.[1] ?? 'jpeg';
    const formData = new FormData();
    formData.append('image', { uri, name: filename, type: `image/${ext}` } as unknown as Blob);
    const res = await api.post('/uploads/upload_profile_image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap(res);
  },
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const Users = {
  block: async (userId: string) => {
    const res = await api.post(`/users/block/${userId}`);
    return unwrap(res);
  },
  report: async (userId: string, reason: string, details?: string) => {
    const res = await api.post(`/users/report/${userId}`, { reason, details });
    return unwrap(res);
  },
  getTravelDNA: async (userId: string) => {
    const res = await api.get(`/users/${userId}/travel-dna`);
    return unwrap(res);
  },
  getAchievements: async (userId: string) => {
    const res = await api.get(`/users/${userId}/achievements`);
    return unwrap(res);
  },
};

export default api;
