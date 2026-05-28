import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import ThemedScrollView from '@/components/themed-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useSites } from '@/features/sites/use-sites';
import type { Site } from '@/features/sites/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/i18n';

export default function SitesScreen() {
  const { t } = useTranslation();
  const { sites } = useSites();
  const router = useRouter();

  return (
    <ThemedScrollView>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">{t('screens.sites.heading')}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.siteList}>
          {sites.map((site) => (
            <SiteCard
              key={site.path}
              site={site}
              onOpen={() => router.push({ pathname: '/editor', params: { sitePath: site.path } })}
            />
          ))}
        </ThemedView>
      </ThemedView>
    </ThemedScrollView>
  );
}

function SiteCard({ onOpen, site }: { onOpen: () => void; site: Site }) {
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];
  const { t } = useTranslation();

  async function copyUrl(event: { stopPropagation?: () => void }) {
    event.stopPropagation?.();
    await Clipboard.setStringAsync(site.url);
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: themeColors.border,
          backgroundColor: themeColors.background,
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      <View style={styles.cardHeader}>
        <View style={styles.siteIdentity}>
          <ThemedText type="subtitle">{site.name}</ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={copyUrl}
            style={({ pressed }) => [styles.urlButton, { opacity: pressed ? 0.7 : 1 }]}>
            <ThemedText style={[styles.urlText, { color: themeColors.secondaryControl }]}>
              {site.url}
            </ThemedText>
            <IconSymbol size={18} name="doc.on.doc" color={themeColors.secondaryControl} />
          </Pressable>
        </View>
        <View
          style={[
            styles.visibilityPill,
            {
              backgroundColor: site.public ? tagColorFor('public').background : themeColors.border,
            },
          ]}>
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
        </View>
      </View>

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
