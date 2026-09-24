'use client';

import { useState } from 'react';
import Image from 'next/image';

type Props = { handle: string; symbol: string; large?: boolean };

export default function ProjectAvatar({ handle, symbol, large = false }: Props) {
  const [failed, setFailed] = useState(false);
  const username = handle.replace(/^@/, '').trim();
  const src = `https://unavatar.io/x/${encodeURIComponent(username)}`;

  return <span className={`ecosystem-project-mark${large ? ' large' : ''}${failed ? '' : ' has-avatar'}`} aria-hidden="true">
    {failed ? symbol : <Image src={src} alt="" width={large ? 48 : 38} height={large ? 48 : 38} unoptimized onError={() => setFailed(true)}/>}
  </span>;
}
