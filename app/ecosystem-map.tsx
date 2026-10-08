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

const DISTRICTS: Array<{ id: District; centerX: number; centerY: number; color: string }> = [
  { id: 'markets', centerX: 525, centerY: 345, color: '#58adff' },
  { id: 'launchpads', centerX: 1010, centerY: 345, color: '#ff9958' },
  { id: 'infrastructure', centerX: 470, centerY: 760, color: '#b190ff' },
  { id: 'applications', centerX: 1036, centerY: 760, color: '#a7dd62' },
];
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
  const categories = project.categories.join(' ').toLowerCase();
  if (/launchpad|token/.test(categories)) return 'launchpads';
  if (/infrastructure|oracle|developer|tool|security|bridge|data/.test(categories)) return 'infrastructure';
  if (/defi|finance|lending|exchange|trading|prediction|market/.test(categories)) return 'markets';
  return 'applications';
}

function getBuildingSize(marketCap: number | null) {
  if (marketCap == null || marketCap <= 0) return { visual: 'greenhouse' as const, spriteWidth: 190 };
  if (marketCap >= 100_000_000) return { visual: 'landmark' as const, spriteWidth: 225 };
  if (marketCap >= 10_000_000) return { visual: 'midrise' as const, spriteWidth: 210 };
  if (marketCap >= 1_000_000) return { visual: 'midrise' as const, spriteWidth: 190 };
  return { visual: 'pavilion' as const, spriteWidth: 185 };
}

function layoutProjects(projects: EcosystemProject[]): Building[] {
  const grouped = new Map<District, EcosystemProject[]>(DISTRICTS.map(({ id }) => [id, []]));
  projects.forEach((project) => grouped.get(getDistrict(project))?.push(project));

  return DISTRICTS.flatMap((district) => {
    const members = (grouped.get(district.id) ?? []).sort((a, b) => a.slug.localeCompare(b.slug));
    const columns = Math.max(1, Math.min(3, Math.ceil(Math.sqrt(members.length))));
    const rows = Math.ceil(members.length / columns);
    const stepX = columns > 1 ? Math.min(230, 460 / (columns - 1)) : 0;
    const stepY = rows > 1 ? Math.min(160, 260 / (rows - 1)) : 0;
    return members.map((project, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const marketCap = project.tokenMetrics?.marketCapUsd ?? null;
      const size = getBuildingSize(marketCap);
      const asset = BUILDING_ASSETS[size.visual];
      return {
        project,
        district: district.id,
        x: district.centerX + (column - (columns - 1) / 2) * stepX,
        y: district.centerY + (row - (rows - 1) / 2) * stepY,
        ...size,
        spriteHeight: size.spriteWidth * asset.height / asset.width,
        marketCap,
      };
    });
  }).sort((a, b) => a.y - b.y);
}

function formatMarketCap(value: number | null, zh: boolean) {
  if (value == null || value <= 0) return zh ? '暂无已验证市值' : 'No verified market cap';
  return new Intl.NumberFormat(zh ? 'zh-CN' : 'en-US', {
    style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2,
  }).format(value);
}

export default function EcosystemMap({ projects, language }: Props) {
  const zh = language === 'zh';
  const t = (en: string, cn: string) => zh ? cn : en;
  const [zoom, setZoom] = useState(1);
  const buildings = useMemo(() => layoutProjects(projects), [projects]);

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
      <div className="ecosystem-map-stage" style={{ width: `${zoom * 100}%` }}>
        <div className="ecosystem-map-terrain" role="img" aria-label={t('An isometric island with landscaped blocks, streets, parks and water.', '等距视角的生态岛，包含道路、绿地、公园与水岸。')}/>
        <div className="ecosystem-map-buildings" aria-hidden="true">
          {buildings.map((building) => {
            const asset = BUILDING_ASSETS[building.visual];
            return <div
              key={`${building.project.slug}-building`}
              className={`ecosystem-map-building-sprite ${building.visual}`}
              role="presentation"
              style={{
                left: `${(building.x / 1536) * 100}%`,
                top: `${(building.y / 1024) * 100}%`,
                width: `${(building.spriteWidth / 1536) * 100}%`,
                aspectRatio: `${asset.width} / ${asset.height}`,
                backgroundImage: `url('${asset.src}')`,
              }}
            />;
          })}
        </div>
        {buildings.map((building) => {
          const district = DISTRICTS.find(({ id }) => id === building.district)!;
          const label = `${building.project.name} · ${formatMarketCap(building.marketCap, zh)}`;
          const markerTop = building.y - building.spriteHeight - 25;
          return <Link
            key={`${building.project.slug}-marker`}
            href={`/projects/${encodeURIComponent(building.project.slug)}`}
            className="ecosystem-map-marker"
            style={{ left: `${(building.x / 1536) * 100}%`, top: `${(markerTop / 1024) * 100}%`, '--marker-color': district.color } as CSSProperties & { '--marker-color': string }}
            aria-label={`${building.project.name}, ${formatMarketCap(building.marketCap, zh)}`}
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
        <span><i className="mega"/>{t('≥ $100M', '≥ $1 亿')}</span><span><i className="large"/>{t('$10M–$100M', '$1,000 万–$1 亿')}</span><span><i className="medium"/>{t('$1M–$10M', '$100 万–$1,000 万')}</span><span><i className="small"/>{t('< $1M', '< $100 万')}</span><span><i className="unpriced"/>{t('No verified cap', '暂无已验证市值')}</span>
      </div>
    </div>
    <div className="capital-footnote ecosystem-map-note">{t('Every project has its own landscaped plot. Building style and size reflect linked token market data; projects without a verified value use a greenhouse. Neighborhoods and positions are assigned automatically from project categories and directory entries.', '每个项目独占一块带景观的地皮。建筑形态和规模对应已关联代币市值；没有已验证市值的项目以温室表示。街区和位置会根据项目类别及目录内容自动排布。')}</div>
  </section>;
}
