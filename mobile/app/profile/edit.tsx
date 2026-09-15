import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, ErrorText, Input, Screen } from '@/components/ui';
import { api, type User } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, spacing } from '@/theme';

export default function EditProfile() {
  const { user, setUser } = useAuth();
  const router = useRouter();
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

  async function save() {
    setError(null);
    setBusy(true);
    try {
      if (photo) await api.upload<User>('/users/me/photo', photo);
      const updated = await api.patch<User>('/users/me', { name: name.trim(), city: city.trim(), state: state.trim(), country: country.trim(), club: club.trim() });
      setUser(updated);
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.top}>
          <Text style={styles.cancel} onPress={() => router.back()}>Cancel</Text>
          <Text style={styles.title}>Edit profile</Text>
          <View style={{ width: 50 }} />
        </View>
        <Pressable onPress={pickPhoto} style={styles.photo}>
          <Avatar url={photo ?? user?.photoUrl} name={name || '?'} size={96} />
          <Text style={styles.photoHint}>Change photo</Text>
        </Pressable>
        <View style={styles.form}>
          <Input label="Name" value={name} onChangeText={setName} />
          <Input label="City" value={city} onChangeText={setCity} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}><Input label="State" value={state} onChangeText={setState} /></View>
            <View style={{ flex: 1 }}><Input label="Country" value={country} onChangeText={setCountry} /></View>
          </View>
          <Input label="Running club" value={club} onChangeText={setClub} placeholder="Optional" />
          <ErrorText error={error} />
          <Button title="Save" size="lg" loading={busy} onPress={save} disabled={!name.trim()} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  cancel: { color: colors.primary, fontWeight: '600', fontSize: 16, width: 50 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  photo: { alignItems: 'center', gap: 8, marginVertical: spacing.xl },
  photoHint: { color: colors.primary, fontWeight: '600' },
  form: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
});
