import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SocialAuth } from '@/components/SocialAuth';
import { Button, ErrorText, Input, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, spacing } from '@/theme';

export default function Login() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.hero}>
          <Text style={styles.brand}>KOVI</Text>
          <Text style={styles.tagline}>Run. Compete. Share.</Text>
        </View>
        <View style={styles.form}>
          <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" onSubmitEditing={submit} />
          <ErrorText error={error} />
          <Button title="Sign in" size="lg" loading={busy} onPress={submit} disabled={!email || !password} />
          <Link href="/(auth)/forgot-password" style={styles.link}>Forgot password?</Link>
          <SocialAuth onError={setError} />
        </View>
        <Text style={styles.footer}>
          New to Kovi? <Link href="/(auth)/register" style={styles.linkInline}>Create an account</Link>
        </Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 48, paddingBottom: 32, alignItems: 'center' },
  brand: { fontSize: 40, fontWeight: '900', letterSpacing: 8, color: colors.text },
  tagline: { color: colors.textMuted, marginTop: 6, fontSize: 15 },
  form: { gap: spacing.md },
  link: { color: colors.primary, fontWeight: '600', textAlign: 'center', paddingVertical: 4 },
  linkInline: { color: colors.primary, fontWeight: '700' },
  footer: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
