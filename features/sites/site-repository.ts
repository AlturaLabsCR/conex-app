import AsyncStorage from '@react-native-async-storage/async-storage';

import { LOCAL_SITES } from './local-sites';
import type { Site, SiteWithContent } from './types';

const CONTENT_KEY_PREFIX = 'conex.siteContentHtml.';

export interface SiteRepository {
  listSites(): Promise<Site[]>;
  getSite(path: string): Promise<SiteWithContent | null>;
  saveSiteContent(path: string, contentHtml: string): Promise<SiteWithContent | null>;
}

function contentStorageKey(path: string) {
  return `${CONTENT_KEY_PREFIX}${path}`;
}

async function readLocalSiteContent(site: SiteWithContent) {
  const storedHtml = await AsyncStorage.getItem(contentStorageKey(site.path));

  return {
    ...site,
    contentHtml: normalizeStoredContent(site, storedHtml ?? site.contentHtml),
  };
}

function normalizeStoredContent(site: SiteWithContent, contentHtml: string) {
  const legacySeedHtml = `<h2>${site.name}</h2>${site.contentHtml}`;

  if (contentHtml === legacySeedHtml) {
    return site.contentHtml;
  }

  return contentHtml;
}

export const localSiteRepository: SiteRepository = {
  async listSites() {
    return LOCAL_SITES.map(({ contentHtml: _contentHtml, ...site }) => site);
  },

  async getSite(path) {
    const site = LOCAL_SITES.find((item) => item.path === path);

    if (!site) {
      return null;
    }

    return readLocalSiteContent(site);
  },

  async saveSiteContent(path, contentHtml) {
    const site = LOCAL_SITES.find((item) => item.path === path);

    if (!site) {
      return null;
    }

    await AsyncStorage.setItem(contentStorageKey(path), contentHtml);
    return {
      ...site,
      contentHtml,
    };
  },
};
