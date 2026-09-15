import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EventCard, RunCard } from '@/components/cards';
import { Avatar, Empty, Screen, SectionHeader } from '@/components/ui';
import type { JoinedEvent, RunSummary } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/lib/auth';
import { formatKm } from '@/lib/format';
import { discardInterruptedRun, loadInterruptedRun, restoreInterruptedRun, useTracker } from '@/lib/runTracker';
import { colors, radius, spacing } from '@/theme';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const tracker = useTracker();
  const runs = useApi<{ items: RunSummary[] }>('/runs?take=5');
  const events = useApi<JoinedEvent[]>('/users/me/events');
  const [checkedInterrupted, setCheckedInterrupted] = useState(false);

  useFocusEffect(
    useCallback(() => {
      runs.reload();
      events.reload();
    }, []),
  );

  // Offer to recover a run that was cut short by the app being killed.
  useEffect(() => {
    if (checkedInterrupted) return;
    setCheckedInterrupted(true);
    loadInterruptedRun().then((saved) => {
      if (!saved) return;
      Alert.alert(
        'Unfinished run found',
        `You have an unfinished run of ${formatKm(saved.distanceMeters)} km. Resume it?`,
        [
          { text: 'Discard', style: 'destructive', onPress: () => discardInterruptedRun() },
          { text: 'Resume', onPress: async () => { await restoreInterruptedRun(saved); router.push('/run'); } },
        ],
      );
    });
  }, [checkedInterrupted]);

  const upcoming = (events.data ?? []).filter((e) => new Date(e.date).getTime() >= Date.now() - 6 * 3600 * 1000).sort((a, b) => a.date.localeCompare(b.date));
  const refreshing = runs.refreshing || events.refreshing;

  return (
    <Screen padded={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { runs.refresh(); events.refresh(); }} tintColor={colors.primary} />}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hi {user?.name.split(' ')[0]} 👋</Text>
          <Text style={styles.sub}>{user?.city ? `Ready to run in ${user.city}?` : 'Ready to run?'}</Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/profile')}>
          <Avatar url={user?.photoUrl} name={user?.name ?? '?'} size={44} />
        </Pressable>
      </View>

      <Pressable style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]} onPress={() => router.push('/run')}>
        <View style={styles.ctaIcon}>
          <Ionicons name={tracker.status === 'idle' ? 'play' : 'pulse'} size={28} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaTitle}>{tracker.status === 'idle' ? 'Start Run' : 'Run in progress'}</Text>
          <Text style={styles.ctaSub}>
            {tracker.status === 'idle' ? 'GPS tracking with live pace and distance' : `${formatKm(tracker.distanceMeters)} km so far · tap to return`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
      </Pressable>

      <View style={{ paddingHorizontal: spacing.lg }}>
        <SectionHeader title="Upcoming events" action="Browse" onAction={() => router.push('/(tabs)/events')} />
      </View>
      {upcoming.length === 0 ? (
        <Empty title="No joined events" body="Join an event to see it here and run it in Event Mode." />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {upcoming.map((e) => <EventCard key={e.id} event={e} compact />)}
        </ScrollView>
      )}

      <View style={{ paddingHorizontal: spacing.lg }}>
        <SectionHeader title="Recent activities" action={runs.data?.items.length ? 'See all' : undefined} onAction={() => router.push('/(tabs)/profile')} />
        {runs.data && runs.data.items.length === 0 ? (
          <Empty title="No runs yet" body="Your first run will show up here." />
        ) : (
          runs.data?.items.map((r) => <RunCard key={r.id} run={r} />)
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, paddingBottom: spacing.md },
  greeting: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { color: colors.textMuted, marginTop: 2 },
  cta: { marginHorizontal: spacing.lg, backgroundColor: colors.dark, borderRadius: radius.xl, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ctaIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  ctaTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  ctaSub: { color: 'rgba(255,255,255,0.65)', marginTop: 2, fontSize: 13 },
});
