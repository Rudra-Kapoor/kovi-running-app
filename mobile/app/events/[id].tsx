import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, Card, Empty, ErrorText, Input, Loading, RankBadge, Screen, SectionHeader } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { api, type EventLeaderboardRow, type EventSummary } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CATEGORY_LABEL, formatDateTime, formatDuration } from '@/lib/format';
import { useTracker } from '@/lib/runTracker';
import { colors, radius, spacing } from '@/theme';

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const tracker = useTracker();
  const event = useApi<EventSummary>(`/events/${id}`);
  const board = useApi<EventLeaderboardRow[]>(`/events/${id}/leaderboard`);
  const [joining, setJoining] = useState(false);
  const [club, setClub] = useState(user?.club ?? '');
  const [showJoin, setShowJoin] = useState(false);

  async function join() {
    setJoining(true);
    try {
      await api.post(`/events/${id}/join`, { club: club.trim() || undefined });
      setShowJoin(false);
      event.reload();
    } catch (e) {
      Alert.alert('Could not join', (e as Error).message);
    } finally {
      setJoining(false);
    }
  }

  function startEvent() {
    if (tracker.status !== 'idle') {
      Alert.alert('Run in progress', 'Finish your current run before starting an event run.', [{ text: 'Go to run', onPress: () => router.push('/run') }, { text: 'OK' }]);
      return;
    }
    router.push({ pathname: '/run', params: { eventId: id } });
  }

  if (event.loading && !event.data) return <Loading />;
  if (event.error || !event.data) return <Screen><ErrorText error={event.error ?? 'Event not found'} /></Screen>;
  const e = event.data;
  const isPast = new Date(e.date).getTime() < Date.now() - 24 * 3600 * 1000;

  return (
    <Screen padded={false} edges={[]}>
      <View style={styles.bannerWrap}>
        {e.bannerUrl ? (
          <Image source={{ uri: e.bannerUrl }} style={styles.banner} contentFit="cover" />
        ) : (
          <View style={[styles.banner, styles.bannerFallback]}><Text style={styles.bannerText}>{CATEGORY_LABEL[e.distanceCategory]}</Text></View>
        )}
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
      </View>

      <View style={{ padding: spacing.lg }}>
        <Text style={styles.pill}>{CATEGORY_LABEL[e.distanceCategory]} · {e.participantCount} joined</Text>
        <Text style={styles.title}>{e.name}</Text>
        <Text style={styles.meta}>📅 {formatDateTime(e.date)}</Text>
        <Text style={styles.meta}>📍 {e.location}</Text>
        <Text style={styles.description}>{e.description}</Text>

        <View style={styles.actions}>
          {e.joined ? (
            <>
              <View style={styles.joinedBadge}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.joinedText}>You're in{e.myClub ? ` · ${e.myClub}` : ''}</Text>
              </View>
              <Button title="Start Event Run" size="lg" onPress={startEvent} icon={<Ionicons name="play" size={18} color="#fff" />} />
            </>
          ) : showJoin ? (
            <Card style={{ gap: spacing.md }}>
              <Input label="Tag your running club (optional)" value={club} onChangeText={setClub} placeholder="Shown next to your name on this leaderboard" />
              <Button title="Join event" loading={joining} onPress={join} />
              <Button title="Cancel" variant="ghost" onPress={() => setShowJoin(false)} />
            </Card>
          ) : (
            <Button title={isPast ? 'Event has ended' : 'Join event'} size="lg" disabled={isPast} onPress={() => setShowJoin(true)} />
          )}
        </View>

        <SectionHeader title="Leaderboard" />
        {board.data && board.data.length === 0 ? (
          <Empty title="No finishers yet" body={`Be the first to complete the ${CATEGORY_LABEL[e.distanceCategory]} in Event Mode.`} />
        ) : (
          <Card style={{ padding: 0 }}>
            {board.data?.map((row) => (
              <View key={row.userId} style={[styles.row, row.userId === user?.id && styles.rowMe]}>
                <RankBadge rank={row.rank} />
                <Avatar url={row.photoUrl} name={row.name} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{row.name}</Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>{row.club ?? row.city ?? '—'}</Text>
                </View>
                <Text style={styles.time}>{formatDuration(row.completionSeconds)}</Text>
              </View>
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bannerWrap: { position: 'relative' },
  banner: { width: '100%', height: 220, backgroundColor: colors.surfaceAlt },
  bannerFallback: { backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center' },
  bannerText: { color: colors.primary, fontSize: 64, fontWeight: '900', letterSpacing: -2 },
  back: { position: 'absolute', top: 48, left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  pill: { alignSelf: 'flex-start', backgroundColor: colors.primarySoft, color: colors.primary, fontWeight: '700', fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 14 },
  description: { color: colors.text, marginTop: spacing.md, lineHeight: 21 },
  actions: { marginTop: spacing.lg, gap: spacing.md },
  joinedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  joinedText: { color: colors.success, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowMe: { backgroundColor: colors.primarySoft },
  name: { fontWeight: '700', color: colors.text },
  rowMeta: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  time: { fontWeight: '800', fontSize: 16, color: colors.text, fontVariant: ['tabular-nums'] },
});
