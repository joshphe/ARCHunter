import type { EcosystemProject } from './project-schema';

export function projectLogoForHandle(projects: EcosystemProject[], handle?: string | null) {
  const username = handle?.trim().replace(/^@/, '').toLowerCase();
  if (!username) return null;
  return projects.find(project => project.handle.trim().replace(/^@/, '').toLowerCase() === username)?.logoUrl ?? null;
}
