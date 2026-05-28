import { useEffect, useState, type ComponentType } from 'react';
import { View } from 'react-native';

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
      ) : null}
    </View>
  );
}
