/** Tiny fetch wrapper for the Kovi admin API. The base URL can be overridden at runtime. */

const DEFAULT_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function getApiUrl() {
  return (localStorage.getItem('kovi.apiUrl') || DEFAULT_API).replace(/\/$/, '');
}
export function setApiUrl(url: string) {
  if (url.trim()) localStorage.setItem('kovi.apiUrl', url.trim());
  else localStorage.removeItem('kovi.apiUrl');
}
export function getToken() {
  return localStorage.getItem('kovi.adminToken');
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem('kovi.adminToken', token);
  else localStorage.removeItem('kovi.adminToken');
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}/api${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, `Cannot reach the API at ${getApiUrl()}`);
  }
  if (res.status === 401 && !path.startsWith('/admin/auth/login')) {
    setToken(null);
    window.dispatchEvent(new Event('kovi:unauthorized'));
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message ?? res.statusText;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<T>(path, { method: 'POST', body: form });
  },
};

// ---- Types shared with the backend ----
export type DistanceCategory = 'FIVE_K' | 'TEN_K' | 'HALF_MARATHON';
export const CATEGORY_LABEL: Record<DistanceCategory, string> = {
  FIVE_K: '5K',
  TEN_K: '10K',
  HALF_MARATHON: '21K (Half Marathon)',
};

export interface AdminEvent {
  id: string;
  name: string;
  description: string;
  bannerUrl: string | null;
  sponsorLogoUrl: string | null;
  distanceCategory: DistanceCategory;
  date: string;
  location: string;
  createdAt: string;
  participantCount?: number;
  runCount?: number;
}

export interface Participant {
  userId: string;
  name: string;
  photoUrl: string | null;
  city: string | null;
  club: string | null;
  joinedAt: string;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  photoUrl: string | null;
  club: string | null;
  city: string | null;
  completionSeconds: number;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  club: string | null;
  provider: string;
  createdAt: string;
  runCount: number;
  eventCount: number;
}

export interface Stats {
  users: number;
  events: number;
  upcomingEvents: number;
  runs: number;
  participations: number;
  recentUsers: { id: string; name: string; email: string; city: string | null; createdAt: string }[];
  recentRuns: {
    id: string;
    distanceMeters: number;
    durationSeconds: number;
    startedAt: string;
    user: { id: string; name: string };
    event: { id: string; name: string } | null;
  }[];
}

// ---- Formatting helpers ----
export function fmtDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${h ? h + ':' : ''}${h ? String(m).padStart(2, '0') : m}:${String(sec).padStart(2, '0')}`;
}
export function fmtKm(meters: number) {
  return `${(meters / 1000).toFixed(2)} km`;
}
export function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
