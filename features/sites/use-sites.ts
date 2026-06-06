import { useCallback, useEffect, useState } from 'react';

import { isAuthenticationError } from '@/api/conex-api';
import { useAuth } from '@/auth/auth-context';

import { siteRepository } from './site-repository';
import type { Site } from './types';

export function useSites(reloadKey?: string) {
  const { logout } = useAuth();
  const [error, setError] = useState('');
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSites = useCallback(async () => {
    setIsLoading(true);

    try {
      const nextSites = await siteRepository.listSites();

      setSites(nextSites);
      setError('');
    } catch (loadError) {
      if (isAuthenticationError(loadError)) {
        await logout();
        return;
      }

      setError(loadError instanceof Error ? loadError.message : 'Unable to load sites.');
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    let isMounted = true;

    async function loadMountedSites() {
      setIsLoading(true);

      try {
        const nextSites = await siteRepository.listSites();
        if (isMounted) {
          setSites(nextSites);
          setError('');
        }
      } catch (loadError) {
        if (isMounted) {
          if (isAuthenticationError(loadError)) {
            await logout();
            return;
          }

          setError(loadError instanceof Error ? loadError.message : 'Unable to load sites.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMountedSites();

    return () => {
      isMounted = false;
    };
  }, [logout, reloadKey]);

  return {
    reloadSites: loadSites,
    error,
    isLoading,
    sites,
  };
}
