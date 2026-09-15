export interface RoutePoint {
  lat: number;
  lng: number;
  /** Unix epoch milliseconds. */
  t: number;
  alt?: number;
  /** True when this point starts a new segment after a pause. */
  seg?: boolean;
}

const EARTH_RADIUS_M = 6371000;

/** Great-circle distance between two coordinates in metres. */
export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}

export const SPLIT_DISTANCES = {
  FIVE_K: 5000,
  TEN_K: 10000,
  HALF_MARATHON: 21097.5,
} as const;

export interface RunSummary {
  distanceMeters: number;
  /** Moving seconds (gaps flagged with `seg` are excluded). */
  movingSeconds: number;
  splits: { FIVE_K: number | null; TEN_K: number | null; HALF_MARATHON: number | null };
}

/**
 * Walks the route and computes total distance, moving time and the elapsed moving
 * time at which each standard distance was crossed (linearly interpolated).
 */
export function summariseRoute(route: RoutePoint[]): RunSummary {
  const splits: RunSummary['splits'] = { FIVE_K: null, TEN_K: null, HALF_MARATHON: null };
  let distance = 0;
  let moving = 0;
  for (let i = 1; i < route.length; i++) {
    const prev = route[i - 1];
    const cur = route[i];
    if (cur.seg) continue; // pause boundary: don't accumulate distance or time across it
    const d = haversineMeters(prev, cur);
    const dt = Math.max(0, (cur.t - prev.t) / 1000);
    const before = distance;
    distance += d;
    moving += dt;
    for (const key of Object.keys(SPLIT_DISTANCES) as (keyof typeof SPLIT_DISTANCES)[]) {
      const target = SPLIT_DISTANCES[key];
      if (splits[key] === null && before < target && distance >= target) {
        const frac = d > 0 ? (target - before) / d : 1;
        splits[key] = Math.round(moving - dt + dt * frac);
      }
    }
  }
  return { distanceMeters: distance, movingSeconds: Math.round(moving), splits };
}

/** Formats seconds as h:mm:ss or m:ss. */
export function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? h + ':' : ''}${mm}:${String(s).padStart(2, '0')}`;
}
