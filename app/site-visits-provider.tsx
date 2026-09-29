'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const SiteVisitsContext = createContext<number | null>(null);

export function SiteVisitsProvider({ children }: { children: React.ReactNode }) {
  const [totalVisits, setTotalVisits] = useState<number | null>(null);

  useEffect(() => {
    let current = true;

    const loadVisits = async () => {
      if (window.location.pathname.startsWith('/admin')) return;

      let shouldCount = false;
      try {
        const alreadyCounted = sessionStorage.getItem('arcwatch-visit-counted') === '1'
          || sessionStorage.getItem('arcwatch-visit-pending') === '1';
        shouldCount = !alreadyCounted
          && window.location.hostname !== 'localhost'
          && window.location.hostname !== '127.0.0.1';
        if (shouldCount) sessionStorage.setItem('arcwatch-visit-pending', '1');
      } catch {
        // Read the total when browser storage is unavailable, but avoid duplicate increments.
      }

      try {
        const response = await fetch('/api/site-visits', {
          method: shouldCount ? 'POST' : 'GET',
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Unavailable');
        const result = await response.json() as { totalVisits: number };
        if (current) setTotalVisits(result.totalVisits);
        if (shouldCount) sessionStorage.setItem('arcwatch-visit-counted', '1');
      } catch {
        // Keep the site usable when the database is unavailable.
      } finally {
        if (shouldCount) {
          try {
            sessionStorage.removeItem('arcwatch-visit-pending');
          } catch {
            // Ignore disabled browser storage.
          }
        }
      }
    };

    void loadVisits();
    return () => { current = false; };
  }, []);

  return <SiteVisitsContext.Provider value={totalVisits}>{children}</SiteVisitsContext.Provider>;
}

export function useSiteVisits() {
  return useContext(SiteVisitsContext);
}
