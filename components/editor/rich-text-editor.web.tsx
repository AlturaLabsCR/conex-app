import { useEffect, useState, type ComponentType } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

import type { RichTextEditorContentProps } from './rich-text-editor-content';

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
  const [EditorContent, setEditorContent] = useState<ComponentType<RichTextEditorContentProps> | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;

    import('./rich-text-editor-content').then((module) => {
      if (isMounted) {
        setEditorContent(() => module.RichTextEditorContent);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {EditorContent ? (
        <EditorContent
          initialHtml={initialHtml}
          isDirty={isDirty}
          isDark={isDark}
          isSaving={isSaving}
          onHtmlChange={onHtmlChange}
          onSync={onSync}
        />
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={isDark ? Colors.dark.text : Colors.light.text} size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
