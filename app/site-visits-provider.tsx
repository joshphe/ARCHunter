'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isPageViewEvent, MAX_PAGE_VIEW_BATCH, publicPageViewKey } from '@/lib/page-views';
import type { PageViewEvent } from '@/lib/page-views';

type PageViewCount = { totalPageViews: number | null; startedAt: string | null };
const PageViewCountContext = createContext<PageViewCount>({ totalPageViews: null, startedAt: null });
const TrackPageViewContext = createContext<(page: string) => void>(() => {});
const PENDING_KEY = 'arcwatch-page-views:v1';
const MAX_PENDING = 100;
const requestTimeout = () => typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(12_000) : undefined;

export function SiteVisitsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [count, setCount] = useState<PageViewCount>({ totalPageViews: null, startedAt: null });
  const pending = useRef<PageViewEvent[]>([]);
  const lastPage = useRef<string | null>(null);
  const onQueued = useRef<(() => void) | null>(null);

  const trackPageView = useCallback((page: string) => {
    if (process.env.NODE_ENV !== 'production'
      || ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
      || document.visibilityState !== 'visible' || lastPage.current === page) return;
    try {
      const event = { id: crypto.randomUUID(), page, occurredAt: Date.now() };
      if (!isPageViewEvent(event)) return;
      lastPage.current = page;
      pending.current = [...pending.current, event].slice(-MAX_PENDING);
      onQueued.current?.();
    } catch {
      // Analytics must never prevent browsing in older or restricted browsers.
    }
  }, []);

  useEffect(() => {
    let current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;
    let failures = 0;

    function persist() {
      try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending.current)); } catch { /* The in-memory queue still works. */ }
    }
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? '[]');
      const events = Array.isArray(saved) ? saved.filter(event => isPageViewEvent(event)) : [];
      pending.current = [...new Map([...events, ...pending.current].map(event => [event.id, event])).values()].slice(-MAX_PENDING);
    } catch { /* Storage is optional and never controls whether a view counts. */ }

    function updateCount(result: Partial<PageViewCount>) {
      const total = result.totalPageViews;
      if (!current || typeof total !== 'number' || !Number.isSafeInteger(total) || total < 0) return;
      setCount(previous => ({
        totalPageViews: Math.max(previous.totalPageViews ?? 0, total),
        startedAt: typeof result.startedAt === 'string' ? result.startedAt : previous.startedAt,
      }));
    }
    function schedule(delay = 750) {
      if (!current || timer || !pending.current.length) return;
      timer = setTimeout(() => { timer = undefined; void flush(); }, delay);
    }
    async function flush() {
      if (!current || inFlight) return;
      pending.current = pending.current.filter(event => isPageViewEvent(event));
      persist();
      const events = pending.current.slice(0, MAX_PAGE_VIEW_BATCH);
      if (!events.length) return;
      inFlight = true;
      let retry = false;
      try {
        const response = await fetch('/api/site-visits', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events }), keepalive: true,
          signal: requestTimeout(),
        });
        if (!response.ok) {
          // Retry transient failures with the same IDs, never invalid requests.
          if (response.status >= 500 || response.status === 429) throw new Error('Temporarily unavailable');
        } else if (response.status !== 204) {
          updateCount(await response.json() as PageViewCount);
        }
        const accepted = new Set(events.map(event => event.id));
        pending.current = pending.current.filter(event => !accepted.has(event.id));
        failures = 0;
      } catch {
        failures += 1;
        retry = true;
      } finally {
        inFlight = false;
        persist();
        if (current && pending.current.length && (!retry || failures <= 3)) schedule(retry ? 2_000 * 2 ** (failures - 1) : 750);
      }
    }
    function queueChanged() { persist(); schedule(); }
    function flushOnLeave() {
      persist();
      const events = pending.current.filter(event => isPageViewEvent(event)).slice(0, MAX_PAGE_VIEW_BATCH);
      if (!events.length) return;
      const body = new Blob([JSON.stringify({ events })], { type: 'application/json' });
      // Beacon acknowledgement does not prove delivery. Retain IDs until the server confirms them.
      try {
        if (!navigator.sendBeacon?.('/api/site-visits', body)) void flush();
      } catch { void flush(); }
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') flushOnLeave();
      else {
        const page = publicPageViewKey(window.location.pathname, window.location.search);
        if (page) trackPageView(page);
        failures = 0;
        schedule();
      }
    }
    function onOnline() { failures = 0; schedule(); }
    function onPageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;
      lastPage.current = null;
      onVisibility();
    }

    onQueued.current = queueChanged;
    persist();
    schedule();
    if (publicPageViewKey(window.location.pathname, window.location.search)) {
      // The shared total can be served from the CDN; recording stays uncached.
      void fetch('/api/site-visits', { signal: requestTimeout() })
        .then(response => response.ok ? response.json() : null)
        .then(result => { if (result) updateCount(result); })
        .catch(() => { /* The next successful recording also supplies the total. */ });
    }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flushOnLeave);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('online', onOnline);
    return () => {
      current = false;
      onQueued.current = null;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushOnLeave);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('online', onOnline);
    };
  }, [trackPageView]);

  useEffect(() => {
    const page = publicPageViewKey(pathname ?? window.location.pathname, window.location.search);
    if (page) trackPageView(page);
    else lastPage.current = null;
  }, [pathname, trackPageView]);

  return <TrackPageViewContext.Provider value={trackPageView}><PageViewCountContext.Provider value={count}>{children}</PageViewCountContext.Provider></TrackPageViewContext.Provider>;
}

export function useSitePageViews() { return useContext(PageViewCountContext); }

// Workspace changes update React state without changing pathname. Track that state explicitly.
export function useTrackPageView(page: string | null) {
  const track = useContext(TrackPageViewContext);
  useEffect(() => { if (page) track(page); }, [page, track]);
}
