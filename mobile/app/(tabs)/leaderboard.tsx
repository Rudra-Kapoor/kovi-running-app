import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar, Card, Chip, Empty, ErrorText, Loading, RankBadge, Screen } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import type { GlobalLeaderboard, GlobalLeaderboardRow } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CATEGORY_LABEL, formatDuration, type DistanceCategory } from '@/lib/format';
import { colors, spacing } from '@/theme';

type Scope = 'world' | 'country' | 'state' | 'city';

export default function Leaderboard() {
  const { user } = useAuth();
  const [category, setCategory] = useState<DistanceCategory>('FIVE_K');
  const [scope, setScope] = useState<Scope>('world');

  const params = new URLSearchParams({ category });
  if (scope === 'city' && user?.city) params.set('city', user.city);
  if (scope === 'state' && user?.state) params.set('state', user.state);
  if (scope === 'country' && user?.country) params.set('country', user.country);
  const { data, error, loading, refreshing, refresh } = useApi<GlobalLeaderboard>(`/leaderboard?${params}`, [category, scope]);

  const scopes: { key: Scope; label: string }[] = [
    { key: 'world', label: 'Everyone' },
    ...(user?.country ? [{ key: 'country' as Scope, label: user.country }] : []),
    ...(user?.state ? [{ key: 'state' as Scope, label: user.state }] : []),
    ...(user?.city ? [{ key: 'city' as Scope, label: user.city }] : []),
  ];

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <Text style={styles.title}>Leaderboard</Text>
      <Text style={styles.sub}>Fastest times, from every run recorded on Kovi.</Text>
      <View style={styles.chips}>
        {(Object.keys(CATEGORY_LABEL) as DistanceCategory[]).map((c) => (
          <Chip key={c} label={CATEGORY_LABEL[c]} active={category === c} onPress={() => setCategory(c)} />
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {scopes.map((s) => <Chip key={s.key} label={s.label} active={scope === s.key} onPress={() => setScope(s.key)} />)}
      </ScrollView>
      <ErrorText error={error} />
      {loading && !data ? (
        <Loading />
      ) : data && data.items.length === 0 ? (
        <Empty title="No times yet" body={`Complete a ${CATEGORY_LABEL[category]} to claim the top spot.`} />
      ) : (
        <Card style={{ padding: 0 }}>
          {data?.items.map((row) => <Row key={row.userId} row={row} me={row.userId === user?.id} />)}
        </Card>
      )}
      {data?.me && !data.items.some((r) => r.userId === data.me!.userId) && (
        <>
          <Text style={styles.youLabel}>Your position</Text>
          <Card style={{ padding: 0 }}><Row row={data.me} me /></Card>
        </>
      )}
    </Screen>
  );
}

function Row({ row, me }: { row: GlobalLeaderboardRow; me?: boolean }) {
  return (
    <View style={[styles.row, me && styles.rowMe]}>
      <RankBadge rank={row.rank} />
      <Avatar url={row.photoUrl} name={row.name} size={36} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{row.name}{me ? ' (you)' : ''}</Text>
        <Text style={styles.meta} numberOfLines={1}>{[row.club, row.city].filter(Boolean).join(' · ') || '—'}</Text>
      </View>
      <Text style={styles.time}>{formatDuration(row.seconds)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  sub: { color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  chips: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowMe: { backgroundColor: colors.primarySoft },
  name: { fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  time: { fontWeight: '800', fontSize: 16, color: colors.text, fontVariant: ['tabular-nums'] },
  youLabel: { marginTop: spacing.lg, marginBottom: spacing.sm, fontWeight: '700', color: colors.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
});
