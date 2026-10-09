'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EcosystemProject } from '@/lib/project-schema';

export type ProjectDataSource = 'database' | 'bundled' | null;
const REFRESH_INTERVAL_MS = 120_000;
const FOCUS_THROTTLE_MS = 30_000;

export function useEcosystemProjects(view: string) {
  const [projects, setProjects] = useState<EcosystemProject[]>([]);
  const [source, setSource] = useState<ProjectDataSource>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const hasLoaded = useRef(false);
  const lastSynced = useRef(0);
  const refreshRef = useRef<((force?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const includeMetrics = view === 'Ecosystem' || view === 'Map';
    let disposed = false;
    let inFlight = false;
    let controller: AbortController | null = null;

    async function readProjects(metrics: boolean, signal: AbortSignal) {
      const response = await fetch(`/api/ecosystem-projects${metrics ? '?includeMetrics=1' : ''}`, { cache: 'no-store', signal });
      if (!response.ok) throw new Error('Directory unavailable');
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid directory response');
      if (disposed) return;
      setProjects(data as EcosystemProject[]);
      setSource(response.headers.get('X-Project-Data-Source') === 'bundled' ? 'bundled' : 'database');
      hasLoaded.current = true;
      lastSynced.current = Date.now();
    }

    async function sync(force = false) {
      if (disposed || inFlight || (!force && document.visibilityState === 'hidden')) return;
      if (!force && Date.now() - lastSynced.current < FOCUS_THROTTLE_MS) return;
      inFlight = true;
      controller = new AbortController();
      setRefreshing(true);
      setError(false);
      const timeout = window.setTimeout(() => controller?.abort(), 20_000);
      try {
        const needsDirectory = !hasLoaded.current;
        // Show project membership before waiting for external market data.
        if (needsDirectory) await readProjects(false, controller.signal);
        if (includeMetrics || !needsDirectory) await readProjects(includeMetrics, controller.signal);
      } catch {
        if (!disposed) setError(true);
      } finally {
        window.clearTimeout(timeout);
        inFlight = false;
        if (!disposed) setRefreshing(false);
      }
    }

    setRefreshing(false);
    refreshRef.current = sync;
    if (!hasLoaded.current || includeMetrics) void sync(true);
    const onFocus = () => { void sync(); };
    const onVisible = () => { if (document.visibilityState === 'visible') void sync(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    const timer = includeMetrics ? window.setInterval(onFocus, REFRESH_INTERVAL_MS) : null;
    return () => {
      disposed = true;
      controller?.abort();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      if (timer !== null) window.clearInterval(timer);
      if (refreshRef.current === sync) refreshRef.current = null;
    };
  }, [view]);

  const refresh = useCallback(() => { void refreshRef.current?.(true); }, []);
  return { projects, source, refreshing, error, refresh };
}
