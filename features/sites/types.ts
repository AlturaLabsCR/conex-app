export type Site = {
  path: string;
  url: string;
  public: boolean;
  name: string;
  tags: string[];
  sub: number;
  clicks: number;
};

export type SiteWithContent = Site & {
  contentHtml: string;
};
