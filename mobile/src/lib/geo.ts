export interface RoutePoint {
  lat: number;
  lng: number;
  /** epoch ms */
  t: number;
  alt?: number;
  /** first point of a new segment after a pause */
  seg?: boolean;
}

const R = 6371000;

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Total distance and moving time of a route (mirrors the server's calculation). */
export function summariseRoute(route: RoutePoint[]) {
  let distance = 0;
  let moving = 0;
  for (let i = 1; i < route.length; i++) {
    const prev = route[i - 1];
    const cur = route[i];
    if (cur.seg) continue;
    distance += haversineMeters(prev, cur);
    moving += Math.max(0, (cur.t - prev.t) / 1000);
  }
  return { distanceMeters: distance, movingSeconds: moving };
}

/** Bounding region for a MapView that contains the whole route. */
export function regionForRoute(route: { lat: number; lng: number }[]) {
  if (!route.length) return null;
  let minLat = route[0].lat, maxLat = route[0].lat, minLng = route[0].lng, maxLng = route[0].lng;
  for (const p of route) {
    minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng);
  }
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.004),
    longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.004),
  };
}

/**
 * Projects a route into a width x height box as an SVG path string ("M x y L x y ...").
 * Segments (after pauses) are drawn as separate sub-paths.
 */
export function routeToSvgPath(route: RoutePoint[], width: number, height: number, padding = 12) {
  if (route.length < 2) return '';
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const p of route) {
    minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng);
  }
  // Scale longitude by cos(lat) so the shape is not stretched.
  const cos = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const spanX = Math.max((maxLng - minLng) * cos, 1e-6);
  const spanY = Math.max(maxLat - minLat, 1e-6);
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  let d = '';
  route.forEach((p, i) => {
    const x = offX + (p.lng - minLng) * cos * scale;
    const y = offY + (maxLat - p.lat) * scale;
    d += `${i === 0 || p.seg ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `;
  });
  return d.trim();
}
