import { Link } from 'expo-router';
import { Text } from 'react-native';
import { Empty, Screen } from '@/components/ui';
import { colors } from '@/theme';

export default function NotFound() {
  return (
    <Screen>
      <Empty title="Page not found" />
      <Link href="/" style={{ color: colors.primary, textAlign: 'center', fontWeight: '600' }}><Text>Go home</Text></Link>
    </Screen>
  );
}
