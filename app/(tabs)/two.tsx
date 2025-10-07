import { ScrollView, StyleSheet } from 'react-native';
import { useState } from 'react';

import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';

import Editor from "@/components/Editor/Editor"

export default function TabTwoScreen() {
  const [plainText, setPlainText] = useState("");
  const [editorState, setEditorState] = useState<string | null>(null);
  return (
    <>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Editor setPlainText={setPlainText} setEditorState={setEditorState} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
  scrollContainer: {
    flexGrow: 1,
  },
});
