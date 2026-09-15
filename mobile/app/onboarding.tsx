import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, ErrorText, Input, Screen } from '@/components/ui';
import { api, type User } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, spacing } from '@/theme';

/** First-run profile setup: name, optional photo, city/state/country, optional running club. */
export default function Onboarding() {
  const { user, setUser, signOut } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [state, setState] = useState(user?.state ?? '');
  const [country, setCountry] = useState(user?.country ?? '');
  const [club, setClub] = useState(user?.club ?? '');
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!res.canceled) setPhoto(res.assets[0].uri);
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (photo) await api.upload<User>('/users/me/photo', photo);
      const updated = await api.patch<User>('/users/me', {
        name: name.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        club: club.trim(),
        onboardingCompleted: true,
      });
      setUser(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.subtitle}>This is how you'll appear on leaderboards.</Text>
        <Pressable onPress={pickPhoto} style={styles.photo}>
          <Avatar url={photo ?? user?.photoUrl} name={name || '?'} size={96} />
          <Text style={styles.photoHint}>{photo || user?.photoUrl ? 'Change photo' : 'Add a photo (optional)'}</Text>
        </Pressable>
        <View style={styles.form}>
          <Input label="Name" value={name} onChangeText={setName} />
          <Input label="City" value={city} onChangeText={setCity} placeholder="e.g. Mumbai" />
          <View style={styles.row}>
            <View style={{ flex: 1 }}><Input label="State" value={state} onChangeText={setState} /></View>
            <View style={{ flex: 1 }}><Input label="Country" value={country} onChangeText={setCountry} /></View>
          </View>
          <Input label="Running club (optional)" value={club} onChangeText={setClub} placeholder="e.g. Mumbai Road Runners" />
          <ErrorText error={error} />
          <Button title="Let's run" size="lg" loading={busy} onPress={submit} disabled={!name.trim() || !city.trim() || !country.trim()} />
          <Button title="Sign out" variant="ghost" onPress={signOut} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 24 },
  subtitle: { color: colors.textMuted, marginTop: 6, fontSize: 15 },
  photo: { alignItems: 'center', gap: 8, marginVertical: spacing.xl },
  photoHint: { color: colors.primary, fontWeight: '600' },
  form: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
});
