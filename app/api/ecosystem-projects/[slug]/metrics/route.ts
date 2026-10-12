import { NextResponse } from 'next/server';
import { getPublishedProjectToken } from '@/lib/projects-db';
import { fallbackProjects } from '@/lib/fallback-projects';
import { getTokenMetrics } from '@/lib/token-metrics';

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  let project;
  try {
    project = await getPublishedProjectToken(slug);
  } catch (error) {
    console.warn('Using the bundled project directory because the database is unavailable:', error instanceof Error ? error.message : 'unknown database error');
    if (process.env.DATABASE_URL) return NextResponse.json({ error: 'Project metrics are temporarily unavailable.' }, { status: 503 });
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
