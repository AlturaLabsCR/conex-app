import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

type Props = PropsWithChildren;

export default function ThemedScrollView({
  children,
}: Props) {
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <ScrollView style={{ backgroundColor, flex: 1 }} scrollEventThrottle={16}>
      <ThemedView style={styles.content}>{children}</ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: 'hidden',
  },
});
