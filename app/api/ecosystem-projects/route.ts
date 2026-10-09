import { NextResponse } from 'next/server';
import { listProjects } from '@/lib/projects-db';
import { getTokenMetrics } from '@/lib/token-metrics';
import { fallbackProjects } from '@/lib/fallback-projects';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const includeMetrics = new URL(request.url).searchParams.get('includeMetrics') === '1';
  let projects;
  let source = 'database';
  try {
    projects = await listProjects(true);
  } catch (error) {
    console.warn('Could not load the project directory:', error instanceof Error ? error.message : 'unknown database error');
    if (process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Project directory is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    projects = fallbackProjects.filter(project => project.isPublished);
    source = 'bundled';
  }
  const headers = { 'Cache-Control': 'no-store', 'X-Project-Data-Source': source };
  if (!includeMetrics) {
    return NextResponse.json(projects, { headers });
  }
  const tokenMetrics = await getTokenMetrics(projects.flatMap((project) => project.tokenAddress ? [project.tokenAddress] : []));
  const enrichedProjects = projects.map((project) => ({
    ...project,
    tokenMetrics: project.tokenAddress ? tokenMetrics.get(project.tokenAddress.toLowerCase()) ?? null : null,
  }));
  return NextResponse.json(enrichedProjects, { headers });
}
