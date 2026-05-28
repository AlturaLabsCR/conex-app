import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, StyleSheet, View } from 'react-native';

import { ThemedActivityIndicator } from '@/components/themed-activity-indicator';
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
  const { editorRef, keyboardInset, updateKeyboardInset } = useKeyboardInset();
  const [isEditorReady, setIsEditorReady] = useState(false);
  const handleEditorReady = useCallback(() => {
    setIsEditorReady(true);
  }, []);

  return (
    <View ref={editorRef} style={styles.container} onLayout={updateKeyboardInset}>
      {!isEditorReady ? (
        <View style={styles.loadingContainer}>
          <ThemedActivityIndicator />
        </View>
      ) : null}
      <RichTextEditorDom
        initialHtml={initialHtml}
        hideToolbarScrollbar
        isDirty={isDirty}
        isDark={isDark}
        isSaving={isSaving}
        keyboardInset={keyboardInset}
        onHtmlChange={onHtmlChange}
        onReady={handleEditorReady}
        onSync={onSync}
        dom={domProps}
      />
    </View>
  );
}

function useKeyboardInset() {
  const editorRef = useRef<View>(null);
  const keyboardTopRef = useRef<number | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const updateKeyboardInset = useCallback(() => {
    const keyboardTop = keyboardTopRef.current;

    if (keyboardTop === null) {
      setKeyboardInset(0);
      return;
    }

    editorRef.current?.measureInWindow((_x, y, _width, height) => {
      setKeyboardInset(Math.max(0, y + height - keyboardTop));
    });
  }, []);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      const windowHeight = Dimensions.get('window').height;
      const keyboardTop = windowHeight - event.endCoordinates.height;

      keyboardTopRef.current =
        event.endCoordinates.screenY > 0
          ? Math.min(event.endCoordinates.screenY, keyboardTop)
          : keyboardTop;

      requestAnimationFrame(updateKeyboardInset);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTopRef.current = null;
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [updateKeyboardInset]);

  return { editorRef, keyboardInset, updateKeyboardInset };
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
