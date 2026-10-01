import type { Metadata } from 'next';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import ProjectDetailClient from '@/app/project-detail-client';
import { getProjectBySlug } from '@/lib/projects-db';
import { isRugProject } from '@/lib/rug-projects';
import { fallbackProjects } from '@/lib/fallback-projects';
import type { EcosystemProject } from '@/lib/project-schema';

type Props = { params: Promise<{ slug: string }> };

const getProject = cache(async (slug: string): Promise<EcosystemProject | null> => {
  try {
    return await getProjectBySlug(slug, true);
  } catch (error) {
    console.warn('Using the bundled project directory because the database is unavailable:', error instanceof Error ? error.message : 'unknown database error');
    return fallbackProjects.find((item) => item.slug === slug && item.isPublished) ?? null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(decodeURIComponent(slug));
  const name = project?.name ?? decodeURIComponent(slug).replace(/-/g, ' ');
  return { title: `${name} — ARC Watch`, description: `Project profile and live market data for ${name} on Arc.` };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  if (slug === 'vort' || await isRugProject(decodeURIComponent(slug))) redirect(`/?view=rug#${encodeURIComponent(slug)}`);
  const project = await getProject(decodeURIComponent(slug));
  if (!project) notFound();
  const cookieStore = await cookies();
  const initialLanguage = cookieStore.get('arcwatch-language')?.value === 'zh' ? 'zh' : 'en';
  return <ProjectDetailClient key={project.slug} project={project} initialLanguage={initialLanguage}/>;
}
