/** h:mm:ss or m:ss */
export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? h + ':' : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

/** mm:ss per km, or -- when there is no meaningful pace yet */
export function formatPace(secPerKm: number | null | undefined) {
  if (!secPerKm || !isFinite(secPerKm) || secPerKm <= 0 || secPerKm > 3600) return '--:--';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s === 60 ? 0 : s).padStart(2, '0')}`;
}

export function formatKm(meters: number, digits = 2) {
  return (meters / 1000).toFixed(digits);
}

export function formatDate(iso: string | Date, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Date(iso).toLocaleDateString(undefined, opts);
}

export function formatDateTime(iso: string | Date) {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

export function relativeDay(iso: string | Date) {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.round((d.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  return formatDate(iso);
}

export const CATEGORY_LABEL = { FIVE_K: '5K', TEN_K: '10K', HALF_MARATHON: '21K' } as const;
export const CATEGORY_METERS = { FIVE_K: 5000, TEN_K: 10000, HALF_MARATHON: 21097.5 } as const;
export type DistanceCategory = keyof typeof CATEGORY_LABEL;
