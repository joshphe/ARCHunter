import { NextResponse } from 'next/server';
import { listProjects } from '@/lib/projects-db';
import { getTokenMetrics } from '@/lib/token-metrics';
import { fallbackProjects } from '@/lib/fallback-projects';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const includeMetrics = new URL(request.url).searchParams.get('includeMetrics') === '1';
  let projects;
  try {
    projects = await listProjects(true);
  } catch (error) {
    console.warn('Using the bundled project directory because the database is unavailable:', error instanceof Error ? error.message : 'unknown database error');
    projects = fallbackProjects;
  }
  if (!includeMetrics) {
    return NextResponse.json(projects, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  }
  const tokenMetrics = await getTokenMetrics(projects.flatMap((project) => project.tokenAddress ? [project.tokenAddress] : []));
  const enrichedProjects = projects.map((project) => ({
    ...project,
    tokenMetrics: project.tokenAddress ? tokenMetrics.get(project.tokenAddress.toLowerCase()) ?? null : null,
  }));
  return NextResponse.json(enrichedProjects, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
}
