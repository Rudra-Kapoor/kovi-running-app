import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { EventCard } from '@/components/cards';
import { Chip, Empty, ErrorText, Loading, Screen } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import type { EventSummary } from '@/lib/api';
import { colors, spacing } from '@/theme';

export default function Events() {
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const { data, error, loading, refreshing, refresh, reload } = useApi<EventSummary[]>(`/events?filter=${filter}`, [filter]);

  useFocusEffect(useCallback(() => { reload(); }, [filter]));

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <Text style={styles.title}>Events</Text>
      <Text style={styles.sub}>Organised runs you can join and race in Event Mode.</Text>
      <View style={styles.chips}>
        <Chip label="Upcoming" active={filter === 'upcoming'} onPress={() => setFilter('upcoming')} />
        <Chip label="Past" active={filter === 'past'} onPress={() => setFilter('past')} />
      </View>
      <ErrorText error={error} />
      {loading && !data ? (
        <Loading />
      ) : data && data.length === 0 ? (
        <Empty title={filter === 'upcoming' ? 'No upcoming events' : 'No past events'} body={filter === 'upcoming' ? 'Check back soon - new events are added regularly.' : undefined} />
      ) : (
        data?.map((e) => <EventCard key={e.id} event={e} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  sub: { color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  chips: { flexDirection: 'row', gap: 8, marginBottom: spacing.lg },
});
