'use client';

import { useState } from 'react';
import Image from 'next/image';

type Props = { handle: string; symbol: string; large?: boolean; className?: string };

export default function ProjectAvatar({ handle, symbol, large = false, className }: Props) {
  const username = handle.replace(/^@/, '').trim();
  const [failed, setFailed] = useState(!username);
  const src = `https://unavatar.io/x/${encodeURIComponent(username)}`;
  const containerClass = className ?? `ecosystem-project-mark${large ? ' large' : ''}`;

  return <span className={`${containerClass} x-avatar-container${failed ? '' : ' has-avatar'}`} aria-hidden="true">
    {failed ? symbol : <Image className="x-avatar-image" src={src} alt="" width={large ? 48 : 38} height={large ? 48 : 38} unoptimized onError={() => setFailed(true)}/>}
  </span>;
}
