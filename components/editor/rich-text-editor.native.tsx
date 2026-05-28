import { StyleSheet } from 'react-native';

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
    <RichTextEditorDom
      initialHtml={initialHtml}
      isDirty={isDirty}
      isDark={isDark}
      isSaving={isSaving}
      onHtmlChange={onHtmlChange}
      onSync={onSync}
      dom={domProps}
    />
  );
}

const domProps = {
  useExpoDOMWebView: true,
  style: StyleSheet.absoluteFill,
};
