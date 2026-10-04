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
export const riskDescriptions = {
 priority: { zh: '发现需要优先核查的风险信号或关键证据缺口，请结合详情中的原因和来源判断；不代表已确认跑路。', en: 'Risk signals or important evidence gaps need priority review. Read the findings and sources; this does not confirm a rug.' },
 watch: { zh: '存在需要持续关注的不确定事项，后续应结合新证据复核；不代表项目安全，也不代表已确认跑路。', en: 'Uncertainties warrant continued observation and review as new evidence appears. This confirms neither safety nor a rug.' },
 limited: { zh: '受公开资料、访问条件或链上数据覆盖限制，暂时无法充分核验；信息不足不等于低风险。', en: 'Available sources, access or on-chain coverage limit verification. Insufficient information does not imply low risk.' },
 unassessed: { zh: '尚未完成独立风险分级，需进一步核查；不代表没有风险。', en: 'A separate risk classification is pending. Further review is needed; this does not mean there is no risk.' },
};
export const evidenceDescriptions = {
 partial: { zh: '仅部分信息已得到核验，仍有证据缺口；具体范围请查看风险详情和来源。', en: 'Only part of the information has been verified; evidence gaps remain. See the findings and sources for scope.' },
 verified: { zh: '记录中的具体风险事项已有证据支持，不等于已经确认项目 Rug 或跑路。', en: 'Evidence supports the specific recorded findings. This does not by itself confirm a rug.' },
 reported: { zh: '信息来自报告或反馈，尚待独立核验，不应作为已确认事实。', en: 'Information comes from a report and awaits independent verification. It should not be treated as confirmed fact.' },
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
