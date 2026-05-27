import * as Clipboard from 'expo-clipboard';
import { Pressable, StyleSheet, View } from 'react-native';

import ThemedScrollView from '@/components/themed-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/i18n';

type Site = {
  path: string;
  url: string;
  public: boolean;
  name: string;
  tags: string[];
  sub: number;
};

const SITES: Site[] = [
  {
    path: 'go-fitness',
    url: 'https://conex.co.cr/go-fitness',
    public: true,
    name: 'Go Fitness',
    tags: ['fitness', 'wellness'],
    sub: 1,
  },
  {
    path: 'cafe-central',
    url: 'https://conex.co.cr/cafe-central',
    public: false,
    name: 'Cafe Central',
    tags: ['Costa Rica', 'coffee shop', 'Food'],
    sub: 1,
  },
];

export default function SitesScreen() {
  const { t } = useTranslation();

  return (
    <ThemedScrollView>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">{t('screens.sites.heading')}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.siteList}>
          {SITES.map((site) => (
            <SiteCard key={site.path} site={site} />
          ))}
        </ThemedView>
      </ThemedView>
    </ThemedScrollView>
  );
}

function SiteCard({ site }: { site: Site }) {
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];
  const { t } = useTranslation();

  async function copyUrl() {
    await Clipboard.setStringAsync(site.url);
  }

  return (
    <ThemedView
      style={[
        styles.card,
        {
          borderColor: themeColors.border,
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
    </ThemedView>
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
    background: `hsl(${hue}, 72%, 90%)`,
    text: `hsl(${hue}, 58%, 28%)`,
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
