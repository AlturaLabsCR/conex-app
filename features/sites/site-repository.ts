import * as conexApi from '@/api/conex-api';

import type { Site, SiteWithContent } from './types';

export interface SiteRepository {
  createSite(input: { name: string; path: string }): Promise<Site>;
  listSites(): Promise<Site[]>;
  getSite(path: string): Promise<SiteWithContent | null>;
  saveSiteContent(path: string, contentHtml: string): Promise<SiteWithContent | null>;
  updateSiteVisibility(path: string, isPublic: boolean): Promise<void>;
}

function siteFromApi(site: conexApi.SiteResponse): Site {
  return {
    path: site.path,
    public: site.public,
    name: site.name,
    tags: site.tags,
    url: site.url,
    sub: site.sub,
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

  async saveSiteContent(path, contentHtml) {
    await conexApi.updateSite(path, { html: contentHtml });

    return siteRepository.getSite(path);
  },

  async updateSiteVisibility(path, isPublic) {
    await conexApi.updateSite(path, { public: isPublic });
  },
};
