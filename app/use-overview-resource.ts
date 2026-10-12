'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Each module owns its request and can paint or retry without waiting for its peers.
export function useOverviewResource<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async (force = true) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setFailed(false);
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(`${url}${force ? `?refresh=${Date.now()}` : ''}`, {
        signal: controller.signal, ...(force ? { cache: 'no-store' as const } : {}),
      });
      if (!response.ok) throw new Error('Module unavailable');
      const result = await response.json() as T;
      if (request.current === controller && !controller.signal.aborted) setData(result);
    } catch {
      if (request.current === controller) setFailed(true);
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setLoading(false);
      }
    }
  }, [url]);
  useEffect(() => {
    void refresh(false);
    return () => {
      const controller = request.current;
      request.current = null;
      controller?.abort();
    };
  }, [refresh]);
  return { data, loading, failed, refresh };
}
