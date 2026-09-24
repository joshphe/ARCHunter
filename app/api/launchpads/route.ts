import { NextResponse } from 'next/server';
import { ARC_LAUNCH_START_TIMESTAMP } from '@/lib/arc';

const launchpads = [
  { slug: 'argus-world', name: 'Argus', logo: 'A', xHandle: 'arguspad', color: '#9ce86b' },
  { slug: 'foci', name: 'Foci', logo: 'F', xHandle: 'focidotfamily', color: '#a88bff' },
  { slug: 'wonk-fun', name: 'Wonk Fun', logo: 'W', xHandle: 'wonk_fun', color: '#ff9c72' },
  { slug: 'peach-launchpad', name: 'Peach', logo: 'P', xHandle: 'peachlfg', color: '#ff8fba' },
  { slug: 'tolly', name: 'Tolly', logo: 'T', xHandle: 'TollyLabs', color: '#74c9ff' },
  { slug: 'solonpad', name: 'Solon', logo: 'S', xHandle: 'Solonlabs1', color: '#ffd36b' },
] as const;

type LlamaFeeSummary = {
  name?: string;
  total24h?: number;
  total7d?: number;
  total30d?: number;
  totalAllTime?: number;
  change_1d?: number;
  totalDataChart?: [number, number][];
  methodology?: { Fees?: string };
};

export async function GET() {
  const results = await Promise.all(
    launchpads.map(async (launchpad) => {
      try {
        const response = await fetch(`https://api.llama.fi/summary/fees/${launchpad.slug}`, {
          next: { revalidate: 300 },
          headers: { accept: 'application/json' },
        });
        if (!response.ok) throw new Error(`DefiLlama returned ${response.status}`);
        const data = (await response.json()) as LlamaFeeSummary;
        return {
          ...launchpad,
          available: typeof data.total24h === 'number',
          fees24h: data.total24h ?? null,
          fees7d: data.total7d ?? null,
          fees30d: data.total30d ?? null,
          feesAllTime: data.totalAllTime ?? null,
          change24h: data.change_1d ?? null,
          history: (data.totalDataChart ?? []).filter(([timestamp]) => timestamp >= ARC_LAUNCH_START_TIMESTAMP),
          methodology: data.methodology?.Fees ?? null,
          sourceUrl: `https://defillama.com/protocol/${launchpad.slug}`,
        };
      } catch {
        return {
          ...launchpad,
          available: false,
          fees24h: null,
          fees7d: null,
          fees30d: null,
          feesAllTime: null,
          change24h: null,
          history: [],
          methodology: null,
          sourceUrl: `https://defillama.com/protocol/${launchpad.slug}`,
        };
      }
    }),
  );

  return NextResponse.json({ updatedAt: new Date().toISOString(), source: 'DefiLlama', launchpads: results });
}
