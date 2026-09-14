import { formatDuration, haversineMeters, summariseRoute } from './geo';

describe('geo utils', () => {
  it('computes haversine distance', () => {
    // ~1.11 km per 0.01 deg latitude
    const d = haversineMeters({ lat: 0, lng: 0 }, { lat: 0.01, lng: 0 });
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1120);
  });

  it('summarises a route with splits and pauses', () => {
    // 100 m every 30 s heading north, 60 intervals = ~6 km
    const route: { lat: number; lng: number; t: number; seg?: boolean }[] = [];
    let t = 0;
    for (let i = 0; i <= 60; i++) {
      route.push({ lat: i * 0.0009, lng: 0, t });
      t += 30000;
    }
    // insert a 10 minute pause before the 31st point
    route[31].seg = true;
    for (let i = 31; i < route.length; i++) route[i].t += 600000;
    const s = summariseRoute(route);
    expect(s.distanceMeters).toBeGreaterThan(5800);
    expect(s.movingSeconds).toBe(59 * 30); // one interval dropped for the pause
    expect(s.splits.FIVE_K).not.toBeNull();
    expect(s.splits.TEN_K).toBeNull();
    expect(s.splits.HALF_MARATHON).toBeNull();
  });

  it('formats durations', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3665)).toBe('1:01:05');
  });
});
