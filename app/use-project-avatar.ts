'use client';

import { useState } from 'react';

// Remember every failed URL so two unavailable sources cannot retry each other forever.
export function useProjectAvatar(handle: string, logoUrl?: string | null) {
  const username = handle.trim().replace(/^@/, '');
  const sources = [...new Set([
    logoUrl?.trim(),
    username ? `https://unavatar.io/x/${encodeURIComponent(username)}` : null,
  ].filter((source): source is string => Boolean(source)))];
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const src = sources.find(source => !failedSources.includes(source)) ?? null;

  const markFailed = (source: string) => {
    setFailedSources(previous => previous.includes(source) ? previous : [...previous, source]);
  };

  return { src, markFailed };
}

export function avatarInitials(symbol: string, handle: string) {
  return Array.from(symbol.trim().replace(/^\$/, '') || handle.trim().replace(/^@/, '') || '?')
    .slice(0, 2).join('').toUpperCase();
}
