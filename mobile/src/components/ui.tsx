import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing } from '../theme';

// ---------- Layout ----------

export function Screen({
  children,
  scroll = true,
  padded = true,
  dark = false,
  style,
  edges = ['top'],
  refreshControl,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  refreshControl?: ReactNode;
}) {
  const bg = dark ? colors.dark : colors.bg;
  const inner = [padded && styles.padded, style];
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: bg }]} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[inner, { paddingBottom: spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl as any}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body && <Text style={styles.emptyBody}>{body}</Text>}
    </View>
  );
}

export function Loading() {
  return (
    <View style={[styles.flex, styles.center]}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function ErrorText({ error }: { error: string | null }) {
  return error ? <Text style={styles.error}>{error}</Text> : null;
}

// ---------- Controls ----------

type ButtonProps = PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
  loading?: boolean;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  icon?: ReactNode;
};

export function Button({ title, variant = 'primary', loading, disabled, size = 'md', style, icon, ...rest }: ButtonProps) {
  const isDisabled = disabled || loading;
  const bg = { primary: colors.primary, secondary: colors.surface, ghost: 'transparent', danger: colors.surface, dark: colors.dark }[variant];
  const fg = { primary: '#fff', secondary: colors.text, ghost: colors.primary, danger: colors.danger, dark: '#fff' }[variant];
  const border = variant === 'secondary' ? colors.border : variant === 'danger' ? '#FBD5D0' : 'transparent';
  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        size === 'lg' && styles.buttonLg,
        { backgroundColor: bg, borderColor: border, opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1 },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text style={[styles.buttonText, size === 'lg' && { fontSize: 17 }, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Input({ label, error, style, ...rest }: TextInputProps & { label?: string; error?: string | null }) {
  return (
    <View style={{ gap: 6 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error && { borderColor: colors.danger }, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function Avatar({ url, name, size = 40 }: { url: string | null | undefined; name: string; size?: number }) {
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: size * 0.42 }}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export function Stat({ value, label, size = 'md', dark = false, style }: { value: string; label: string; size?: 'md' | 'lg' | 'xl'; dark?: boolean; style?: StyleProp<ViewStyle> }) {
  const fontSize = { md: 22, lg: 34, xl: 72 }[size];
  return (
    <View style={style}>
      <Text style={[styles.statValue, { fontSize, color: dark ? '#fff' : colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, dark && { color: 'rgba(255,255,255,0.6)' }]}>{label}</Text>
    </View>
  );
}

export function RankBadge({ rank }: { rank: number }) {
  const bg = rank === 1 ? colors.gold : rank === 2 ? colors.silver : rank === 3 ? colors.bronze : colors.surfaceAlt;
  const fg = rank <= 3 ? '#fff' : colors.textMuted;
  return (
    <View style={[styles.rank, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontWeight: '800', fontSize: 13 }}>{rank}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  padded: { padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  sectionAction: { color: colors.primary, fontWeight: '600' },
  empty: { padding: spacing.xl, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  emptyBody: { color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.danger, fontSize: 13 },
  button: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 18, borderRadius: radius.md, borderWidth: 1 },
  buttonLg: { paddingVertical: 17, borderRadius: radius.lg },
  buttonText: { fontWeight: '700', fontSize: 15 },
  label: { fontWeight: '600', fontSize: 13, color: colors.text },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  chipText: { fontWeight: '600', color: colors.text },
  chipTextActive: { color: '#fff' },
  avatarFallback: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontWeight: '800', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  statLabel: { color: colors.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 },
  rank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
