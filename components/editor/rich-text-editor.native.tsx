import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import RichTextEditorDom from './rich-text-editor.dom';

type RichTextEditorProps = {
  initialHtml: string;
  isDirty: boolean;
  isDark: boolean;
  isSaving: boolean;
  onHtmlChange: (html: string) => void;
  onSync: () => void | Promise<void>;
};

export function RichTextEditor({
  initialHtml,
  isDirty,
  isDark,
  isSaving,
  onHtmlChange,
  onSync,
}: RichTextEditorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={isDark ? Colors.dark.control : Colors.light.control} />
      </View>
      <RichTextEditorDom
        initialHtml={initialHtml}
        isDirty={isDirty}
        isDark={isDark}
        isSaving={isSaving}
        onHtmlChange={onHtmlChange}
        onSync={onSync}
        dom={domProps}
      />
    </View>
  );
}

const domProps = {
  useExpoDOMWebView: false,
  style: StyleSheet.absoluteFill,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
