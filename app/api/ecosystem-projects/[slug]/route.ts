import { NextResponse } from 'next/server';
import { listProjects } from '@/lib/projects-db';
import { fallbackProjects } from '@/lib/fallback-projects';
import { getTokenMetrics } from '@/lib/token-metrics';

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  let projects;
  try {
    projects = await listProjects(true);
  } catch (error) {
    console.warn('Using the bundled project directory because the database is unavailable:', error instanceof Error ? error.message : 'unknown database error');
    projects = fallbackProjects;
  }
  const project = projects.find((item) => item.slug === slug);
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  const metrics = project.tokenAddress ? await getTokenMetrics([project.tokenAddress]) : new Map();
  return NextResponse.json({
    ...project,
    tokenMetrics: project.tokenAddress ? metrics.get(project.tokenAddress.toLowerCase()) ?? null : null,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
