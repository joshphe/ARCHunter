'use client';

import Image from 'next/image';
import { avatarInitials, useProjectAvatar } from './use-project-avatar';

type Props = { handle: string; symbol: string; logoUrl?: string | null; large?: boolean; className?: string };

export default function ProjectAvatar({ handle, symbol, logoUrl, large = false, className }: Props) {
  const { src, markFailed } = useProjectAvatar(handle, logoUrl);
  const failed = src == null;
  const containerClass = className ?? `ecosystem-project-mark${large ? ' large' : ''}`;

  return <span className={`${containerClass} x-avatar-container${failed ? '' : ' has-avatar'}`} aria-hidden="true">
    {src ? <Image key={src} className="x-avatar-image" src={src} alt="" width={large ? 48 : 38} height={large ? 48 : 38} unoptimized onError={() => markFailed(src)}/> : <span className="x-avatar-initials">{avatarInitials(symbol, handle)}</span>}
  </span>;
}
