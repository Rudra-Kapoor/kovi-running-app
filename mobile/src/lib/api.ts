import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { DistanceCategory } from './format';
import type { RoutePoint } from './geo';

const TOKEN_KEY = 'kovi.accessToken';

/**
 * API base URL. EXPO_PUBLIC_API_URL wins; otherwise, in development, derive the machine that is
 * serving the Metro bundle so a physical device on the same Wi-Fi reaches the local backend.
 */
export function getApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:3000`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
}

let memoryToken: string | null | undefined;

export async function getToken() {
  if (memoryToken === undefined) memoryToken = await SecureStore.getItemAsync(TOKEN_KEY);
  return memoryToken;
}

export async function setToken(token: string | null) {
  memoryToken = token;
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (auth) {
    const token = await getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}/api${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection.');
  }
  if (res.status === 401 && auth) onUnauthorized?.();
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join('\n') : data?.message ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }, auth),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  upload: <T>(path: string, uri: string, name = 'photo.jpg', type = 'image/jpeg') => {
    const form = new FormData();
    // React Native's FormData accepts { uri, name, type } for files.
    form.append('file', { uri, name, type } as unknown as Blob);
    return request<T>(path, { method: 'POST', body: form });
  },
};

// ---------------- Types ----------------

export interface User {
  id: string;
  email: string;
  name: string;
  photoUrl: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  club: string | null;
  onboardingCompleted: boolean;
  provider: 'EMAIL' | 'GOOGLE' | 'APPLE';
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface EventSummary {
  id: string;
  name: string;
  description: string;
  bannerUrl: string | null;
  sponsorLogoUrl: string | null;
  distanceCategory: DistanceCategory;
  date: string;
  location: string;
  participantCount: number;
  joined: boolean;
  myClub: string | null;
}

export interface EventLeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  photoUrl: string | null;
  club: string | null;
  city: string | null;
  completionSeconds: number;
}

export interface RunSummary {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  distanceMeters: number;
  avgPaceSecPerKm: number | null;
  eventId: string | null;
  split5kSeconds: number | null;
  split10kSeconds: number | null;
  split21kSeconds: number | null;
  event: { id: string; name: string; distanceCategory: DistanceCategory } | null;
}

export interface RunDetail extends RunSummary {
  route: RoutePoint[];
  event: {
    id: string;
    name: string;
    distanceCategory: DistanceCategory;
    date: string;
    location: string;
    sponsorLogoUrl: string | null;
    bannerUrl: string | null;
  } | null;
  eventRank: { rank: number; of: number; completionSeconds: number } | null;
}

export interface UserStats {
  totalRuns: number;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  personalBests: {
    FIVE_K: { runId: string; seconds: number; date: string } | null;
    TEN_K: { runId: string; seconds: number; date: string } | null;
    HALF_MARATHON: { runId: string; seconds: number; date: string } | null;
    longestRun: { runId: string; distanceMeters: number; date: string } | null;
  };
}

export interface JoinedEvent extends Omit<EventSummary, 'participantCount' | 'joined' | 'myClub'> {
  club: string | null;
  joinedAt: string;
  bestRun: { id: string; durationSeconds: number; distanceMeters: number } | null;
}

export interface GlobalLeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  photoUrl: string | null;
  club: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  seconds: number;
  runId: string;
  date: string;
}

export interface GlobalLeaderboard {
  category: DistanceCategory;
  items: GlobalLeaderboardRow[];
  me: GlobalLeaderboardRow | null;
}

export interface CreateRunBody {
  startedAt: string;
  endedAt: string;
  route: RoutePoint[];
  eventId?: string;
  club?: string;
  distanceMeters?: number;
  durationSeconds?: number;
}
