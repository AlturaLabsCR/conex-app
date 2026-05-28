import { ActivityIndicator, type ActivityIndicatorProps } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function ThemedActivityIndicator({ color, size = 'large', ...props }: ActivityIndicatorProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];

  return <ActivityIndicator color={color ?? themeColors.text} size={size} {...props} />;
}
