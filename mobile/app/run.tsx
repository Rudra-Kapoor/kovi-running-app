import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteMap } from '@/components/RouteMap';
import { Button, Stat } from '@/components/ui';
import { api, type EventSummary, type RunDetail } from '@/lib/api';
import { CATEGORY_LABEL, CATEGORY_METERS, formatDuration, formatKm, formatPace } from '@/lib/format';
import {
  discardRun,
  finishRun,
  movingSeconds,
  pauseRun,
  resumeRun,
  startRun,
  useTracker,
} from '@/lib/runTracker';
import { colors, radius, spacing } from '@/theme';

/**
 * Live run screen. Opened from Home ("Start Run") or from an event ("Start Event", which passes
 * eventId so the run is linked to the event on completion).
 */
export default function Run() {
  useKeepAwake();
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const tracker = useTracker();
  const [now, setNow] = useState(Date.now());
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState<EventSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeEventId = tracker.status === 'idle' ? eventId ?? null : tracker.eventId;

  useEffect(() => {
    if (!activeEventId) return setEvent(null);
    api.get<EventSummary>(`/events/${activeEventId}`).then(setEvent).catch(() => {});
  }, [activeEventId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function start() {
    setError(null);
    setStarting(true);
    try {
      const perms = await startRun({ eventId: eventId ?? null, club: event?.myClub ?? null });
      if (!perms.background) {
        Alert.alert('Background tracking off', 'Allow location "Always" in Settings so tracking continues when your screen is off. For now, keep Kovi open while you run.');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  async function finish() {
    const secs = movingSeconds(tracker, now);
    if (tracker.distanceMeters < 50 || secs < 20) {
      Alert.alert('Discard run?', 'This run is too short to save.', [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: async () => { await discardRun(); router.back(); } },
      ]);
      return;
    }
    Alert.alert('Finish run?', 'Your run will be saved and, if it is an event run, added to the leaderboard.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish',
        onPress: async () => {
          setSaving(true);
          try {
            const result = await finishRun();
            const saved = await api.post<RunDetail>('/runs', {
              startedAt: new Date(result.startedAt).toISOString(),
              endedAt: new Date(result.endedAt).toISOString(),
              route: result.points,
              eventId: result.eventId ?? undefined,
              club: result.club ?? undefined,
              distanceMeters: result.distanceMeters,
              durationSeconds: result.movingSeconds,
            });
            router.replace({ pathname: '/runs/[id]', params: { id: saved.id, fresh: '1' } });
          } catch (e) {
            setSaving(false);
            Alert.alert('Could not save run', (e as Error).message);
          }
        },
      },
    ]);
  }

  const secs = movingSeconds(tracker, now);
  const avgPace = tracker.distanceMeters > 100 ? secs / (tracker.distanceMeters / 1000) : null;
  const target = event ? CATEGORY_METERS[event.distanceCategory] : null;
  const progress = target ? Math.min(tracker.distanceMeters / target, 1) : 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Pressable
          onPress={() => {
            if (tracker.status === 'idle') return router.back();
            Alert.alert('Leave run?', 'Tracking continues in the background. Come back from the Home screen.', [
              { text: 'Stay', style: 'cancel' },
              { text: 'Leave', onPress: () => router.back() },
            ]);
          }}
          hitSlop={12}
        >
          <Ionicons name="chevron-down" size={28} color="#fff" />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.mode}>{event ? `${CATEGORY_LABEL[event.distanceCategory]} EVENT RUN` : 'FREE RUN'}</Text>
          {event && <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>}
        </View>
        <View style={{ width: 28 }} />
      </View>

      <RouteMap route={tracker.points} follow={tracker.lastFix ?? null} style={styles.map} interactive={false} />

      {tracker.gpsWarning && tracker.status !== 'idle' && (
        <View style={styles.gps}><Ionicons name="locate" size={14} color={colors.gold} /><Text style={styles.gpsText}>{tracker.gpsWarning}</Text></View>
      )}

      <View style={styles.stats}>
        <Stat value={formatKm(tracker.distanceMeters)} label="Kilometres" size="xl" dark style={{ alignItems: 'center' }} />
        <View style={styles.statRow}>
          <Stat value={formatDuration(secs)} label="Time" size="lg" dark />
          <Stat value={formatPace(tracker.status === 'running' ? tracker.currentPaceSecPerKm : avgPace)} label={tracker.status === 'running' ? 'Cur. pace' : 'Avg pace'} size="lg" dark />
          <Stat value={formatPace(avgPace)} label="Avg /km" size="lg" dark />
        </View>
        {target && tracker.status !== 'idle' && (
          <View style={styles.progressWrap}>
            <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
            <Text style={styles.progressText}>{progress >= 1 ? `${CATEGORY_LABEL[event!.distanceCategory]} complete 🎉` : `${formatKm(Math.max(target - tracker.distanceMeters, 0), 1)} km to go`}</Text>
          </View>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.controls}>
        {tracker.status === 'idle' && (
          <Button title={event ? 'Start Event Run' : 'Start'} size="lg" loading={starting} onPress={start} style={{ flex: 1 }} />
        )}
        {tracker.status === 'running' && (
          <>
            <Button title="Pause" variant="secondary" size="lg" onPress={pauseRun} style={{ flex: 1 }} icon={<Ionicons name="pause" size={18} color={colors.text} />} />
            <Button title="Finish" size="lg" loading={saving} onPress={finish} style={{ flex: 1 }} icon={<Ionicons name="flag" size={18} color="#fff" />} />
          </>
        )}
        {tracker.status === 'paused' && (
          <>
            <Button title="Resume" variant="secondary" size="lg" onPress={resumeRun} style={{ flex: 1 }} icon={<Ionicons name="play" size={18} color={colors.text} />} />
            <Button title="Finish" size="lg" loading={saving} onPress={finish} style={{ flex: 1 }} icon={<Ionicons name="flag" size={18} color="#fff" />} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  mode: { color: colors.primary, fontWeight: '800', letterSpacing: 1.5, fontSize: 12 },
  eventName: { color: '#fff', fontWeight: '600', marginTop: 2, maxWidth: 240 },
  map: { height: 240, marginHorizontal: spacing.lg, borderRadius: radius.lg },
  gps: { flexDirection: 'row', gap: 6, alignSelf: 'center', alignItems: 'center', marginTop: spacing.sm, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  gpsText: { color: colors.gold, fontSize: 12, fontWeight: '600' },
  stats: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.lg },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressWrap: { height: 36, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.pill, overflow: 'hidden', justifyContent: 'center' },
  progressBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.primary, opacity: 0.6 },
  progressText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  error: { color: colors.danger, textAlign: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  controls: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
});
