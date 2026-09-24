export type ProjectProduct = { en: string; zh: string; status?: 'upcoming' };
export type ProjectUpdate = { titleEn: string; titleZh: string; summaryEn: string; summaryZh: string; sourceUrl: string; publishedAt: string | null };

export type EcosystemProject = {
  slug: string;
  name: string;
  symbol: string;
  handle: string;
  tagline: string;
  taglineZh: string;
  description: { en: string; zh: string };
  categories: string[];
  status: 'beta' | 'live' | 'upcoming';
  products: ProjectProduct[];
  tvl: number | null;
  fees24h: number | null;
  volume24h: number | null;
  tokenAddress: string | null;
  website: string;
  x: string;
  sourceUrls: string[];
  verifiedOn: string;
  recommended: boolean;
  recommendationReason: { en: string; zh: string } | null;
  isPublished: boolean;
  updates: ProjectUpdate[];
};

export type ProjectInput = Omit<EcosystemProject, 'sourceUrls' | 'verifiedOn' | 'recommended' | 'recommendationReason' | 'taglineZh' | 'isPublished' | 'updates'> & {
  taglineZh?: string;
  isPublished?: boolean;
  sourceUrls?: string[];
  verifiedOn?: string;
  recommended?: boolean;
  recommendationReason?: { en: string; zh: string } | null;
};

const isHttpUrl = (value: unknown): value is string => {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

export function validateProjectInput(value: unknown): { ok: true; project: ProjectInput } | { ok: false; error: string } {
  if (!value || typeof value !== 'object') return { ok: false, error: 'Project data must be an object.' };
  const project = value as Record<string, unknown>;
  const required = ['slug', 'name', 'symbol', 'handle', 'tagline', 'description', 'categories', 'status', 'products', 'website', 'x'];
  if (required.some((key) => !(key in project))) return { ok: false, error: 'One or more required project fields are missing.' };
  if (typeof project.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) return { ok: false, error: 'Slug must use lowercase letters, numbers, and hyphens.' };
  for (const key of ['name', 'symbol', 'handle', 'tagline'] as const) {
    if (typeof project[key] !== 'string' || !project[key].trim() || project[key].length > 160) return { ok: false, error: `${key} is required and must be at most 160 characters.` };
  }
  const description = project.description as Record<string, unknown>;
  if (!description || typeof description.en !== 'string' || typeof description.zh !== 'string') return { ok: false, error: 'English and Chinese descriptions are required.' };
  if (!Array.isArray(project.categories) || !project.categories.length || project.categories.some((item) => typeof item !== 'string')) return { ok: false, error: 'At least one category is required.' };
  if (!['beta', 'live', 'upcoming'].includes(String(project.status))) return { ok: false, error: 'Invalid project status.' };
  if (!Array.isArray(project.products) || project.products.some((item) => !item || typeof item.en !== 'string' || typeof item.zh !== 'string')) return { ok: false, error: 'Products must include English and Chinese labels.' };
  if (!isHttpUrl(project.website) || !isHttpUrl(project.x)) return { ok: false, error: 'Website and X must be valid HTTP(S) URLs.' };
  if (project.tokenAddress != null && (typeof project.tokenAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(project.tokenAddress))) return { ok: false, error: 'Token contract must be a valid EVM address.' };
  if (project.sourceUrls != null && (!Array.isArray(project.sourceUrls) || project.sourceUrls.some((url) => !isHttpUrl(url)))) return { ok: false, error: 'Source URLs must be valid HTTP(S) URLs.' };
  for (const field of ['tvl', 'fees24h', 'volume24h'] as const) {
    if (project[field] != null && (typeof project[field] !== 'number' || !Number.isFinite(project[field]) || project[field] < 0)) return { ok: false, error: `Invalid ${field} metric.` };
  }
  if (project.recommended != null && typeof project.recommended !== 'boolean') return { ok: false, error: 'Invalid recommendation flag.' };
  if (project.isPublished != null && typeof project.isPublished !== 'boolean') return { ok: false, error: 'Invalid publication flag.' };
  const reason = project.recommendationReason;
  if (reason != null && (typeof reason !== 'object' || typeof (reason as Record<string, unknown>).en !== 'string' || typeof (reason as Record<string, unknown>).zh !== 'string')) return { ok: false, error: 'Recommendation reason must include English and Chinese text.' };
  return { ok: true, project: project as unknown as ProjectInput };
}
