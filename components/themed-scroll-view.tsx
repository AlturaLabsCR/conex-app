import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

type Props = PropsWithChildren<Pick<ScrollViewProps, 'keyboardShouldPersistTaps'>>;

export default function ThemedScrollView({
  children,
  keyboardShouldPersistTaps,
}: Props) {
  const backgroundColor = useThemeColor({}, 'background');
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      style={{ backgroundColor, flex: 1 }}
      scrollEventThrottle={16}>
      <ThemedView style={[styles.content, { paddingTop: insets.top + 32 }]}>{children}</ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: 18,
    gap: 16,
    overflow: 'hidden',
  },
});
