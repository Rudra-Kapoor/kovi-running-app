import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { EventSummary, JoinedEvent, RunSummary } from '../lib/api';
import { CATEGORY_LABEL, formatDuration, formatKm, formatPace, relativeDay } from '../lib/format';
import { colors, radius, spacing } from '../theme';
import { Card } from './ui';

export function EventCard({ event, compact = false }: { event: EventSummary | JoinedEvent; compact?: boolean }) {
  const router = useRouter();
  const joined = 'joined' in event ? event.joined : true;
  return (
    <Card style={[styles.eventCard, compact && { width: 260 }]} onPress={() => router.push(`/events/${event.id}`)}>
      {event.bannerUrl ? (
        <Image source={{ uri: event.bannerUrl }} style={styles.banner} contentFit="cover" />
      ) : (
        <View style={[styles.banner, styles.bannerFallback]}>
          <Text style={styles.bannerFallbackText}>{CATEGORY_LABEL[event.distanceCategory]}</Text>
        </View>
      )}
      <View style={{ padding: spacing.md, gap: 4 }}>
        <View style={styles.row}>
          <Text style={styles.pill}>{CATEGORY_LABEL[event.distanceCategory]}</Text>
          {joined && <Text style={[styles.pill, styles.pillJoined]}>Joined</Text>}
        </View>
        <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>{relativeDay(event.date)} · {event.location}</Text>
      </View>
    </Card>
  );
}

export function RunCard({ run }: { run: RunSummary }) {
  const router = useRouter();
  return (
    <Card style={styles.runCard} onPress={() => router.push(`/runs/${run.id}`)}>
      <View style={styles.runIcon}>
        <Text style={{ fontSize: 20 }}>🏃</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.runTitle} numberOfLines={1}>{run.event ? run.event.name : 'Run'}</Text>
        <Text style={styles.meta}>{relativeDay(run.startedAt)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.runDistance}>{formatKm(run.distanceMeters)} km</Text>
        <Text style={styles.meta}>{formatDuration(run.durationSeconds)} · {formatPace(run.avgPaceSecPerKm)}/km</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  eventCard: { padding: 0, overflow: 'hidden', marginBottom: spacing.md },
  banner: { width: '100%', height: 120, backgroundColor: colors.surfaceAlt },
  bannerFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dark },
  bannerFallbackText: { color: colors.primary, fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  row: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  pill: { backgroundColor: colors.primarySoft, color: colors.primary, fontWeight: '700', fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' },
  pillJoined: { backgroundColor: '#ECFDF3', color: '#067647' },
  eventName: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, fontSize: 13 },
  runCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm, padding: spacing.md },
  runIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  runTitle: { fontWeight: '700', color: colors.text, fontSize: 15 },
  runDistance: { fontWeight: '800', fontSize: 16, color: colors.text, fontVariant: ['tabular-nums'] },
});
