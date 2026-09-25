import type { Metadata } from 'next';
import ProjectDetailClient from '@/app/project-detail-client';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const name = decodeURIComponent(slug).replace(/-/g, ' ');
  return { title: `${name} — ARC Watch`, description: `Project profile and live market data for ${name} on Arc.` };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  return <ProjectDetailClient slug={decodeURIComponent(slug)}/>;
}
