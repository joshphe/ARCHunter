'use client';

import type { EcosystemProject } from '@/lib/project-schema';
import EcosystemMap from '@/app/ecosystem-map';

type Props = { language: 'en' | 'zh'; projects: EcosystemProject[] };

export default function EcosystemMapPage({ language, projects }: Props) {
  const zh = language === 'zh';
  const t = (en: string, cn: string) => zh ? cn : en;

  return <div className="content ecosystem-content ecosystem-map-workspace">
    <div className="page-heading">
      <div>
        <div className="eyebrow"><span className="eyebrow-line"/>{t('ARC ECOSYSTEM AT A GLANCE', 'ARC 生态全景')}<span className="eyebrow-line"/></div>
        <h1>{t('Ecosystem', '生态')} <span>{t('Map', '地图')}</span></h1>
        <p className="subtitle">{t('Explore Arc projects as a living city. Every project gets its own plot, placed automatically from its profile.', '以城市全景探索 Arc 项目。每个项目独占一块地，地图会根据项目信息自动布局。')}</p>
      </div>
      <div className="ecosystem-reviewed"><span className="ecosystem-reviewed-dot"/>{t('LIVE PROJECT DIRECTORY', '同步生态项目目录')}</div>
    </div>

    <div className="ecosystem-results-bar"><span>{t('ECOSYSTEM MAP', '生态地图')}</span><b>{zh ? `${String(projects.length).padStart(2, '0')} 个项目` : `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`}</b><i/><span>{t('Select a project sign to open its profile', '点击项目招牌打开详情')}</span></div>

    {projects.length ? <EcosystemMap projects={projects} language={language}/> : <div className="ecosystem-empty"><b>{t('Loading project map…', '正在加载生态地图…')}</b><span>{t('Project buildings appear here when the directory loads.', '项目目录加载后，项目建筑会显示在这里。')}</span></div>}

    <footer><span>© 2026 ARC WATCH <i>·</i> {t('COMMUNITY BUILT', '社区共建')}</span></footer>
  </div>;
}
