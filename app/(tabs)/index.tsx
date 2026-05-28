import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import ThemedScrollView from '@/components/themed-scroll-view';
import { BodyNotice } from '@/components/body-notice';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { siteRepository } from '@/features/sites/site-repository';
import { useSites } from '@/features/sites/use-sites';
import type { Site } from '@/features/sites/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/i18n';

export default function SitesScreen() {
  const { t } = useTranslation();
  const { error, isLoading, reloadSites, sites } = useSites();
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];
  const router = useRouter();

  return (
    <ThemedScrollView keyboardShouldPersistTaps="handled">
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">{t('screens.sites.heading')}</ThemedText>
        </ThemedView>

        {isLoading ? (
          <ActivityIndicator color={themeColors.control} />
        ) : error ? (
          <BodyNotice message={error} variant="error" />
        ) : (
          <ThemedView style={styles.siteList}>
            {sites.map((site) => (
              <SiteCard
                key={site.path}
                onVisibilityChange={reloadSites}
                site={site}
                onOpen={() =>
                  router.push({ pathname: '/editor', params: { sitePath: site.path } })
                }
              />
            ))}
          </ThemedView>
        )}

        <CreateSiteForm
          onCreated={async (site) => {
            await reloadSites();
            router.push({ pathname: '/editor', params: { sitePath: site.path } });
          }}
        />
      </ThemedView>
    </ThemedScrollView>
  );
}

function CreateSiteForm({ onCreated }: { onCreated: (site: Site) => void | Promise<void> }) {
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];
  const { t } = useTranslation();
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isPathManual, setIsPathManual] = useState(false);
  const [name, setName] = useState('');
  const [path, setPath] = useState('');

  const canCreate = Boolean(name.trim() && isValidSitePath(path)) && !isCreating;

  function handleNameChange(nextName: string) {
    setName(nextName);

    if (!isPathManual) {
      setPath(sitePathFromName(nextName));
    }
  }

  function handlePathChange(nextPath: string) {
    setIsPathManual(true);
    setPath(normalizeSitePath(nextPath));
  }

  async function handleCreate() {
    if (!canCreate) {
      return;
    }

    setCreateError('');
    setIsCreating(true);

    try {
      const site = await siteRepository.createSite({
        name: name.trim(),
        path: path.trim(),
      });

      setIsPathManual(false);
      setName('');
      setPath('');
      await onCreated(site);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : t('sites.createError'));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <ThemedView
      style={[
        styles.createPanel,
        { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border },
      ]}>
      <ThemedText style={styles.createHeading}>{t('sites.createHeading')}</ThemedText>
      {createError ? <BodyNotice message={createError} variant="error" /> : null}
      <TextInput
        autoCapitalize="words"
        autoCorrect={false}
        onChangeText={handleNameChange}
        placeholder={t('sites.namePlaceholder')}
        placeholderTextColor={themeColors.icon}
        style={[
          styles.input,
          {
            backgroundColor: themeColors.background,
            borderColor: themeColors.border,
            color: themeColors.text,
          },
        ]}
        value={name}
      />
      <View style={styles.publicUrlGroup}>
        <ThemedText style={[styles.publicUrlLabel, { color: themeColors.secondaryControl }]}>
          {t('sites.publicUrlLabel')}
        </ThemedText>
        <View
          style={[
            styles.urlInput,
            {
              backgroundColor: themeColors.background,
              borderColor: themeColors.border,
            },
          ]}>
          <ThemedText style={[styles.urlHost, { color: themeColors.secondaryControl }]}>
            https://conex.co.cr/
          </ThemedText>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={handlePathChange}
            placeholder={t('sites.pathPlaceholder')}
            placeholderTextColor={themeColors.icon}
            style={[styles.urlPathInput, { color: themeColors.text }]}
            value={path}
          />
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={!canCreate}
        onPress={handleCreate}
        style={({ pressed }) => [
          styles.createButton,
          {
            backgroundColor: themeColors.control,
            opacity: !canCreate ? 0.5 : pressed ? 0.8 : 1,
          },
        ]}>
        {isCreating ? (
          <ActivityIndicator color={themeColors.controlText} />
        ) : (
          <>
            <IconSymbol size={18} name="plus" color={themeColors.controlText} />
            <ThemedText type="defaultSemiBold" style={{ color: themeColors.controlText }}>
              {t('sites.create')}
            </ThemedText>
          </>
        )}
      </Pressable>
    </ThemedView>
  );
}

function SiteCard({
  onOpen,
  onVisibilityChange,
  site,
}: {
  onOpen: () => void;
  onVisibilityChange: () => void | Promise<void>;
  site: Site;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];
  const { t } = useTranslation();
  const [visibilityError, setVisibilityError] = useState('');
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

  async function copyUrl(event: { stopPropagation?: () => void }) {
    event.stopPropagation?.();
    await Clipboard.setStringAsync(site.url);
  }

  async function updateVisibility(event: { stopPropagation?: () => void }) {
    event.stopPropagation?.();

    if (isUpdatingVisibility) {
      return;
    }

    setVisibilityError('');
    setIsUpdatingVisibility(true);

    try {
      await siteRepository.updateSiteVisibility(site.path, !site.public);
      await onVisibilityChange();
    } catch (error) {
      setVisibilityError(error instanceof Error ? error.message : t('sites.visibilityError'));
    } finally {
      setIsUpdatingVisibility(false);
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: themeColors.border,
          backgroundColor: themeColors.cardBackground,
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      <View style={styles.cardHeader}>
        <View style={styles.siteIdentity}>
          <ThemedText type="subtitle">{site.name}</ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={isUpdatingVisibility}
          onPress={updateVisibility}
          style={[
            styles.visibilityPill,
            {
              backgroundColor: site.public ? tagColorFor('public').background : themeColors.border,
              opacity: isUpdatingVisibility ? 0.6 : 1,
            },
          ]}>
          {isUpdatingVisibility ? (
            <ActivityIndicator
              color={site.public ? tagColorFor('public').text : themeColors.text}
              size="small"
            />
          ) : (
            <>
              <IconSymbol
                size={14}
                name={site.public ? 'eye' : 'eye.slash'}
                color={site.public ? tagColorFor('public').text : themeColors.text}
              />
              <ThemedText
                type="defaultSemiBold"
                style={[
                  styles.visibilityText,
                  { color: site.public ? tagColorFor('public').text : themeColors.text },
                ]}>
                {site.public ? t('sites.public') : t('sites.private')}
              </ThemedText>
            </>
          )}
        </Pressable>
      </View>

      {visibilityError ? <BodyNotice message={visibilityError} variant="error" /> : null}

      <Pressable
        accessibilityRole="button"
        onPress={copyUrl}
        style={({ pressed }) => [styles.urlButton, { opacity: pressed ? 0.7 : 1 }]}>
        <ThemedText style={[styles.urlText, { color: themeColors.secondaryControl }]}>
          {site.url}
        </ThemedText>
        <IconSymbol size={18} name="doc.on.doc" color={themeColors.secondaryControl} />
      </Pressable>

      <View style={styles.tagList}>
        {site.tags.map((tag) => (
          <TagPill key={tag} tag={tag} />
        ))}
      </View>
    </Pressable>
  );
}

function TagPill({ tag }: { tag: string }) {
  const colors = tagColorFor(tag);

  return (
    <View style={[styles.tagPill, { backgroundColor: colors.background }]}>
      <ThemedText type="defaultSemiBold" style={[styles.tagText, { color: colors.text }]}>
        {tag}
      </ThemedText>
    </View>
  );
}

function sitePathFromName(name: string) {
  return normalizeSitePath(name);
}

function normalizeSitePath(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\/\\]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function isValidSitePath(path: string) {
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(path) && path.length >= 3;
}

function normalizeTag(tag: string) {
  return tag.replace(/\s+/g, '').toLowerCase();
}

function tagColorFor(tag: string) {
  const normalizedTag = normalizeTag(tag);
  let hash = 0;

  for (let index = 0; index < normalizedTag.length; index += 1) {
    hash = (hash * 31 + normalizedTag.charCodeAt(index)) >>> 0;
  }

  const hue = hash % 360;

  return {
    background: `hsl(${hue}, 62%, 38%)`,
    text: `hsl(${hue}, 72%, 90%)`,
  };
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  siteList: {
    gap: 16,
  },
  createPanel: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  createHeading: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
  },
  input: {
    width: '100%',
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  publicUrlGroup: {
    gap: 6,
  },
  publicUrlLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  urlInput: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 12,
    paddingRight: 4,
  },
  urlHost: {
    fontSize: 15,
    lineHeight: 22,
  },
  urlPathInput: {
    flex: 1,
    minWidth: 72,
    minHeight: 42,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 0,
    paddingVertical: 9,
  },
  createButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  card: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  siteIdentity: {
    flex: 1,
    gap: 4,
  },
  urlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    maxWidth: '100%',
  },
  urlText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  visibilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  visibilityText: {
    fontSize: 12,
    lineHeight: 16,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
