'use client';

import type { EcosystemProject } from '@/lib/project-schema';
import ProjectAvatar from '@/app/project-avatar';

type Props = { projects: EcosystemProject[]; language: 'en' | 'zh'; onSelectProject: (slug: string) => void };

export default function ProjectTicker({ projects, language, onSelectProject }: Props) {
  if (projects.length === 0) return null;

  const items = [...projects].sort((a, b) => Number(b.recommended) - Number(a.recommended));
  const zh = language === 'zh';
  const statusLabel = (status: EcosystemProject['status']) => status === 'live'
    ? (zh ? '已上线' : 'LIVE')
    : status === 'beta' ? (zh ? '测试版' : 'BETA') : (zh ? '即将上线' : 'UPCOMING');

  return <section className="overview-project-ticker" aria-label={zh ? 'ARC 生态项目轮播' : 'ARC ecosystem project ticker'}>
    <div className="project-ticker-heading">
      <span className="project-ticker-kicker"><i/> {zh ? '生态项目' : 'ECOSYSTEM'}</span>
      <span className="project-ticker-caption">{zh ? '项目速览' : 'PROJECT SPOTLIGHT'}</span>
    </div>
    <div className="project-ticker-viewport">
      <div className="project-ticker-track" style={{ '--ticker-duration': `${Math.max(28, items.length * 5)}s` } as React.CSSProperties}>
        {[0, 1].map((copy) => <div className="project-ticker-group" key={copy} aria-hidden={copy === 1}>
          {items.map((project) => <button className="project-ticker-card" key={`${copy}-${project.slug}`} type="button" tabIndex={copy === 1 ? -1 : 0} onClick={() => onSelectProject(project.slug)} aria-label={zh ? `查看 ${project.name} 项目信息` : `View ${project.name} project details`}>
            <ProjectAvatar handle={project.handle} symbol={project.symbol} className="project-ticker-avatar"/>
            <div className="project-ticker-copy">
              <div className="project-ticker-name"><b>{project.name}</b><span className={`project-ticker-status ${project.status}`}>{statusLabel(project.status)}</span></div>
              <span title={zh ? project.taglineZh || project.tagline : project.tagline}>{zh ? project.taglineZh || project.tagline : project.tagline}</span>
            </div>
          </button>)}
        </div>)}
      </div>
    </div>
  </section>;
}
