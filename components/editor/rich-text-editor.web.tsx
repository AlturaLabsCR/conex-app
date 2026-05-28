import { useEffect, useState, type ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedActivityIndicator } from '@/components/themed-activity-indicator';

import type { RichTextEditorContentProps } from './rich-text-editor-content';

type RichTextEditorProps = {
  initialHtml: string;
  isDirty: boolean;
  isDark: boolean;
  isSaving: boolean;
  onReady?: () => void;
  onHtmlChange: (html: string) => void;
  onSync: () => void | Promise<void>;
};

export function RichTextEditor({
  initialHtml,
  isDirty,
  isDark,
  isSaving,
  onReady,
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
          onReady={onReady}
          onHtmlChange={onHtmlChange}
          onSync={onSync}
        />
      ) : (
        <View style={styles.loadingContainer}>
          <ThemedActivityIndicator />
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
