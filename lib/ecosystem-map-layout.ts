// Append only; archived projects retain reserved capacity in the neighborhood.
export const PROJECT_PLOTS = ['kairo','arcid','arcflow','arclight','argus','arcstocks','bagfi','foci','faze','fuci','kata-finance','murmur','tolly','vialiq'] as const;
export const BUILDING_TIERS = [
  { min: 0, label: '$0–100K', height: 16, name: ['Studio','单层工作室'] },
  { min: 100_000, label: '$100K–500K', height: 30, name: ['Townhouse','低层楼宇'] },
  { min: 500_000, label: '$500K–1M', height: 44, name: ['Office','小型办公楼'] },
  { min: 1_000_000, label: '$1M–5M', height: 60, name: ['Mid-rise','中层楼宇'] },
  { min: 5_000_000, label: '$5M–10M', height: 78, name: ['Tower','高层大厦'] },
  { min: 10_000_000, label: '$10M–100M', height: 96, name: ['Terraced tower','阶梯式高楼'] },
  { min: 100_000_000, label: '$100M–1B', height: 116, name: ['Twin towers','双塔建筑'] },
  { min: 1_000_000_000, label: '≥ $1B', height: 138, name: ['Landmark','地标建筑'] },
] as const;
export const PLOT_TIERS = [
  { min: 0, label: '$0–500K', side: 64, size: 'S' },
  { min: 500_000, label: '$500K–5M', side: 128, size: 'M' },
  { min: 5_000_000, label: '$5M–100M', side: 256, size: 'L' },
  { min: 100_000_000, label: '$100M–1B', side: 512, size: 'XL' },
  { min: 1_000_000_000, label: '≥ $1B', side: 1024, size: 'XXL' },
] as const;
export function mapScale(value: number | null | undefined) {
  const cap = typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  const buildingTier = cap === null ? null : BUILDING_TIERS.reduce((tier,item,i) => cap >= item.min ? i : tier,0);
  const plotTier = cap === null ? null : PLOT_TIERS.reduce((tier,item,i) => cap >= item.min ? i : tier,0);
  return { cap, buildingTier, plotTier, side: plotTier === null ? 64 : PLOT_TIERS[plotTier].side };
}

export const BASE_PLOT_SIDE = 64;
// A permanent neighborhood origin. Parcels may be repacked inside it after a size change.
export const NEIGHBORHOOD_ORIGIN = { u: 0, v: 0 } as const;
const RESERVE_TIERS = [1,0,1,1,2,1,0,0,1,0,0,0,1,0] as const;
type Cell = { u: number; v: number; side: number };
type MapProject = { slug: string; tokenMetrics?: { marketCapUsd?: number | null } | null };
const ROOF_HEIGHTS = [13,13,7,8,7,5,6,24] as const;
export const buildingHeight = (tier: number, side: number) => (BUILDING_TIERS[tier].height + ROOF_HEIGHTS[tier]) * side / BASE_PLOT_SIDE;
export function buildingVariant(slug: string) {
  let hash = 0;
  for (const char of slug) hash = (Math.imul(hash,31) + char.charCodeAt(0)) >>> 0;
  return hash % 3;
}

// Permanent membership mixes parcel sizes; categories never determine districts.
export const PROJECT_BLOCKS = [
  ['argus','kairo','bagfi'], ['arcflow','fuci','vialiq'],
  ['arclight','foci','kata-finance'], ['arcstocks','murmur','arcid'], ['faze','tolly'],
] as const;
export const BLOCK_GAP = 112;
// Separate whole parcels, preserving each square's market-cap dimensions.
export const PARCEL_SPACING = .25;
export function layoutMap<T extends MapProject>(projects: T[]) {
  const registry = new Set<string>(PROJECT_PLOTS);
  const bySlug = new Map(projects.map(p => [p.slug,p]));
  const additions = projects.filter(p => !registry.has(p.slug)).sort((a,b) => a.slug.localeCompare(b.slug));
  const slots: string[] = [...PROJECT_PLOTS,...additions.map(p=>p.slug)];
  const memberships: string[][] = PROJECT_BLOCKS.map(slugs=>[...slugs]);
  for(let i=0;i<additions.length;i+=3)memberships.push(additions.slice(i,i+3).map(p=>p.slug));
  const local = memberships.map((slugs,block) => {
    const entries = slugs.map(slug => {
      const slot=slots.indexOf(slug), project=bySlug.get(slug);
      return {slug,slot,project,side:project?mapScale(project.tokenMetrics?.marketCapUsd).side:PLOT_TIERS[RESERVE_TIERS[slot]??0].side};
    }).sort((a,b)=>b.side-a.side||a.slot-b.slot);
    const free: Cell[]=[{u:0,v:0,side:2048}];
    const parcels=entries.map(entry=>{
      free.sort((a,b)=>a.side-b.side||Math.max(a.u,a.v)-Math.max(b.u,b.v)||a.v-b.v||a.u-b.u);
      const index=free.findIndex(c=>c.side>=entry.side);
      if(index<0)throw new Error('No free parcel in registered block');
      let cell=free.splice(index,1)[0];
      while(cell.side>entry.side){
        const half=cell.side/2;
        free.push({u:cell.u+half,v:cell.v,side:half},{u:cell.u,v:cell.v+half,side:half},{u:cell.u+half,v:cell.v+half,side:half});
        cell={...cell,side:half};
      }
      return {...entry,...cell,block};
    });
    const w=Math.max(...parcels.map(p=>p.u+p.side)),h=Math.max(...parcels.map(p=>p.v+p.side));
    // Split free squares at the developed boundary so narrow leftover green strips
    // are represented too, rather than dropping a partially intersecting cell.
    const clipFree = (cell: Cell): Cell[] => {
      if(cell.u>=w||cell.v>=h)return [];
      if(cell.u+cell.side<=w&&cell.v+cell.side<=h)return [cell];
      const half=cell.side/2;
      return [cell,{...cell,u:cell.u+half},{...cell,v:cell.v+half},{...cell,u:cell.u+half,v:cell.v+half}].flatMap(c=>clipFree({...c,side:half}));
    };
    const space = <C extends Cell>(cell:C) => ({...cell,packedU:cell.u,packedV:cell.v,u:cell.u*(1+PARCEL_SPACING),v:cell.v*(1+PARCEL_SPACING)});
    const spacedParcels=parcels.map(space),spacedVacant=free.flatMap(clipFree).map(space);
    return {block,packedWidth:w,packedDepth:h,width:Math.max(...[...spacedParcels,...spacedVacant].map(p=>p.u+p.side)),depth:Math.max(...[...spacedParcels,...spacedVacant].map(p=>p.v+p.side)),parcels:spacedParcels,vacant:spacedVacant};
  });
  const east=local[0].width+BLOCK_GAP;
  const south=Math.max(local[0].depth,local[1].depth+BLOCK_GAP+local[2].depth)+BLOCK_GAP;
  const anchors=[{u:0,v:0},{u:east,v:0},{u:east,v:local[1].depth+BLOCK_GAP},{u:0,v:south},{u:local[3].width+BLOCK_GAP,v:south}];
  // New projects grow new streets beyond the original neighborhoods.
  const originalDepth=Math.max(...local.slice(0,5).map((b,i)=>anchors[i].v+b.depth));
  let nextRow=originalDepth+BLOCK_GAP;
  for(let i=5;i<local.length;i+=2){
    anchors.push({u:0,v:nextRow});
    if(local[i+1])anchors.push({u:local[i].width+BLOCK_GAP,v:nextRow});
    nextRow+=Math.max(local[i].depth,local[i+1]?.depth??0)+BLOCK_GAP;
  }
  const blocks=local.map((b,i)=>({...b,...anchors[i]}));
  const parcels=blocks.flatMap(b=>b.parcels.map(p=>({...p,u:p.u+b.u,v:p.v+b.v})));
  const vacant=blocks.flatMap(b=>b.vacant.map(c=>({...c,u:c.u+b.u,v:c.v+b.v,block:b.block})));
  const cityWidth=Math.max(...blocks.map(b=>b.u+b.width)),cityDepth=Math.max(...blocks.map(b=>b.v+b.depth));
  const top=Math.max(180,...parcels.map(p=>p.project?buildingHeight(mapScale(p.project.tokenMetrics?.marketCapUsd).buildingTier??0,p.side)+p.side/2+160-(p.u+p.v+p.side)/2:0));
  const origin={x:cityDepth+160,y:top};
  const buildings=parcels.flatMap(p=>p.project?[{project:p.project,slot:p.slot,side:p.side,u:p.u,v:p.v,block:p.block,x:origin.x+p.u-p.v,y:origin.y+(p.u+p.v+p.side)/2}]:[]).sort((a,b)=>a.y-b.y||a.x-b.x);
  const avenue=east-BLOCK_GAP/2,boulevard=south-BLOCK_GAP/2;
  const streets=[
    [{u:avenue,v:-36},{u:avenue,v:boulevard}],
    [{u:-36,v:boulevard},{u:cityWidth+145,v:boulevard}],
    [{u:avenue,v:local[1].depth+BLOCK_GAP/2},{u:cityWidth+145,v:local[1].depth+BLOCK_GAP/2}],
    [{u:local[3].width+BLOCK_GAP/2,v:boulevard},{u:local[3].width+BLOCK_GAP/2,v:originalDepth+36}],
  ];
  for(let i=5;i<blocks.length;i+=2){
    const row=blocks[i];
    streets.push([{u:-36,v:row.v-BLOCK_GAP/2},{u:cityWidth+145,v:row.v-BLOCK_GAP/2}]);
    if(blocks[i+1])streets.push([{u:row.width+BLOCK_GAP/2,v:row.v-BLOCK_GAP/2},{u:row.width+BLOCK_GAP/2,v:row.v+Math.max(row.depth,blocks[i+1].depth)+36}]);
  }
  return {buildings,parcels,vacant,blocks,streets,cityWidth,cityDepth,span:Math.max(cityWidth,cityDepth),origin,width:cityWidth+cityDepth+440,height:top+(cityWidth+cityDepth)/2+220};
}
