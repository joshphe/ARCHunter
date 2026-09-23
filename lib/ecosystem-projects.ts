export type EcosystemProject = {
  slug: string;
  name: string;
  symbol: string;
  handle: string;
  tagline: string;
  description: { en: string; zh: string };
  categories: string[];
  status: 'beta' | 'live' | 'upcoming';
  products: { en: string; zh: string; status?: 'upcoming' }[];
  tvl: number | null;
  fees24h: number | null;
  volume24h: number | null;
  tokenAddress?: string;
  website: string;
  x: string;
  source: string;
  verifiedOn: string;
};

// Curated project metadata lives here; add or update entries as they are reviewed.
export const ecosystemProjects: EcosystemProject[] = [
  {
    slug: 'vort',
    name: 'Vort',
    symbol: 'V',
    handle: '@VortLaunch',
    tagline: 'Verifiable reward flow on Arc.',
    description: {
      en: 'Vort routes creator proceeds into holder rewards through settled epochs, with reward allocations and settlement records published on Arc.',
      zh: 'Vort 将创作者收益按周期分配给持币者，并在 Arc 上公开奖励分配与结算记录。',
    },
    categories: ['Tokens'],
    status: 'live',
    products: [
      { en: 'Holder rewards', zh: '持币者奖励' },
      { en: 'Epoch settlements', zh: '周期结算' },
      { en: 'Public reward ledger', zh: '公开奖励账本' },
      { en: 'Buyback and burn', zh: '回购与销毁' },
    ],
    tvl: null,
    fees24h: null,
    volume24h: null,
    tokenAddress: '0x4d57060f3825d3b995f35a30194f3e74e105f3ec',
    website: 'https://vort.bot/',
    x: 'https://x.com/VortLaunch',
    source: 'https://vort.bot/',
    verifiedOn: '2026-09-23',
  },
  {
    slug: 'kairo',
    name: 'KAIRO',
    symbol: 'K',
    handle: '@kairo_market',
    tagline: 'Trade. Predict. Earn. Create.',
    description: {
      en: 'A financial platform on Arc bringing prediction markets, swaps, perpetuals, token creation, and rewards into one experience.',
      zh: 'Arc 上的综合金融平台，整合预测市场、兑换、永续合约、代币创建与奖励产品。',
    },
    categories: ['DeFi', 'Prediction Markets'],
    status: 'live',
    products: [
      { en: 'Prediction markets', zh: '预测市场' },
      { en: 'Swap', zh: '兑换' },
      { en: 'Perpetuals', zh: '永续合约' },
      { en: 'Create token', zh: '创建代币' },
      { en: 'KAIRO Pools', zh: 'KAIRO 池', status: 'upcoming' },
    ],
    tvl: null,
    fees24h: null,
    volume24h: null,
    website: 'https://kairo.market/',
    x: 'https://x.com/kairo_market',
    source: 'https://kairo.market/',
    verifiedOn: '2026-09-23',
  },
];
