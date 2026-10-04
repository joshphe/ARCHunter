export const riskLabels = {
 priority: { en: 'Priority review', zh: '优先核查' },
 watch: { en: 'Watch', zh: '持续观察' },
 limited: { en: 'Verification limited', zh: '核验受限' },
 unassessed: { en: 'Not classified', zh: '待分级' },
};
export const evidenceLabels = {
 partial: { en: 'Partially verified', zh: '部分核验' },
 verified: { en: 'Findings verified', zh: '风险事项已核验' },
 reported: { en: 'Reported · pending verification', zh: '报告待核验' },
};
export type RiskReview = {
 id: number; priority: keyof typeof riskLabels; evidenceStatus: keyof typeof evidenceLabels;
 reasonEn: string; reasonZh: string; sources: string[]; reviewedOn: string;
};
export function validateRiskReview(value: unknown): value is Omit<RiskReview, 'id'> & { slug: string } {
 if (!value || typeof value !== 'object') return false;
 const p = value as Record<string, unknown>;
 return typeof p.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)
  && typeof p.priority === 'string' && Object.hasOwn(riskLabels, p.priority)
  && typeof p.evidenceStatus === 'string' && Object.hasOwn(evidenceLabels, p.evidenceStatus)
  && ['reasonEn','reasonZh'].every(k => typeof p[k] === 'string' && (p[k] as string).trim().length > 0 && (p[k] as string).length <= 10000)
  && typeof p.reviewedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.reviewedOn)
  && !Number.isNaN(Date.parse(p.reviewedOn)) && new Date(p.reviewedOn).toISOString().slice(0,10) === p.reviewedOn
  && Array.isArray(p.sources) && p.sources.length > 0 && p.sources.length <= 30
  && p.sources.every(u => { try { return typeof u === 'string' && u.length <= 2000 && ['https:','http:'].includes(new URL(u).protocol); } catch { return false; } });
}
