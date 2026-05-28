import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Keyboard, StyleSheet, View } from 'react-native';

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
  const keyboardInset = useKeyboardInset();

  return (
    <View style={[styles.container, { marginBottom: keyboardInset }]}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={isDark ? Colors.dark.text : Colors.light.text} size="large" />
      </View>
      <RichTextEditorDom
        initialHtml={initialHtml}
        hideToolbarScrollbar
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

function useKeyboardInset() {
  const isKeyboardVisibleRef = useRef(false);
  const visibleWindowHeightRef = useRef(Dimensions.get('window').height);
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const dimensionsSubscription = Dimensions.addEventListener('change', ({ window }) => {
      if (!isKeyboardVisibleRef.current) {
        visibleWindowHeightRef.current = window.height;
      }
    });
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      isKeyboardVisibleRef.current = true;

      const currentWindowHeight = Dimensions.get('window').height;
      const nativeResizeAmount = Math.max(0, visibleWindowHeightRef.current - currentWindowHeight);

      setKeyboardInset(Math.max(0, event.endCoordinates.height - nativeResizeAmount));
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      isKeyboardVisibleRef.current = false;
      visibleWindowHeightRef.current = Dimensions.get('window').height;
      setKeyboardInset(0);
    });

    return () => {
      dimensionsSubscription.remove();
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return keyboardInset;
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
