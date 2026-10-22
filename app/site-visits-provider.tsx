'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const SiteVisitsContext = createContext<number | null>(null);
const COUNTED_KEY = 'arcwatch-visit-counted';
const TOTAL_KEY = 'arcwatch-visit-total';

export function SiteVisitsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [totalVisits, setTotalVisits] = useState<number | null>(null);
  const request = useRef<Promise<number | null> | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    let current = true;

    async function loadVisits(): Promise<number | null> {
      let shouldCount = false;
      let previousTotal = 0;
      try {
        // Retire the former page-view queue without submitting its pending events.
        sessionStorage.removeItem('arcwatch-page-views:v1');
        sessionStorage.removeItem('arcwatch-visit-pending');
        const savedTotal = Number(sessionStorage.getItem(TOTAL_KEY));
        if (Number.isSafeInteger(savedTotal) && savedTotal >= 0) previousTotal = savedTotal;
        shouldCount = sessionStorage.getItem(COUNTED_KEY) !== '1'
          && process.env.NODE_ENV === 'production'
          && !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
      } catch {
        // Read the total without incrementing when per-tab storage is unavailable.
      }

      try {
        const response = await fetch('/api/site-visits', {
          method: shouldCount ? 'POST' : 'GET',
          keepalive: shouldCount,
          signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(12_000) : undefined,
        });
        if (!response.ok) throw new Error('Unavailable');
        if (shouldCount) {
          try { sessionStorage.setItem(COUNTED_KEY, '1'); } catch { /* Storage may have been disabled. */ }
        }
        if (response.status === 204) {
          const snapshot = await fetch('/api/site-visits');
          if (!snapshot.ok) return previousTotal || null;
          return readTotal(await snapshot.json(), previousTotal);
        }
        return readTotal(await response.json(), previousTotal);
      } catch {
        return previousTotal || null;
      }
    }

    function readTotal(value: unknown, previousTotal: number): number | null {
      if (!value || typeof value !== 'object' || !('totalVisits' in value)) return previousTotal || null;
      const total = value.totalVisits;
      if (typeof total !== 'number' || !Number.isSafeInteger(total) || total < 0) return previousTotal || null;
      const result = Math.max(previousTotal, total);
      try { sessionStorage.setItem(TOTAL_KEY, String(result)); } catch { /* Display still works. */ }
      return result;
    }

    // Reuse the request across routes and React effect replays in this document.
    request.current ??= loadVisits();
    void request.current.then(total => { if (current) setTotalVisits(total); });
    return () => { current = false; };
  }, [pathname]);

  return <SiteVisitsContext.Provider value={totalVisits}>{children}</SiteVisitsContext.Provider>;
}

export function useSiteVisits() { return useContext(SiteVisitsContext); }
