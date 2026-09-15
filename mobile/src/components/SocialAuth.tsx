import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { colors } from '../theme';
import { Button } from './ui';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const googleConfigured = !!(GOOGLE_WEB || GOOGLE_IOS || GOOGLE_ANDROID);

/** Google (both platforms) and Apple (iOS) sign-in buttons. Hidden until the client IDs are configured. */
export function SocialAuth({ onError }: { onError: (msg: string) => void }) {
  const { signInWithApple } = useAuth();
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
  }, []);

  async function apple() {
    setBusy('apple');
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!cred.identityToken) throw new Error('Apple did not return a token');
      const fullName = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ') || undefined;
      await signInWithApple(cred.identityToken, fullName);
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') onError(e.message ?? 'Apple sign-in failed');
    } finally {
      setBusy(null);
    }
  }

  if (!googleConfigured && !appleAvailable) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.divider} />
      </View>
      {googleConfigured && <GoogleButton busy={busy === 'google'} setBusy={(b) => setBusy(b ? 'google' : null)} onError={onError} />}
      {appleAvailable && (
        <Button
          title="Apple"
          variant="dark"
          loading={busy === 'apple'}
          onPress={apple}
          icon={<Ionicons name="logo-apple" size={20} color="#fff" />}
        />
      )}
    </View>
  );
}

/** Mounted only when a Google client ID exists - the hook throws an invariant otherwise. */
function GoogleButton({ busy, setBusy, onError }: { busy: boolean; setBusy: (b: boolean) => void; onError: (m: string) => void }) {
  const { signInWithGoogle } = useAuth();
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB || undefined,
    iosClientId: GOOGLE_IOS || undefined,
    androidClientId: GOOGLE_ANDROID || undefined,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success' && response.params.id_token) {
      setBusy(true);
      signInWithGoogle(response.params.id_token)
        .catch((e) => onError(e.message))
        .finally(() => setBusy(false));
    } else if (response.type === 'error') {
      onError(response.error?.message ?? 'Google sign-in failed');
    }
  }, [response]);

  return (
    <Button
      title="Google"
      variant="secondary"
      disabled={!request}
      loading={busy}
      onPress={() => promptAsync()}
      icon={<Ionicons name="logo-google" size={18} color={colors.text} />}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginTop: 8 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 12 },
});
