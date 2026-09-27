import type { ProjectScorecard, ProjectScoreDimensionKey } from '@/lib/project-schema';

export const scoreDimensions: Array<{
  key: ProjectScoreDimensionKey;
  labelEn: string;
  labelZh: string;
  shortEn: string;
  shortZh: string;
  weight: number;
  descriptionEn: string;
  descriptionZh: string;
}> = [
  { key: 'delivery', labelEn: 'Product & delivery', labelZh: '产品与交付', shortEn: 'Delivery', shortZh: '交付', weight: 25, descriptionEn: 'Product availability, core functionality, and shipping cadence.', descriptionZh: '产品可用性、核心功能和持续交付情况。' },
  { key: 'adoption', labelEn: 'Real adoption', labelZh: '实际采用', shortEn: 'Adoption', shortZh: '采用', weight: 25, descriptionEn: 'Usage and growth signals appropriate to the project category.', descriptionZh: '按项目类别评估适用的使用和增长信号。' },
  { key: 'economics', labelEn: 'Economic activity', labelZh: '经济活跃度', shortEn: 'Economics', shortZh: '经济', weight: 20, descriptionEn: 'Fees, revenue, liquidity, or other relevant activity; mark N/A when unsuitable.', descriptionZh: '手续费、收入、流动性等相关指标；不适用时可标记为 N/A。' },
  { key: 'security', labelEn: 'Security & transparency', labelZh: '安全与透明度', shortEn: 'Security', shortZh: '安全', weight: 20, descriptionEn: 'Contract verification, audits, risk disclosures, documentation, and governance.', descriptionZh: '合约验证、审计、风险披露、文档和治理信息。' },
  { key: 'ecosystem', labelEn: 'ARC contribution', labelZh: 'ARC 生态贡献', shortEn: 'Ecosystem', shortZh: '生态', weight: 10, descriptionEn: 'Integrations, infrastructure value, and support for other ARC projects.', descriptionZh: '生态集成、基础设施价值及对 ARC 其他项目的支持。' },
];

export function emptyScorecard(): ProjectScorecard {
  return Object.fromEntries(scoreDimensions.map(({ key }) => [key, { score: null, applicable: true, noteEn: '', noteZh: '' }])) as ProjectScorecard;
}

export function getProjectScore(scorecard: ProjectScorecard | null | undefined) {
  if (!scorecard) return { total: null, coverage: 0 };
  let availableWeight = 0;
  let scoredWeight = 0;
  let weightedScore = 0;
  for (const dimension of scoreDimensions) {
    const value = scorecard[dimension.key];
    if (!value || !value.applicable) continue;
    availableWeight += dimension.weight;
    if (value.score == null) continue;
    scoredWeight += dimension.weight;
    weightedScore += (value.score / 5) * dimension.weight;
  }
  const coverage = availableWeight ? scoredWeight / availableWeight : 0;
  return { total: coverage >= 0.7 && scoredWeight ? Math.round((weightedScore / scoredWeight) * 100) : null, coverage };
}
