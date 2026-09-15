import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { RouteMap } from '@/components/RouteMap';
import { StoryCard, STORY_HEIGHT, STORY_WIDTH } from '@/components/StoryCard';
import { Button, Card, ErrorText, Loading, Screen, Stat } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import type { RunDetail } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CATEGORY_LABEL, formatDateTime, formatDuration, formatKm, formatPace } from '@/lib/format';
import { saveToDevice, shareSheet, shareToInstagramStory } from '@/lib/storyShare';
import { colors, radius, spacing } from '@/theme';

/**
 * Run detail. With `fresh=1` (right after finishing) it celebrates the result; otherwise it is the
 * activity-history view. Both show the story card with save / Instagram share.
 */
export default function RunScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: run, error, loading } = useApi<RunDetail>(`/runs/${id}`);
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState<'save' | 'share' | 'sheet' | null>(null);

  async function capture() {
    return captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile', width: STORY_WIDTH * 3, height: STORY_HEIGHT * 3 });
  }

  async function onSave() {
    setBusy('save');
    try {
      await saveToDevice(await capture());
      Alert.alert('Saved', 'Your story card is in your photos.');
    } catch (e) {
      Alert.alert('Could not save', (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onInstagram() {
    setBusy('share');
    try {
      const how = await shareToInstagramStory(await capture());
      if (how === 'sheet') {
        // iOS / no Instagram: the system sheet opened; nothing else to do.
      }
    } catch (e) {
      Alert.alert('Could not share', (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onShareSheet() {
    setBusy('sheet');
    try {
      await shareSheet(await capture());
    } catch (e) {
      Alert.alert('Could not share', (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (loading && !run) return <Loading />;
  if (error || !run) return <Screen><ErrorText error={error ?? 'Run not found'} /></Screen>;

  const category = run.event?.distanceCategory;
  const splitForEvent = category === 'FIVE_K' ? run.split5kSeconds : category === 'TEN_K' ? run.split10kSeconds : category === 'HALF_MARATHON' ? run.split21kSeconds : null;
  const completed = !!run.event && splitForEvent != null;

  return (
    <Screen padded={false}>
      <View style={styles.top}>
        <Pressable onPress={() => (fresh ? router.replace('/(tabs)') : router.back())} hitSlop={12}>
          <Ionicons name={fresh ? 'close' : 'chevron-back'} size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{fresh ? 'Run complete' : run.event ? run.event.name : 'Run'}</Text>
        <View style={{ width: 26 }} />
      </View>

      {fresh && (
        <View style={styles.celebrate}>
          <Text style={styles.celebrateTitle}>{completed ? `${CATEGORY_LABEL[category!]} finished! 🎉` : run.event ? 'Nice effort 💪' : 'Great run! 🎉'}</Text>
          {run.eventRank && <Text style={styles.celebrateSub}>You're #{run.eventRank.rank} of {run.eventRank.of} on the {run.event?.name} leaderboard</Text>}
          {run.event && !completed && <Text style={styles.celebrateSub}>Complete the full {CATEGORY_LABEL[category!]} distance in Event Mode to appear on the leaderboard.</Text>}
        </View>
      )}

      <View style={{ paddingHorizontal: spacing.lg }}>
        <RouteMap route={run.route} style={{ height: 200 }} />
        <Card style={[styles.statsCard, { marginTop: spacing.md }]}>
          <Stat value={formatKm(run.distanceMeters)} label="km" size="lg" />
          <Stat value={formatDuration(run.durationSeconds)} label="Time" size="lg" />
          <Stat value={formatPace(run.avgPaceSecPerKm)} label="min/km" size="lg" />
        </Card>
        <Text style={styles.meta}>{formatDateTime(run.startedAt)}{run.event ? ` · ${run.event.location}` : ''}</Text>
        {(run.split5kSeconds || run.split10kSeconds || run.split21kSeconds) && (
          <Card style={{ marginTop: spacing.md, gap: 8 }}>
            <Text style={styles.splitsTitle}>Splits</Text>
            {run.split5kSeconds != null && <SplitRow label="5K" seconds={run.split5kSeconds} />}
            {run.split10kSeconds != null && <SplitRow label="10K" seconds={run.split10kSeconds} />}
            {run.split21kSeconds != null && <SplitRow label="21K" seconds={run.split21kSeconds} />}
          </Card>
        )}
        {run.event && !fresh && (
          <Button title="View event leaderboard" variant="secondary" style={{ marginTop: spacing.md }} onPress={() => router.push(`/events/${run.event!.id}`)} />
        )}
      </View>

      <Text style={styles.sectionTitle}>Your story card</Text>
      <View style={styles.cardWrap}>
        <View style={styles.cardScale}>
          <StoryCard
            ref={cardRef}
            distanceMeters={run.distanceMeters}
            durationSeconds={run.durationSeconds}
            avgPaceSecPerKm={run.avgPaceSecPerKm}
            startedAt={run.startedAt}
            route={run.route}
            runnerName={user?.name ?? 'Runner'}
            club={user?.club}
            event={run.event ? { name: run.event.name, distanceCategory: run.event.distanceCategory, sponsorLogoUrl: run.event.sponsorLogoUrl } : null}
            rank={run.eventRank ? { rank: run.eventRank.rank, of: run.eventRank.of } : null}
          />
        </View>
      </View>
      <View style={styles.shareRow}>
        <Button title="Instagram Story" size="lg" loading={busy === 'share'} disabled={!!busy} onPress={onInstagram} style={{ flex: 1 }} icon={<Ionicons name="logo-instagram" size={20} color="#fff" />} />
        <Button title="Save" variant="secondary" size="lg" loading={busy === 'save'} disabled={!!busy} onPress={onSave} icon={<Ionicons name="download-outline" size={20} color={colors.text} />} />
        <Button title="" variant="secondary" size="lg" loading={busy === 'sheet'} disabled={!!busy} onPress={onShareSheet} icon={<Ionicons name="share-outline" size={20} color={colors.text} />} />
      </View>
    </Screen>
  );
}

function SplitRow({ label, seconds }: { label: string; seconds: number }) {
  return (
    <View style={styles.splitRow}>
      <Text style={{ fontWeight: '600', color: colors.text }}>{label}</Text>
      <Text style={{ fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] }}>{formatDuration(seconds)}</Text>
    </View>
  );
}

const CARD_SCALE = 0.75;

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  celebrate: { marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: spacing.lg },
  celebrateTitle: { fontSize: 20, fontWeight: '800', color: colors.primary },
  celebrateSub: { color: colors.text, marginTop: 4 },
  statsCard: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { color: colors.textMuted, marginTop: spacing.sm, fontSize: 13 },
  splitsTitle: { fontWeight: '700', color: colors.text },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md, paddingHorizontal: spacing.lg },
  cardWrap: { alignItems: 'center', height: STORY_HEIGHT * CARD_SCALE },
  cardScale: { width: STORY_WIDTH, height: STORY_HEIGHT, transform: [{ scale: CARD_SCALE }], transformOrigin: 'top center', borderRadius: radius.lg, overflow: 'hidden' },
  shareRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg },
});
