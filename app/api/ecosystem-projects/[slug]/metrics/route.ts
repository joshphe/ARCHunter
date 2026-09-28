import { NextResponse } from 'next/server';
import { getProjectBySlug } from '@/lib/projects-db';
import { fallbackProjects } from '@/lib/fallback-projects';
import { getTokenMetrics } from '@/lib/token-metrics';

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  let project;
  try {
    project = await getProjectBySlug(slug, true);
  } catch (error) {
    console.warn('Using the bundled project directory because the database is unavailable:', error instanceof Error ? error.message : 'unknown database error');
    project = fallbackProjects.find((item) => item.slug === slug && item.isPublished) ?? null;
  }
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  if (!project.tokenAddress) {
    return NextResponse.json({ tokenMetrics: null }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
  }

  const metrics = await getTokenMetrics([project.tokenAddress]);
  return NextResponse.json({ tokenMetrics: metrics.get(project.tokenAddress.toLowerCase()) ?? null }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800' },
  });
}
