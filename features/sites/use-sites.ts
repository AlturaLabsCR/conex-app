import { useEffect, useState } from 'react';

import { localSiteRepository } from './site-repository';
import type { Site } from './types';

export function useSites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSites() {
      const nextSites = await localSiteRepository.listSites();

      if (isMounted) {
        setSites(nextSites);
        setIsLoading(false);
      }
    }

    loadSites();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    isLoading,
    sites,
  };
}

