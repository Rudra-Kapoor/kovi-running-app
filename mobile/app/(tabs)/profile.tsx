import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { EventCard, RunCard } from '@/components/cards';
import { Avatar, Button, Card, Chip, Empty, Screen, SectionHeader, Stat } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { api, type JoinedEvent, type RunSummary, type UserStats } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CATEGORY_LABEL, formatDuration, formatKm, type DistanceCategory } from '@/lib/format';
import { colors, spacing } from '@/theme';

export default function Profile() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'activity' | 'events'>('activity');
  const stats = useApi<UserStats>('/users/me/stats');
  const runs = useApi<{ items: RunSummary[]; nextCursor: string | null }>('/runs?take=20');
  const events = useApi<JoinedEvent[]>('/users/me/events');
  const [loadingMore, setLoadingMore] = useState(false);

  useFocusEffect(useCallback(() => { stats.reload(); runs.reload(); events.reload(); }, []));

  async function loadMore() {
    if (!runs.data?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await api.get<{ items: RunSummary[]; nextCursor: string | null }>(`/runs?take=20&cursor=${runs.data.nextCursor}`);
      runs.setData({ items: [...runs.data.items, ...next.items], nextCursor: next.nextCursor });
    } finally {
      setLoadingMore(false);
    }
  }

  const pb = stats.data?.personalBests;
  const refreshing = stats.refreshing || runs.refreshing || events.refreshing;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { stats.refresh(); runs.refresh(); events.refresh(); }} tintColor={colors.primary} />}>
      <View style={styles.header}>
        <Avatar url={user?.photoUrl} name={user?.name ?? '?'} size={72} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.meta}>{[user?.city, user?.state, user?.country].filter(Boolean).join(', ') || 'Location not set'}</Text>
          {user?.club ? <Text style={styles.club}>🏃 {user.club}</Text> : null}
        </View>
        <Pressable onPress={() => router.push('/profile/edit')} hitSlop={8} style={styles.editBtn}>
          <Ionicons name="create-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      <Card style={styles.totals}>
        <Stat value={String(stats.data?.totalRuns ?? 0)} label="Runs" />
        <Stat value={formatKm(stats.data?.totalDistanceMeters ?? 0, 1)} label="Kilometres" />
        <Stat value={formatDuration(stats.data?.totalDurationSeconds ?? 0)} label="Time" />
      </Card>

      <SectionHeader title="Personal bests" />
      <Card style={{ gap: 12 }}>
        {(Object.keys(CATEGORY_LABEL) as DistanceCategory[]).map((c) => {
          const best = pb?.[c];
          return (
            <Pressable key={c} style={styles.pbRow} onPress={() => best && router.push(`/runs/${best.runId}`)}>
              <Text style={styles.pbLabel}>{CATEGORY_LABEL[c]}</Text>
              <Text style={[styles.pbValue, !best && { color: colors.textMuted }]}>{best ? formatDuration(best.seconds) : '—'}</Text>
            </Pressable>
          );
        })}
        <View style={styles.pbRow}>
          <Text style={styles.pbLabel}>Longest run</Text>
          <Text style={[styles.pbValue, !pb?.longestRun && { color: colors.textMuted }]}>{pb?.longestRun ? `${formatKm(pb.longestRun.distanceMeters)} km` : '—'}</Text>
        </View>
      </Card>

      <View style={[styles.chips, { marginTop: spacing.xl }]}>
        <Chip label="Activity" active={tab === 'activity'} onPress={() => setTab('activity')} />
        <Chip label="Events" active={tab === 'events'} onPress={() => setTab('events')} />
      </View>
      {tab === 'activity' ? (
        <>
          {runs.data && runs.data.items.length === 0 && <Empty title="No runs yet" />}
          {runs.data?.items.map((r) => <RunCard key={r.id} run={r} />)}
          {runs.data?.nextCursor && <Button title="Load more" variant="secondary" loading={loadingMore} onPress={loadMore} />}
        </>
      ) : (
        <>
          {events.data && events.data.length === 0 && <Empty title="No events yet" body="Events you join appear here." />}
          {events.data?.map((e) => <EventCard key={e.id} event={e} />)}
        </>
      )}

      <Button
        title="Sign out"
        variant="ghost"
        style={{ marginTop: spacing.xl }}
        onPress={() => Alert.alert('Sign out?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: signOut }])}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  name: { fontSize: 22, fontWeight: '800', color: colors.text },
  meta: { color: colors.textMuted, marginTop: 2 },
  club: { color: colors.text, marginTop: 4, fontWeight: '600' },
  editBtn: { padding: 8 },
  totals: { flexDirection: 'row', justifyContent: 'space-between' },
  pbRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pbLabel: { fontWeight: '600', color: colors.text },
  pbValue: { fontWeight: '800', fontSize: 16, color: colors.text, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
});
