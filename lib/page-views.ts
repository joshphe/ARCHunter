const workspaces = new Set(['overview', 'ecosystem', 'map', 'capital', 'launchpad', 'rug']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const MAX_PAGE_VIEW_BATCH = 20;
export const PAGE_VIEW_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type PageViewEvent = { id: string; page: string; occurredAt: number };

export function publicPageViewKey(pathname: string, search: string): string | null {
  if (pathname === '/') {
    const view = new URLSearchParams(search).get('view')?.toLowerCase() ?? 'overview';
    return `workspace:${workspaces.has(view) ? view : 'overview'}`;
  }
  const project = /^\/projects\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(pathname);
  return project ? `project:${project[1]}` : null;
}

export function isPageViewEvent(value: unknown, now = Date.now()): value is PageViewEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  if (typeof event.id !== 'string' || !uuid.test(event.id)) return false;
  if (typeof event.page !== 'string' || event.page.length > 200) return false;
  const knownPage = event.page.startsWith('workspace:')
    ? workspaces.has(event.page.slice('workspace:'.length))
    : /^project:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(event.page);
  return knownPage && typeof event.occurredAt === 'number' && Number.isFinite(event.occurredAt)
    && event.occurredAt >= now - PAGE_VIEW_MAX_AGE_MS && event.occurredAt <= now + 5 * 60 * 1000;
}
