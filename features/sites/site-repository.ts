import * as conexApi from '@/api/conex-api';

import type { Site, SiteWithContent } from './types';

export interface SiteRepository {
  createSite(input: { name: string; path: string }): Promise<Site>;
  listSites(): Promise<Site[]>;
  getSite(path: string): Promise<SiteWithContent | null>;
  deleteSite(path: string): Promise<void>;
  saveSiteContent(path: string, contentHtml: string): Promise<SiteWithContent | null>;
  subscribe(listener: () => void): () => void;
  updateSiteTags(path: string, tags: string[]): Promise<void>;
  updateSiteVisibility(path: string, isPublic: boolean): Promise<void>;
}

const siteChangeListeners = new Set<() => void>();

function notifySitesChanged() {
  siteChangeListeners.forEach((listener) => {
    listener();
  });
}

function siteFromApi(site: conexApi.SiteResponse): Site {
  return {
    path: site.path,
    public: site.public,
    name: site.name,
    tags: site.tags,
    url: site.url,
    sub: site.sub,
    clicks: site.clicks,
  };
}

function siteWithContentFromApi(site: conexApi.OwnedSiteResponse): SiteWithContent {
  return {
    ...siteFromApi(site),
    contentHtml: site.html,
  };
}

export const siteRepository: SiteRepository = {
  async createSite({ name, path }) {
    const site = await conexApi.createSite({
      html: '<p></p>',
      name,
      path,
      tags: [],
    });

    notifySitesChanged();

    return siteFromApi(site);
  },

  async listSites() {
    const sites = await conexApi.listSites();

    return sites.map(siteFromApi);
  },

  async getSite(path) {
    try {
      const site = await conexApi.getOwnedSite(path);

      return siteWithContentFromApi(site);
    } catch (error) {
      if (error instanceof conexApi.ConexApiError && error.status === 404) {
        return null;
      }

      throw error;
    }
  },

  async deleteSite(path) {
    await conexApi.deleteSite(path);
    notifySitesChanged();
  },

  async saveSiteContent(path, contentHtml) {
    try {
      await conexApi.updateSite(path, { html: contentHtml });
    } catch (error) {
      if (error instanceof conexApi.ConexApiError && error.status === 404) {
        notifySitesChanged();
        return null;
      }

      throw error;
    }

    return siteRepository.getSite(path);
  },

  subscribe(listener) {
    siteChangeListeners.add(listener);

    return () => {
      siteChangeListeners.delete(listener);
    };
  },

  async updateSiteTags(path, tags) {
    await conexApi.updateSite(path, { tags });
    notifySitesChanged();
  },

  async updateSiteVisibility(path, isPublic) {
    await conexApi.updateSite(path, { public: isPublic });
    notifySitesChanged();
  },
};
