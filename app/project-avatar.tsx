'use client';

import { useState } from 'react';
import Image from 'next/image';

type Props = { handle: string; symbol: string; logoUrl?: string | null; large?: boolean; className?: string };

export default function ProjectAvatar({ handle, symbol, logoUrl, large = false, className }: Props) {
  const username = handle.replace(/^@/, '').trim();
  const fallbackSrc = `https://unavatar.io/x/${encodeURIComponent(username)}`;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = logoUrl && failedSrc !== logoUrl ? logoUrl : username && failedSrc !== fallbackSrc ? fallbackSrc : null;
  const failed = src == null;
  const containerClass = className ?? `ecosystem-project-mark${large ? ' large' : ''}`;

  return <span className={`${containerClass} x-avatar-container${failed ? '' : ' has-avatar'}`} aria-hidden="true">
    {failed ? symbol : <Image className="x-avatar-image" src={src} alt="" width={large ? 48 : 38} height={large ? 48 : 38} unoptimized onError={() => setFailedSrc(src)}/>}
  </span>;
}
