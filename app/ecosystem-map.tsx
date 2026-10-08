'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { EcosystemProject } from '@/lib/project-schema';
import ProjectAvatar from '@/app/project-avatar';

type Props = { projects: EcosystemProject[]; language: 'en' | 'zh' };
type District = 'markets' | 'launchpads' | 'infrastructure' | 'applications';
type BuildingVisual = 'landmark' | 'midrise' | 'pavilion' | 'greenhouse';
type Building = { project: EcosystemProject; district: District; x: number; y: number; visual: BuildingVisual; spriteWidth: number; spriteHeight: number; marketCap: number | null };

const DISTRICTS: Array<{ id: District; color: string }> = [
  { id: 'markets', color: '#58adff' },
  { id: 'launchpads', color: '#ff9958' },
  { id: 'infrastructure', color: '#b190ff' },
  { id: 'applications', color: '#a7dd62' },
];
const MAP_WIDTH = 1536;
const MAP_HEIGHT = 1024;
const DISTRICT_CENTERS: Record<District, { x: number; y: number }> = {
  infrastructure: { x: 625, y: 300 },
  markets: { x: 420, y: 545 },
  launchpads: { x: 1080, y: 420 },
  applications: { x: 960, y: 700 },
};
const ISLAND_OUTLINE = [
  [344, 112], [1192, 88], [1352, 164], [1436, 336], [1414, 494], [1290, 650],
  [1192, 780], [1040, 858], [840, 900], [690, 852], [512, 788], [350, 692],
  [214, 574], [106, 446], [174, 288], [268, 176],
] as const;
const DISTRICT_NAMES: Record<District, { en: string; zh: string }> = {
  markets: { en: 'Markets & DeFi', zh: 'DeFi 与市场' },
  launchpads: { en: 'Launchpads & tokens', zh: '发射台与代币' },
  infrastructure: { en: 'Infrastructure', zh: '基础设施' },
  applications: { en: 'Apps & community', zh: '应用与社区' },
};
const BUILDING_ASSETS: Record<BuildingVisual, { src: string; width: number; height: number }> = {
  landmark: { src: '/images/buildings/landmark.webp', width: 1094, height: 1000 },
  midrise: { src: '/images/buildings/midrise.webp', width: 1000, height: 667 },
  pavilion: { src: '/images/buildings/pavilion.webp', width: 1000, height: 667 },
  greenhouse: { src: '/images/buildings/greenhouse.webp', width: 1000, height: 667 },
};

function getDistrict(project: EcosystemProject): District {
  const profile = [project.name, project.tagline, project.categories.join(' '), project.description.en]
    .join(' ').toLowerCase();
  if (/launchpad|token launches|token launch|launches tokens/.test(profile)) return 'launchpads';
  if (/infrastructure|oracle|developer|tooling|security|bridge|indexer|data layer/.test(profile)) return 'infrastructure';
  if (/defi|finance|lending|exchange|trading|prediction market|swap|yield|liquidity/.test(profile)) return 'markets';
  return 'applications';
}

function getBuildingSize(marketCap: number | null) {
  if (marketCap == null || marketCap <= 0) return { visual: 'greenhouse' as const, spriteWidth: 255 };
  if (marketCap >= 100_000_000) return { visual: 'landmark' as const, spriteWidth: 360 };
  if (marketCap >= 10_000_000) return { visual: 'landmark' as const, spriteWidth: 325 };
  if (marketCap >= 1_000_000) return { visual: 'midrise' as const, spriteWidth: 285 };
  return { visual: 'pavilion' as const, spriteWidth: 245 };
}

function slugSeed(slug: string) {
  let seed = 2166136261;
  for (const character of slug) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return seed >>> 0;
}

function isOnIsland(x: number, y: number, halfWidth: number, depth: number) {
  const points = [
    [x, y - depth / 2], [x - halfWidth, y - depth / 2], [x + halfWidth, y - depth / 2],
    [x - halfWidth, y], [x + halfWidth, y],
  ];
  return points.every(([pointX, pointY]) => {
    let inside = false;
    for (let index = 0, previous = ISLAND_OUTLINE.length - 1; index < ISLAND_OUTLINE.length; previous = index, index += 1) {
      const [x1, y1] = ISLAND_OUTLINE[index];
      const [x2, y2] = ISLAND_OUTLINE[previous];
      const crosses = (y1 > pointY) !== (y2 > pointY) && pointX < ((x2 - x1) * (pointY - y1)) / (y2 - y1) + x1;
      if (crosses) inside = !inside;
    }
    return inside;
  });
}

function layoutProjects(projects: EcosystemProject[]): Building[] {
  const scale = projects.length > 10 ? 0.68 : projects.length > 6 ? 0.84 : 1;
  const ordered = projects.map((project) => {
    const marketCap = project.tokenMetrics?.marketCapUsd ?? null;
    const size = getBuildingSize(marketCap);
    return { project, district: getDistrict(project), marketCap, ...size };
  }).sort((a, b) => b.spriteWidth - a.spriteWidth || a.project.slug.localeCompare(b.project.slug));

  const placed: Array<Building & { bounds: { left: number; right: number; top: number; bottom: number } }> = [];
  return ordered.map(({ project, district, marketCap, visual, spriteWidth }) => {
    const asset = BUILDING_ASSETS[visual];
    const width = spriteWidth * scale;
    const height = width * asset.height / asset.width;
    const center = DISTRICT_CENTERS[district];
    let random = slugSeed(project.slug) || 1;
    const next = () => {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      return random / 4294967296;
    };
    let position = { x: center.x, y: center.y };
    let bestScore = Number.POSITIVE_INFINITY;

    // Organic, repeatable scattering: prefer the project's district, then repel
    // any candidate whose complete building-and-land sprite would overlap.
    for (let attempt = 0; attempt < 6000; attempt += 1) {
      const radius = 35 + Math.sqrt(next()) * (attempt < 500 ? 250 : 520);
      const angle = next() * Math.PI * 2;
      const x = attempt < 1400
        ? Math.max(width / 2 + 18, Math.min(MAP_WIDTH - width / 2 - 18, center.x + Math.cos(angle) * radius))
        : width / 2 + 18 + next() * (MAP_WIDTH - width - 36);
      const y = attempt < 1400
        ? Math.max(height + 22, Math.min(MAP_HEIGHT - 42, center.y + Math.sin(angle) * radius * 0.72))
        : height + 22 + next() * (MAP_HEIGHT - height - 64);
      if (!isOnIsland(x, y, width * 0.31, height * 0.22)) continue;
      const bounds = { left: x - width / 2, right: x + width / 2, top: y - height, bottom: y };
      const collision = placed.some((other) =>
        bounds.left < other.bounds.right + 18 && bounds.right + 18 > other.bounds.left &&
        bounds.top < other.bounds.bottom + 16 && bounds.bottom + 16 > other.bounds.top,
      );
      if (collision) continue;
      const score = Math.hypot(x - center.x, (y - center.y) * 1.25) + next() * 20;
      if (score < bestScore) {
        bestScore = score;
        position = { x, y };
      }
      if (attempt > 120 && bestScore < 145) break;
    }

    const bounds = { left: position.x - width / 2, right: position.x + width / 2, top: position.y - height, bottom: position.y };
    const building = { project, district, ...position, visual, spriteWidth: width, spriteHeight: height, marketCap, bounds };
    placed.push(building);
    return building;
  }).sort((a, b) => a.y - b.y);
}

function formatMarketCap(value: number | null, zh: boolean) {
  if (value == null || value <= 0) return zh ? '暂无已验证市值' : 'No verified market cap';
  return new Intl.NumberFormat(zh ? 'zh-CN' : 'en-US', {
    style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2,
  }).format(value);
}

function marketCapTier(value: number | null, zh: boolean) {
  if (value == null || value <= 0) return zh ? '暂无已验证市值' : 'No verified market cap';
  if (value >= 100_000_000) return zh ? '超大型 · ≥ $1 亿' : 'Mega · ≥ $100M';
  if (value >= 10_000_000) return zh ? '大型 · $1,000 万–$1 亿' : 'Large · $10M–$100M';
  if (value >= 1_000_000) return zh ? '中型 · $100 万–$1,000 万' : 'Mid · $1M–$10M';
  return zh ? '小型 · < $100 万' : 'Small · < $1M';
}

export default function EcosystemMap({ projects, language }: Props) {
  const zh = language === 'zh';
  const t = (en: string, cn: string) => zh ? cn : en;
  const [zoom, setZoom] = useState(1);
  const buildings = useMemo(() => layoutProjects(projects), [projects]);
  const mapHeight = MAP_HEIGHT;

  return <section className="ecosystem-map-card" aria-label={t('Arc ecosystem map', 'Arc 生态地图')}>
    <div className="ecosystem-map-toolbar">
      <div><span className="section-kicker">{t('ARC ECOSYSTEM MAP', 'ARC 生态地图')}</span><b>{t('One dedicated plot per project · buildings scale by market cap', '每个项目独占一块地 · 建筑规模对应代币市值')}</b></div>
      <div className="ecosystem-map-tools">
        <button type="button" onClick={() => setZoom((value) => Math.min(1.5, Number((value + 0.15).toFixed(2))))} aria-label={t('Zoom in', '放大地图')} title={t('Zoom in', '放大地图')}><ZoomIn size={15}/></button>
        <button type="button" onClick={() => setZoom((value) => Math.max(0.8, Number((value - 0.15).toFixed(2))))} aria-label={t('Zoom out', '缩小地图')} title={t('Zoom out', '缩小地图')}><ZoomOut size={15}/></button>
        <button type="button" onClick={() => setZoom(1)} aria-label={t('Reset map zoom', '重置地图缩放')} title={t('Reset map zoom', '重置地图缩放')}><RotateCcw size={14}/></button>
      </div>
    </div>

    <div className="ecosystem-map-viewport">
      <div className="ecosystem-map-stage" style={{ width: `${zoom * 100}%`, aspectRatio: `${MAP_WIDTH} / ${mapHeight}` }}>
        <div className="ecosystem-map-terrain" role="img" aria-label={t('An isometric island with scenic roads, parks, plazas and waterfront.', '等距视角的生态岛，包含道路、公园、广场与水岸。')}/>
        <div className="ecosystem-map-buildings" aria-hidden="true">
          {buildings.map((building) => {
            const asset = BUILDING_ASSETS[building.visual];
            return <div
              key={`${building.project.slug}-building`}
              className={`ecosystem-map-building-sprite ${building.visual}`}
              role="presentation"
              style={{
                left: `${(building.x / 1536) * 100}%`,
                top: `${(building.y / mapHeight) * 100}%`,
                width: `${(building.spriteWidth / 1536) * 100}%`,
                aspectRatio: `${asset.width} / ${asset.height}`,
                backgroundImage: `url('${asset.src}')`,
              }}
            />;
          })}
        </div>
        {buildings.map((building) => {
          const district = DISTRICTS.find(({ id }) => id === building.district)!;
          const tier = marketCapTier(building.marketCap, zh);
          const label = `${building.project.name} · ${formatMarketCap(building.marketCap, zh)} · ${tier}`;
          const markerTop = building.y - Math.min(building.spriteHeight, 180) - 25;
          return <Link
            key={`${building.project.slug}-marker`}
            href={`/projects/${encodeURIComponent(building.project.slug)}`}
            className="ecosystem-map-marker"
            style={{ left: `${(building.x / 1536) * 100}%`, top: `${(markerTop / mapHeight) * 100}%`, '--marker-color': district.color } as CSSProperties & { '--marker-color': string }}
            aria-label={`${building.project.name}, ${formatMarketCap(building.marketCap, zh)}, ${tier}`}
            title={label}
          >
            <ProjectAvatar handle={building.project.handle} symbol={building.project.symbol} className="ecosystem-map-avatar"/>
            <span className="ecosystem-map-marker-label">{building.project.name}</span>
          </Link>;
        })}
      </div>
    </div>

    <div className="ecosystem-map-legend">
      <div className="ecosystem-map-districts">{DISTRICTS.map(({ id, color }) => <span key={id}><i style={{ background: color }}/>{zh ? DISTRICT_NAMES[id].zh : DISTRICT_NAMES[id].en}</span>)}</div>
      <div className="ecosystem-map-sizes" aria-label={t('Market cap building size legend', '市值与建筑规模图例')}>
        {([
          { visual: 'landmark' as const, width: 29, height: 30, label: t('≥ $100M', '≥ $1 亿') },
          { visual: 'landmark' as const, width: 25, height: 25, label: t('$10M–$100M', '$1,000 万–$1 亿') },
          { visual: 'midrise' as const, width: 23, height: 19, label: t('$1M–$10M', '$100 万–$1,000 万') },
          { visual: 'pavilion' as const, width: 19, height: 15, label: t('< $1M', '< $100 万') },
          { visual: 'greenhouse' as const, width: 20, height: 15, label: t('No verified cap', '暂无已验证市值') },
        ]).map(({ visual, width, height, label }) => <span key={label}><i className={`map-tier-${visual}`} style={{ width, height, backgroundImage: `url('${BUILDING_ASSETS[visual].src}')` }}/>{label}</span>)}
      </div>
    </div>
    <div className="capital-footnote ecosystem-map-note">{t('Every project occupies a separate mapped plot. Building models and size bands are tied to reported token market cap; the colored pin shows project category. Projects without a verified value use a greenhouse.', '每个项目都对应地图上一块独立地皮。建筑模型与尺寸等级按代币市值划分；彩色图钉代表项目类别。暂无已验证市值的项目使用温室。')}</div>
  </section>;
}
