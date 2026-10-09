import { Coins, Compass, LayoutDashboard, Map as MapIcon, ShieldAlert, Sparkles } from 'lucide-react';

export const WORKSPACES = [
  { key: 'Overview', label: '概览', Icon: LayoutDashboard, href: '/' },
  { key: 'Ecosystem', label: '生态', Icon: Compass, href: '/?view=ecosystem' },
  { key: 'Map', label: '生态地图', Icon: MapIcon, href: '/?view=map' },
  { key: 'Capital', label: '资金与流动性', Icon: Coins, href: '/?view=capital' },
  { key: 'Launchpad', label: '发射台', Icon: Sparkles, href: '/?view=launchpad' },
  { key: 'Rug', label: 'Rug 档案', Icon: ShieldAlert, href: '/?view=rug' },
] as const;
export type Workspace = typeof WORKSPACES[number]['key'];
export const WORKSPACE_ORDER_KEY = 'arcwatch-workspace-order';

export function parseWorkspaceOrder(saved: string | null): Workspace[] {
  const defaults = WORKSPACES.map(({ key }) => key);
  if (!saved) return defaults;
  try {
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return defaults;
    const valid = parsed.filter((key): key is Workspace => typeof key === 'string' && defaults.some(item => item === key));
    const unique = [...new Set(valid)];
    return [...unique, ...defaults.filter(key => !unique.includes(key))];
  } catch { return defaults; }
}
