import type { EcosystemProject } from '@/lib/project-schema';

export const fallbackProjects: EcosystemProject[] = [
  {
    slug: 'vort', name: 'Vort', symbol: 'V', handle: '@VortLaunch',
    tagline: 'Verifiable reward flow on Arc.', taglineZh: 'Arc 上可验证的奖励分配机制。',
    description: {
      en: 'Vort routes creator proceeds into holder rewards through settled epochs, with reward allocations and settlement records published on Arc.',
      zh: 'Vort 将创作者收益按周期分配给持币者，并在 Arc 上公开奖励分配与结算记录。',
    },
    categories: ['Tokens'], status: 'live',
    products: [{ en: 'Holder rewards', zh: '持币者奖励' }, { en: 'Epoch settlements', zh: '周期结算' }, { en: 'Public reward ledger', zh: '公开奖励账本' }, { en: 'Buyback and burn', zh: '回购与销毁' }],
    tvl: null, fees24h: null, volume24h: null,
    tokenAddress: '0x4d57060f3825d3b995f35a30194f3e74e105f3ec', tokenMetrics: null,
    website: 'https://vort.bot/', x: 'https://x.com/VortLaunch', sourceUrls: ['https://vort.bot/'],
    verifiedOn: '2026-09-23', recommended: true, recommendationReason: null, isPublished: true, updates: [],
  },
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
    verifiedOn: '2026-09-23', recommended: true, recommendationReason: null, isPublished: true, updates: [],
  },
];
