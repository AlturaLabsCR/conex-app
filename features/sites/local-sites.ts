import type { SiteWithContent } from './types';

export const LOCAL_SITES: SiteWithContent[] = [
  {
    path: 'go-fitness',
    url: 'https://conex.co.cr/go-fitness',
    public: true,
    name: 'Go Fitness',
    tags: ['fitness', 'wellness'],
    sub: 1,
    contentHtml:
      '<p>Build a landing page section for memberships, training schedules, and wellness updates.</p>',
  },
  {
    path: 'cafe-central',
    url: 'https://conex.co.cr/cafe-central',
    public: false,
    name: 'Cafe Central',
    tags: ['Costa Rica', 'coffee shop', 'Food'],
    sub: 1,
    contentHtml:
      '<p>Draft menu highlights, opening hours, and coffee origin notes here.</p>',
  },
];
