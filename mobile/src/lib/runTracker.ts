import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useSyncExternalStore } from 'react';
import { haversineMeters, type RoutePoint } from './geo';

/**
 * GPS run tracker.
 *
 * Uses a background location task (foreground service on Android, background mode on iOS) so
 * tracking continues while the app is backgrounded. Falls back to a foreground watcher when the
 * user declines background permission. State is mirrored to AsyncStorage so an interrupted run can
 * be recovered on next launch.
 */

export const LOCATION_TASK = 'kovi-run-location';
const STORAGE_KEY = 'kovi.activeRun';
const MAX_ACCURACY_M = 35;
const MAX_SPEED_MPS = 12; // anything faster is a GPS jump
const MIN_STEP_M = 2; // ignore jitter

export type RunStatus = 'idle' | 'running' | 'paused';

export interface TrackerState {
  status: RunStatus;
  startedAt: number | null;
  points: RoutePoint[];
  distanceMeters: number;
  /** Seconds of completed running segments (excludes the current one). */
  bankedSeconds: number;
  /** When the current running segment began, while status === 'running'. */
  segmentStartedAt: number | null;
  eventId: string | null;
  club: string | null;
  lastFix: { lat: number; lng: number; accuracy: number | null } | null;
  /** Rolling pace over the last ~200 m, sec/km. */
  currentPaceSecPerKm: number | null;
  backgroundTracking: boolean;
  gpsWarning: string | null;
}

const idle = (): TrackerState => ({
  status: 'idle',
  startedAt: null,
  points: [],
  distanceMeters: 0,
  bankedSeconds: 0,
  segmentStartedAt: null,
  eventId: null,
  club: null,
  lastFix: null,
  currentPaceSecPerKm: null,
  backgroundTracking: false,
  gpsWarning: null,
});

let state: TrackerState = idle();
const listeners = new Set<() => void>();
let foregroundSub: Location.LocationSubscription | null = null;
let nextSegmentFlag = false;
let unsavedPoints = 0;

function emit(next: Partial<TrackerState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function getTrackerState() {
  return state;
}

export function useTracker() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

/** Live moving time in seconds. */
export function movingSeconds(s: TrackerState = state, now = Date.now()) {
  const current = s.status === 'running' && s.segmentStartedAt ? (now - s.segmentStartedAt) / 1000 : 0;
  return s.bankedSeconds + current;
}

// ---------------- Location ingestion ----------------

function ingest(loc: Location.LocationObject) {
  if (state.status !== 'running') return;
  const { latitude: lat, longitude: lng, accuracy, altitude, speed } = loc.coords;
  const t = loc.timestamp || Date.now();
  const fix = { lat, lng, accuracy: accuracy ?? null };

  if (accuracy != null && accuracy > MAX_ACCURACY_M) {
    emit({ lastFix: fix, gpsWarning: 'Weak GPS signal' });
    return;
  }

  const last = state.points[state.points.length - 1];
  const startsSegment = nextSegmentFlag || !last;
  let distanceMeters = state.distanceMeters;
  if (last && !startsSegment) {
    const d = haversineMeters(last, { lat, lng });
    const dt = (t - last.t) / 1000;
    if (d < MIN_STEP_M) return;
    if (dt > 0 && d / dt > MAX_SPEED_MPS) return; // teleport - drop it
    distanceMeters += d;
  }
  nextSegmentFlag = false;

  const point: RoutePoint = { lat, lng, t, ...(altitude != null ? { alt: altitude } : {}), ...(startsSegment && last ? { seg: true } : {}) };
  const points = [...state.points, point];

  emit({
    points,
    distanceMeters,
    lastFix: fix,
    gpsWarning: null,
    currentPaceSecPerKm: rollingPace(points, speed),
  });

  if (++unsavedPoints >= 10) {
    unsavedPoints = 0;
    void persist();
  }
}

/** Pace over roughly the last 200 m of the current segment; falls back to device speed. */
function rollingPace(points: RoutePoint[], speed: number | null | undefined) {
  let dist = 0;
  let i = points.length - 1;
  while (i > 0 && dist < 200 && !points[i].seg) {
    dist += haversineMeters(points[i - 1], points[i]);
    i--;
  }
  const secs = (points[points.length - 1].t - points[i].t) / 1000;
  if (dist >= 50 && secs > 0) return secs / (dist / 1000);
  if (speed && speed > 0.5) return 1000 / speed;
  return null;
}

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  locations.forEach(ingest);
});

// ---------------- Persistence ----------------

async function persist() {
  if (state.status === 'idle') return AsyncStorage.removeItem(STORAGE_KEY);
  const { lastFix: _l, currentPaceSecPerKm: _p, gpsWarning: _g, ...rest } = state;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
}

/** Returns an interrupted run (if any) saved by a previous app session. */
export async function loadInterruptedRun(): Promise<TrackerState | null> {
  if (state.status !== 'idle') return null;
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as TrackerState;
    if (!saved.startedAt || !saved.points?.length) return null;
    return saved;
  } catch {
    return null;
  }
}

export async function discardInterruptedRun() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/** Restores an interrupted run into a paused state so the user can resume or finish it. */
export async function restoreInterruptedRun(saved: TrackerState) {
  const wasRunning = saved.status === 'running' && saved.segmentStartedAt;
  // Time since the interruption is unknown; close the open segment at its last GPS fix.
  const lastT = saved.points[saved.points.length - 1]?.t ?? Date.now();
  const banked = wasRunning ? saved.bankedSeconds + Math.max(0, (lastT - saved.segmentStartedAt!) / 1000) : saved.bankedSeconds;
  emit({ ...idle(), ...saved, status: 'paused', bankedSeconds: banked, segmentStartedAt: null, lastFix: null });
  nextSegmentFlag = true;
  await persist();
}

// ---------------- Controls ----------------

export async function ensureLocationPermission(): Promise<{ foreground: boolean; background: boolean }> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return { foreground: false, background: false };
  let background = false;
  try {
    const bg = await Location.requestBackgroundPermissionsAsync();
    background = bg.status === 'granted';
  } catch {
    background = false;
  }
  return { foreground: true, background };
}

async function startUpdates(background: boolean) {
  await stopUpdates();
  if (background) {
    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 3,
        pausesUpdatesAutomatically: false,
        activityType: Location.ActivityType.Fitness,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Kovi is tracking your run',
          notificationBody: 'Tap to return to your run.',
          notificationColor: '#FF5A1F',
        },
      });
      emit({ backgroundTracking: true });
      return;
    } catch {
      // fall through to the foreground watcher
    }
  }
  foregroundSub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 3 },
    ingest,
  );
  emit({ backgroundTracking: false });
}

async function stopUpdates() {
  foregroundSub?.remove();
  foregroundSub = null;
  try {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  } catch {
    /* task not registered */
  }
}

export async function startRun(opts: { eventId?: string | null; club?: string | null } = {}) {
  const perms = await ensureLocationPermission();
  if (!perms.foreground) throw new Error('Location permission is required to track a run.');
  const now = Date.now();
  nextSegmentFlag = false;
  unsavedPoints = 0;
  emit({
    ...idle(),
    status: 'running',
    startedAt: now,
    segmentStartedAt: now,
    eventId: opts.eventId ?? null,
    club: opts.club ?? null,
    gpsWarning: 'Acquiring GPS…',
  });
  await startUpdates(perms.background);
  await persist();
  return perms;
}

export async function pauseRun() {
  if (state.status !== 'running') return;
  const now = Date.now();
  emit({
    status: 'paused',
    bankedSeconds: state.bankedSeconds + (state.segmentStartedAt ? (now - state.segmentStartedAt) / 1000 : 0),
    segmentStartedAt: null,
    currentPaceSecPerKm: null,
  });
  nextSegmentFlag = true;
  await persist();
}

export async function resumeRun() {
  if (state.status !== 'paused') return;
  if (!foregroundSub && !(await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false))) {
    const perms = await ensureLocationPermission();
    await startUpdates(perms.background);
  }
  emit({ status: 'running', segmentStartedAt: Date.now() });
  await persist();
}

/** Stops tracking and returns the finished run; the tracker resets to idle. */
export async function finishRun() {
  if (state.status === 'idle') throw new Error('No active run');
  if (state.status === 'running') await pauseRun();
  await stopUpdates();
  const result = {
    startedAt: state.startedAt!,
    endedAt: Date.now(),
    points: state.points,
    distanceMeters: state.distanceMeters,
    movingSeconds: Math.round(state.bankedSeconds),
    eventId: state.eventId,
    club: state.club,
  };
  state = idle();
  listeners.forEach((l) => l());
  await AsyncStorage.removeItem(STORAGE_KEY);
  return result;
}

export async function discardRun() {
  await stopUpdates();
  state = idle();
  listeners.forEach((l) => l());
  await AsyncStorage.removeItem(STORAGE_KEY);
}
