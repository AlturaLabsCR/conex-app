import { StyleSheet, View, type ViewProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type BodyNoticeVariant = 'note' | 'tip' | 'warning' | 'error';

type BodyNoticeProps = ViewProps & {
  message: string;
  title?: string;
  variant?: BodyNoticeVariant;
};

const NOTICE_COLORS = {
  light: {
    note: { background: '#EAF4FB', border: '#5AA6D6', text: '#0F4F73' },
    tip: { background: '#EAF7EF', border: '#56A36C', text: '#245B34' },
    warning: { background: '#FFF4D6', border: '#D99A22', text: '#6E4A00' },
    error: { background: '#FDECEC', border: '#D65A5A', text: '#7A2020' },
  },
  dark: {
    note: { background: '#123142', border: '#65B7E6', text: '#D9F0FF' },
    tip: { background: '#173522', border: '#6EC17E', text: '#DFF5E5' },
    warning: { background: '#3A2D10', border: '#E0AC37', text: '#FFF0C2' },
    error: { background: '#3B1717', border: '#E06B6B', text: '#FFE1E1' },
  },
} as const;

export function BodyNotice({
  message,
  title,
  variant = 'note',
  style,
  ...rest
}: BodyNoticeProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = NOTICE_COLORS[colorScheme][variant];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
        style,
      ]}
      {...rest}>
      {title ? (
        <ThemedText type="defaultSemiBold" style={[styles.title, { color: colors.text }]}>
          {title}
        </ThemedText>
      ) : null}
      <ThemedText style={[styles.message, { color: colors.text }]}>{message}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderLeftWidth: 4,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  title: {
    textTransform: 'uppercase',
  },
  message: {
    lineHeight: 22,
  },
});
