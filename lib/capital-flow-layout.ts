import { FLOW_CHAINS, type ChainFlow } from './capital-flow';

export type FlowNetworkNode = {
  chain: ChainFlow;
  x: number;
  y: number;
  labelX: number;
  labelAnchor: 'start' | 'end';
};

const MAX_NODES = 16;
const registryOrder = new Map<number, number>(FLOW_CHAINS.map((chain, index) => [chain.domain, index]));
const totalVolume = (chain: ChainFlow) => chain.inflow + chain.outflow;

export function layoutFlowNetwork(chains: readonly ChainFlow[], selected: number | null): FlowNetworkNode[] {
  const ranked = [...chains].sort((a, b) => totalVolume(b) - totalVolume(a) || a.domain - b.domain);
  const visible = ranked.slice(0, MAX_NODES).sort((a, b) =>
    (registryOrder.get(a.domain) ?? FLOW_CHAINS.length) - (registryOrder.get(b.domain) ?? FLOW_CHAINS.length) || a.domain - b.domain,
  );
  const rightCount = Math.ceil(visible.length / 2);

  // One perimeter, with at least 73 SVG units between neighboring rows at 16 nodes.
  // Labels face outward so their two lines never compete with another orbit or the ARC summary.
  const nodes = visible.map((chain, index): FlowNetworkNode => {
    const right = index < rightCount;
    const count = right ? rightCount : visible.length - rightCount;
    const row = right ? index : visible.length - index - 1;
    const y = count === 1 ? 340 : 82 + row * 516 / (count - 1);
    const offsetX = 210 * Math.sqrt(1 - ((y - 340) / 285) ** 2);
    const x = 380 + (right ? offsetX : -offsetX);
    return { chain, x, y, labelX: x + (right ? 42 : -42), labelAnchor: right ? 'start' : 'end' };
  });

  // An inspected chain outside the top 16 inherits the smallest route's slot.
  // Selection and direction filters therefore leave every other node in place.
  const selection = chains.find(chain => chain.domain === selected);
  if (selection && !visible.some(chain => chain.domain === selected)) {
    const replacedDomain = ranked[MAX_NODES - 1]?.domain;
    const slot = nodes.findIndex(node => node.chain.domain === replacedDomain);
    if (slot !== -1) nodes[slot] = { ...nodes[slot], chain: selection };
  }
  return nodes;
}
