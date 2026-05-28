import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// eslint-disable-next-line import/no-unresolved -- Metro resolves the .web/.native editor files.
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { BodyNotice } from '@/components/body-notice';
import { ThemedActivityIndicator } from '@/components/themed-activity-indicator';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { siteDraftRepository } from '@/features/sites/site-draft-repository';
import { siteRepository } from '@/features/sites/site-repository';
import type { SiteWithContent } from '@/features/sites/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/i18n';

export default function EditorScreen() {
  const { sitePath } = useLocalSearchParams<{ sitePath?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [site, setSite] = useState<SiteWithContent | null>(null);
  const [draftHtml, setDraftHtml] = useState('');
  const [savedHtml, setSavedHtml] = useState('');
  const [error, setError] = useState('');
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
      setError('');

      try {
        const sites = await siteRepository.listSites();
        const fallbackPath = sites[0]?.path;
        const nextSite = selectedPath
          ? await siteRepository.getSite(selectedPath)
          : fallbackPath
            ? await siteRepository.getSite(fallbackPath)
            : null;

        const localDraftHtml = nextSite
          ? await siteDraftRepository.getSiteDraft(nextSite.sub, nextSite.path)
          : null;

        if (isMounted) {
          setSite(nextSite);
          setDraftHtml(localDraftHtml ?? nextSite?.contentHtml ?? '');
          setSavedHtml(nextSite?.contentHtml ?? '');
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load site.');
          setSite(null);
          setDraftHtml('');
          setSavedHtml('');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
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
    setError('');

    try {
      const syncedSite = await siteRepository.saveSiteContent(site.path, draftHtml);

      if (syncedSite) {
        await siteDraftRepository.deleteSiteDraft(site.sub, site.path);
        setSite(syncedSite);
        setSavedHtml(draftHtml);
      }
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Unable to sync changes.');
    } finally {
      setIsSaving(false);
    }
  }, [draftHtml, isDirty, site]);

  const persistLocalDraft = useCallback(
    async (nextHtml: string) => {
      if (!site) {
        return;
      }

      try {
        if (nextHtml === savedHtml) {
          await siteDraftRepository.deleteSiteDraft(site.sub, site.path);
        } else {
          await siteDraftRepository.saveSiteDraft(site.sub, site.path, nextHtml);
        }
      } catch (draftError) {
        setError(draftError instanceof Error ? draftError.message : 'Unable to store local draft.');
      }
    },
    [savedHtml, site]
  );

  const handleHtmlChange = useCallback(
    (nextHtml: string) => {
      setDraftHtml(nextHtml);
      void persistLocalDraft(nextHtml);
    },
    [persistLocalDraft]
  );

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top + 32 }]}>
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.stateContainer}>
            <ThemedActivityIndicator />
          </View>
        ) : error && !site ? (
          <View style={styles.stateContainer}>
            <BodyNotice message={error} variant="error" />
          </View>
        ) : site ? (
          <>
            <View style={styles.titleContainer}>
              <ThemedText type="title">{site.name}</ThemedText>
            </View>
            {error ? <BodyNotice message={error} variant="error" /> : null}

            <View style={styles.editorFrame}>
              <RichTextEditor
                key={site.path}
                initialHtml={draftHtml}
                isDirty={isDirty}
                isDark={colorScheme === 'dark'}
                isSaving={isSaving}
                onHtmlChange={handleHtmlChange}
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
