'use client';

import type { EcosystemProject } from '@/lib/project-schema';
import EcosystemMap from '@/app/ecosystem-map';
import ProjectDirectorySync from './project-directory-sync';
import type { DirectorySyncProps } from './project-directory-sync';

type Props = { language: 'en' | 'zh'; projects: EcosystemProject[] } & DirectorySyncProps;

export default function EcosystemMapPage({ language, projects, syncError, ...syncProps }: Props) {
  const zh = language === 'zh';
  const t = (en: string, cn: string) => zh ? cn : en;

  return <div className="content ecosystem-content ecosystem-map-workspace">
    <div className="page-heading">
      <div>
        <div className="eyebrow"><span className="eyebrow-line"/>{t('ARC ECOSYSTEM AT A GLANCE', 'ARC 生态全景')}<span className="eyebrow-line"/></div>
        <h1>{t('Ecosystem', '生态')} <span>{t('Map', '地图')}</span></h1>
        <p className="subtitle">{t('Explore Arc, one building at a time. A city of projects, shaped by market cap.', '沿街探索 ARC 生态，让项目市值成为看得见的城市轮廓。')}</p>
      </div>
      <ProjectDirectorySync language={language} syncError={syncError} {...syncProps}/>
    </div>

    {projects.length ? <EcosystemMap projects={projects} language={language}/> : <div className="ecosystem-empty"><b>{syncError ? t('Could not sync the project map', '项目地图同步失败') : t('Loading project map…', '正在加载生态地图…')}</b><span>{syncError ? t('Use Refresh to try again.', '请点击刷新项目重试。') : t('Project buildings appear here when the directory loads.', '项目目录加载后，项目建筑会显示在这里。')}</span></div>}

    <footer><span>© 2026 ARC WATCH <i>·</i> {t('COMMUNITY BUILT', '社区共建')}</span></footer>
  </div>;
}
