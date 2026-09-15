import { Image } from 'expo-image';
import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { CATEGORY_LABEL, formatDate, formatDuration, formatKm, formatPace, type DistanceCategory } from '../lib/format';
import { routeToSvgPath, type RoutePoint } from '../lib/geo';
import { colors } from '../theme';

export const STORY_WIDTH = 360;
export const STORY_HEIGHT = 640;

export interface StoryCardProps {
  distanceMeters: number;
  durationSeconds: number;
  avgPaceSecPerKm: number | null;
  startedAt: string;
  route: RoutePoint[];
  runnerName: string;
  club?: string | null;
  event?: { name: string; distanceCategory: DistanceCategory; sponsorLogoUrl: string | null } | null;
  rank?: { rank: number; of: number } | null;
}

/**
 * The shareable 9:16 result card. Rendered at 360x640 and captured at 3x (1080x1920) by
 * react-native-view-shot. The sponsor logo is the ONLY place it appears in the app (PRD).
 */
export const StoryCard = forwardRef<View, StoryCardProps>(function StoryCard(
  { distanceMeters, durationSeconds, avgPaceSecPerKm, startedAt, route, runnerName, club, event, rank },
  ref,
) {
  const mapW = STORY_WIDTH - 64;
  const mapH = 220;
  const path = routeToSvgPath(route, mapW, mapH, 18);
  const start = route[0];
  const end = route[route.length - 1];

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.header}>
        <Text style={styles.brand}>KOVI</Text>
        <Text style={styles.date}>{formatDate(startedAt, { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
      </View>

      {event && (
        <View style={styles.eventRow}>
          <Text style={styles.eventPill}>{CATEGORY_LABEL[event.distanceCategory]} EVENT</Text>
          <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>
        </View>
      )}

      <View style={styles.mapBox}>
        {path ? (
          <Svg width={mapW} height={mapH}>
            <Path d={path} stroke={colors.primary} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {start && end && <RouteEnds path={path} />}
          </Svg>
        ) : (
          <Text style={styles.noRoute}>No GPS route</Text>
        )}
      </View>

      <View style={styles.stats}>
        <Text style={styles.distance}>
          {formatKm(distanceMeters)}
          <Text style={styles.unit}> km</Text>
        </Text>
        <View style={styles.statRow}>
          <View>
            <Text style={styles.statValue}>{formatDuration(durationSeconds)}</Text>
            <Text style={styles.statLabel}>TIME</Text>
          </View>
          <View>
            <Text style={styles.statValue}>{formatPace(avgPaceSecPerKm)}</Text>
            <Text style={styles.statLabel}>MIN / KM</Text>
          </View>
          {rank && (
            <View>
              <Text style={styles.statValue}>#{rank.rank}</Text>
              <Text style={styles.statLabel}>OF {rank.of}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.runner} numberOfLines={1}>{runnerName}</Text>
          {club ? <Text style={styles.club} numberOfLines={1}>{club}</Text> : null}
        </View>
        {event?.sponsorLogoUrl && (
          <View style={styles.sponsor}>
            <Text style={styles.sponsorLabel}>POWERED BY</Text>
            <Image source={{ uri: event.sponsorLogoUrl }} style={styles.sponsorLogo} contentFit="contain" />
          </View>
        )}
      </View>
    </View>
  );
});

/** Start (white) and finish (orange) markers derived from the first/last path coordinates. */
function RouteEnds({ path }: { path: string }) {
  const nums = path.match(/[ML]([\d.]+) ([\d.]+)/g);
  if (!nums || nums.length < 2) return null;
  const parse = (s: string) => s.slice(1).split(' ').map(Number);
  const [sx, sy] = parse(nums[0]);
  const [ex, ey] = parse(nums[nums.length - 1]);
  return (
    <>
      <Circle cx={sx} cy={sy} r={6} fill="#fff" stroke={colors.dark} strokeWidth={2} />
      <Circle cx={ex} cy={ey} r={6} fill={colors.primary} stroke="#fff" strokeWidth={2} />
    </>
  );
}

const styles = StyleSheet.create({
  card: { width: STORY_WIDTH, height: STORY_HEIGHT, backgroundColor: colors.dark, padding: 32, overflow: 'hidden' },
  accent: { position: 'absolute', top: -120, right: -120, width: 280, height: 280, borderRadius: 140, backgroundColor: colors.primary, opacity: 0.18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: '#fff', fontWeight: '900', fontSize: 22, letterSpacing: 4 },
  date: { color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: 13 },
  eventRow: { marginTop: 22, gap: 4 },
  eventPill: { color: colors.primary, fontWeight: '800', fontSize: 11, letterSpacing: 1.5 },
  eventName: { color: '#fff', fontWeight: '700', fontSize: 18 },
  mapBox: { marginTop: 20, height: 220, borderRadius: 20, backgroundColor: colors.darkAlt, alignItems: 'center', justifyContent: 'center' },
  noRoute: { color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  stats: { marginTop: 24 },
  distance: { color: '#fff', fontSize: 64, fontWeight: '900', letterSpacing: -2, fontVariant: ['tabular-nums'], lineHeight: 70 },
  unit: { fontSize: 24, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0 },
  statRow: { flexDirection: 'row', gap: 28, marginTop: 8 },
  statValue: { color: '#fff', fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginTop: 2 },
  footer: { marginTop: 'auto', flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  runner: { color: '#fff', fontWeight: '700', fontSize: 15 },
  club: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  sponsor: { alignItems: 'flex-end', gap: 4 },
  sponsorLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  sponsorLogo: { width: 110, height: 44, backgroundColor: '#fff', borderRadius: 8 },
});
