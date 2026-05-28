'use dom';

import { RichTextEditorContent, type RichTextEditorContentProps } from './rich-text-editor-content';

type RichTextEditorProps = RichTextEditorContentProps & {
  dom?: unknown;
};

export default function RichTextEditor(props: RichTextEditorProps) {
  return <RichTextEditorContent {...props} />;
}
