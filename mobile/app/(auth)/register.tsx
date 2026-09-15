import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SocialAuth } from '@/components/SocialAuth';
import { Button, ErrorText, Input, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, spacing } from '@/theme';

export default function Register() {
  const { signUpWithEmail } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setError(null);
    setBusy(true);
    try {
      await signUpWithEmail(email.trim(), password, name.trim());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={styles.back} onPress={() => router.back()}>‹ Back</Text>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Track runs, join events and climb the leaderboards.</Text>
        <View style={styles.form}>
          <Input label="Name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
          <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" placeholder="At least 8 characters" />
          <ErrorText error={error} />
          <Button title="Sign up" size="lg" loading={busy} onPress={submit} disabled={!name || !email || !password} />
          <SocialAuth onError={setError} />
        </View>
        <Text style={styles.footer}>
          Already have an account? <Link href="/(auth)/login" style={styles.linkInline}>Sign in</Link>
        </Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.primary, fontWeight: '600', fontSize: 16, paddingVertical: 8 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 12 },
  subtitle: { color: colors.textMuted, marginTop: 6, marginBottom: spacing.xl, fontSize: 15 },
  form: { gap: spacing.md },
  linkInline: { color: colors.primary, fontWeight: '700' },
  footer: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
