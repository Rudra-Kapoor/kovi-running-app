import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Button, ErrorText, Input, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, spacing } from '@/theme';

/** Two steps: request a 6-digit code by email, then set a new password with it. */
export default function ForgotPassword() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    setError(null);
    setBusy(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() }, false);
      setStep('code');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setError(null);
    setBusy(true);
    try {
      await resetPassword(email.trim(), code.trim(), password); // signs the user in on success
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
        <Text style={styles.title}>Reset password</Text>
        {step === 'email' ? (
          <View style={styles.form}>
            <Text style={styles.subtitle}>Enter your email and we'll send you a 6-digit code.</Text>
            <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <ErrorText error={error} />
            <Button title="Send code" size="lg" loading={busy} onPress={sendCode} disabled={!email} />
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.subtitle}>If an account exists for {email}, a code is on its way. It expires in 15 minutes.</Text>
            <Input label="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
            <Input label="New password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 8 characters" />
            <ErrorText error={error} />
            <Button title="Set new password" size="lg" loading={busy} onPress={reset} disabled={code.length !== 6 || !password} />
            <Button title="Resend code" variant="ghost" onPress={sendCode} />
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.primary, fontWeight: '600', fontSize: 16, paddingVertical: 8 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 12, marginBottom: spacing.md },
  subtitle: { color: colors.textMuted, fontSize: 15, marginBottom: spacing.sm },
  form: { gap: spacing.md },
});
