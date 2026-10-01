import type { EcosystemProject } from '@/lib/project-schema';
import { initialProjectScorecards } from '@/lib/project-scorecard-proposal';

export const fallbackProjects: EcosystemProject[] = [
  {
    slug: 'kairo', name: 'KAIRO', symbol: 'K', handle: '@kairo_market',
    tagline: 'Trade. Predict. Earn. Create.', taglineZh: '交易、预测、赚取、创建。',
    description: {
      en: 'A financial platform on Arc bringing prediction markets, swaps, perpetuals, token creation, and rewards into one experience.',
      zh: 'Arc 上的综合金融平台，整合预测市场、兑换、永续合约、代币创建与奖励产品。',
    },
    categories: ['DeFi', 'Prediction Markets'], status: 'live',
    products: [{ en: 'Prediction markets', zh: '预测市场' }, { en: 'Swap', zh: '兑换' }, { en: 'Perpetuals', zh: '永续合约' }, { en: 'Create token', zh: '创建代币' }, { en: 'KAIRO Pools', zh: 'KAIRO 池', status: 'upcoming' }],
    tvl: null, fees24h: null, volume24h: null,
    tokenAddress: '0x3ead4e80e9e5bc0e01682d7ee74c4881b040d3ea', tokenMetrics: null,
    website: 'https://kairo.market/', x: 'https://x.com/kairo_market', sourceUrls: ['https://kairo.market/'],
    verifiedOn: '2026-09-23', recommended: true, recommendationReason: null, isPublished: true, updates: [], scorecard: initialProjectScorecards.kairo, scoreReviewedAt: '2026-09-27T00:00:00.000Z', scoreHistory: [],
  },
];
