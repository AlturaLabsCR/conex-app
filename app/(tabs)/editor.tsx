import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// eslint-disable-next-line import/no-unresolved -- Metro resolves the .web/.native editor files.
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { localSiteRepository } from '@/features/sites/site-repository';
import type { SiteWithContent } from '@/features/sites/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/i18n';

export default function EditorScreen() {
  const { sitePath } = useLocalSearchParams<{ sitePath?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [site, setSite] = useState<SiteWithContent | null>(null);
  const [draftHtml, setDraftHtml] = useState('');
  const [savedHtml, setSavedHtml] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const selectedPath = useMemo(() => {
    if (Array.isArray(sitePath)) {
      return sitePath[0];
    }

    return sitePath;
  }, [sitePath]);

  useEffect(() => {
    let isMounted = true;

    async function loadSite() {
      setIsLoading(true);

      const sites = await localSiteRepository.listSites();
      const fallbackPath = sites[0]?.path;
      const nextSite = selectedPath
        ? await localSiteRepository.getSite(selectedPath)
        : fallbackPath
          ? await localSiteRepository.getSite(fallbackPath)
          : null;

      if (isMounted) {
        setSite(nextSite);
        setDraftHtml(nextSite?.contentHtml ?? '');
        setSavedHtml(nextSite?.contentHtml ?? '');
        setIsLoading(false);
      }
    }

    loadSite();

    return () => {
      isMounted = false;
    };
  }, [selectedPath]);

  const isDirty = draftHtml !== savedHtml;

  const handleSync = useCallback(async () => {
    if (!site || !isDirty) {
      return;
    }

    setIsSaving(true);
    const syncedSite = await localSiteRepository.saveSiteContent(site.path, draftHtml);

    if (syncedSite) {
      setSite(syncedSite);
      setSavedHtml(syncedSite.contentHtml);
    }

    setIsSaving(false);
  }, [draftHtml, isDirty, site]);

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top + 32 }]}>
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator color={themeColors.text} size="large" />
          </View>
        ) : site ? (
          <>
            <View style={styles.titleContainer}>
              <ThemedText type="title">{site.name}</ThemedText>
            </View>

            <View style={styles.editorFrame}>
              <RichTextEditor
                key={site.path}
                initialHtml={savedHtml}
                isDirty={isDirty}
                isDark={colorScheme === 'dark'}
                isSaving={isSaving}
                onHtmlChange={setDraftHtml}
                onSync={handleSync}
              />
            </View>
          </>
        ) : (
          <View style={styles.stateContainer}>
            <ThemedText>{t('editor.noSiteSelected')}</ThemedText>
          </View>
        )}
      </View>

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editorFrame: {
    flex: 1,
    overflow: 'hidden',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
