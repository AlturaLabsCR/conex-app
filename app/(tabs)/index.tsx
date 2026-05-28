import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { useAuth } from '@/auth/auth-context';
import ThemedScrollView from '@/components/themed-scroll-view';
import { BodyNotice } from '@/components/body-notice';
import { ThemedActivityIndicator } from '@/components/themed-activity-indicator';
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
  const { email } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];
  const { error, isLoading, reloadSites, sites } = useSites(email);
  const router = useRouter();

  return (
    <ThemedScrollView keyboardShouldPersistTaps="handled">
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">{t('screens.sites.heading')}</ThemedText>
          <RefreshSitesButton
            color={themeColors.secondaryControl}
            isLoading={isLoading}
            label={t('sites.refresh')}
            onPress={reloadSites}
          />
        </ThemedView>

        {isLoading ? (
          <ThemedActivityIndicator />
        ) : error ? (
          <BodyNotice message={error} variant="error" />
        ) : (
          <ThemedView style={styles.siteList}>
            {sites.map((site) => (
              <SiteCard
                key={site.path}
                onDelete={reloadSites}
                onTagsChange={reloadSites}
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

function RefreshSitesButton({
  color,
  isLoading,
  label,
  onPress,
}: {
  color: string;
  isLoading: boolean;
  label: string;
  onPress: () => void | Promise<void>;
}) {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLoading) {
      spinValue.stopAnimation();
      spinValue.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [isLoading, spinValue]);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={isLoading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerIconButton,
        { opacity: isLoading ? 0.65 : pressed ? 0.7 : 1 },
      ]}>
      <Animated.View
        style={{
          transform: [
            {
              rotate: spinValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              }),
            },
          ],
        }}>
        <IconSymbol name="arrow.clockwise" size={20} color={color} />
      </Animated.View>
    </Pressable>
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
          <ThemedActivityIndicator />
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
  onDelete,
  onOpen,
  onTagsChange,
  onVisibilityChange,
  site,
}: {
  onDelete: () => void | Promise<void>;
  onOpen: () => void;
  onTagsChange: () => void | Promise<void>;
  onVisibilityChange: () => void | Promise<void>;
  site: Site;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];
  const { t } = useTranslation();
  const swipeableRef = useRef<Swipeable>(null);
  const [siteError, setSiteError] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingTags, setIsUpdatingTags] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const trimmedNewTag = newTag.trim();
  const canAddTag =
    Boolean(trimmedNewTag) &&
    !site.tags.some((tag) => tag.toLowerCase() === trimmedNewTag.toLowerCase()) &&
    !isUpdatingTags;

  async function copyUrl(event: { stopPropagation?: () => void }) {
    event.stopPropagation?.();
    await Clipboard.setStringAsync(site.url);
  }

  async function updateVisibility(event: { stopPropagation?: () => void }) {
    event.stopPropagation?.();

    if (isUpdatingVisibility) {
      return;
    }

    setSiteError('');
    setIsUpdatingVisibility(true);

    try {
      await siteRepository.updateSiteVisibility(site.path, !site.public);
      await onVisibilityChange();
    } catch (error) {
      setSiteError(error instanceof Error ? error.message : t('sites.visibilityError'));
    } finally {
      setIsUpdatingVisibility(false);
    }
  }

  async function addTag(event: { stopPropagation?: () => void }) {
    event.stopPropagation?.();

    if (!canAddTag) {
      return;
    }

    setSiteError('');
    setIsUpdatingTags(true);

    try {
      await siteRepository.updateSiteTags(site.path, [...site.tags, trimmedNewTag]);
      setNewTag('');
      setIsAddingTag(false);
      await onTagsChange();
    } catch (error) {
      setSiteError(error instanceof Error ? error.message : t('sites.tagError'));
    } finally {
      setIsUpdatingTags(false);
    }
  }

  async function handleTagPress(tag: string) {
    if (isUpdatingTags) {
      return;
    }

    if (selectedTag !== tag) {
      setSelectedTag(tag);
      return;
    }

    setSiteError('');
    setIsUpdatingTags(true);

    try {
      await siteRepository.updateSiteTags(
        site.path,
        site.tags.filter((siteTag) => siteTag !== tag)
      );
      setSelectedTag('');
      await onTagsChange();
    } catch (error) {
      setSiteError(error instanceof Error ? error.message : t('sites.tagError'));
    } finally {
      setIsUpdatingTags(false);
    }
  }

  function confirmDelete() {
    swipeableRef.current?.close();
    Alert.alert(t('sites.deleteTitle'), t('sites.deleteMessage'), [
      { text: t('sites.deleteCancel'), style: 'cancel' },
      {
        text: t('sites.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          void deleteSite();
        },
      },
    ]);
  }

  async function deleteSite() {
    if (isDeleting) {
      return;
    }

    setSiteError('');
    setIsDeleting(true);

    try {
      await siteRepository.deleteSite(site.path);
      await onDelete();
    } catch (error) {
      setSiteError(error instanceof Error ? error.message : t('sites.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  }

  const renderRightActions = () => (
    <Pressable
      accessibilityRole="button"
      disabled={isDeleting}
      onPress={confirmDelete}
      style={({ pressed }) => [
        styles.deleteAction,
        { opacity: isDeleting ? 0.6 : pressed ? 0.8 : 1 },
      ]}>
      {isDeleting ? (
        <ThemedActivityIndicator size="small" />
      ) : (
        <>
          <IconSymbol name="trash" size={20} color="#ffffff" />
          <ThemedText type="defaultSemiBold" style={styles.deleteActionText}>
            {t('sites.delete')}
          </ThemedText>
        </>
      )}
    </Pressable>
  );

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions}>
      <View
        style={[
          styles.card,
          {
            borderColor: themeColors.border,
            backgroundColor: themeColors.cardBackground,
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
              <ThemedActivityIndicator />
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

        {siteError ? <BodyNotice message={siteError} variant="error" /> : null}

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
            <TagPill
              key={tag}
              isDeleting={isUpdatingTags && selectedTag === tag}
              isSelected={selectedTag === tag}
              tag={tag}
              onPress={handleTagPress}
            />
          ))}
          {isAddingTag ? (
            <View style={[styles.addTagPill, { backgroundColor: themeColors.border }]}>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setNewTag}
                onSubmitEditing={addTag}
                placeholder={t('sites.tagPlaceholder')}
                placeholderTextColor={themeColors.icon}
                style={[styles.tagInput, { color: themeColors.text }]}
                value={newTag}
              />
              <Pressable
                accessibilityLabel={t('sites.addTag')}
                accessibilityRole="button"
                disabled={!canAddTag}
                onPress={addTag}
                style={{ opacity: canAddTag ? 1 : 0.45 }}>
                {isUpdatingTags ? (
                  <ThemedActivityIndicator size="small" style={styles.tagSpinner} />
                ) : (
                  <IconSymbol name="checkmark" size={16} color={themeColors.text} />
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityLabel={t('sites.addTag')}
              accessibilityRole="button"
              onPress={(event) => {
                event.stopPropagation();
                setIsAddingTag(true);
              }}
              style={[styles.addTagPill, { backgroundColor: themeColors.border }]}>
              <IconSymbol name="plus" size={16} color={themeColors.text} />
            </Pressable>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onOpen}
          style={({ pressed }) => [
            styles.editButton,
            {
              borderColor: themeColors.secondaryControl,
              opacity: pressed ? 0.8 : 1,
            },
          ]}>
          <IconSymbol name="pencil" size={18} color={themeColors.secondaryControl} />
          <ThemedText
            type="defaultSemiBold"
            style={[styles.editButtonText, { color: themeColors.secondaryControl }]}>
            {t('sites.edit')}
          </ThemedText>
        </Pressable>
      </View>
    </Swipeable>
  );
}

function TagPill({
  isDeleting,
  isSelected,
  onPress,
  tag,
}: {
  isDeleting: boolean;
  isSelected: boolean;
  onPress: (tag: string) => void | Promise<void>;
  tag: string;
}) {
  const colors = tagColorFor(tag);
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityLabel={isSelected ? t('sites.deleteTag') : tag}
      accessibilityRole="button"
      onPress={(event) => {
        event.stopPropagation();
        void onPress(tag);
      }}
      style={[
        styles.tagPill,
        {
          backgroundColor: colors.background,
          minWidth: isSelected ? 32 : undefined,
        },
      ]}>
      <ThemedText type="defaultSemiBold" style={[styles.tagText, { color: colors.text }]}>
        {tag}
      </ThemedText>
      {isDeleting ? (
        <ThemedActivityIndicator size="small" style={styles.tagSpinner} />
      ) : isSelected ? (
        <IconSymbol name="xmark" size={14} color={colors.text} />
      ) : null}
    </Pressable>
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
  headerIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
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
  deleteAction: {
    width: 104,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    backgroundColor: '#c62828',
    marginLeft: 10,
  },
  deleteActionText: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 16,
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
  editButton: {
    minHeight: 40,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  editButtonText: {
    textAlign: 'center',
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
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addTagPill: {
    minHeight: 26,
    minWidth: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagInput: {
    minWidth: 72,
    maxWidth: 140,
    padding: 0,
    fontSize: 12,
    lineHeight: 16,
  },
  tagSpinner: {
    width: 14,
    height: 14,
    transform: [{ scale: 0.65 }],
  },
  tagText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
