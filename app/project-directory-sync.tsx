'use client';

import { RefreshCw } from 'lucide-react';
import type { ProjectDataSource } from './use-ecosystem-projects';

export type DirectorySyncProps = {
  dataSource: ProjectDataSource;
  refreshing: boolean;
  syncError: boolean;
  onRefresh: () => void;
};

export default function ProjectDirectorySync({ language, dataSource, refreshing, syncError, onRefresh, compact = false }: DirectorySyncProps & { language: 'en' | 'zh'; compact?: boolean }) {
  const zh = language === 'zh';
  const label = syncError ? (zh ? '同步失败，点击重试' : 'Sync failed · retry')
    : dataSource === 'bundled' ? (zh ? '示例目录 · 尚未连接' : 'Sample directory · offline')
    : dataSource === null ? (zh ? '正在同步项目目录' : 'Loading project directory')
    : (zh ? '同步生态项目目录' : 'Live project directory');
  const compactLabel = syncError ? (zh ? '同步失败' : 'Sync failed')
    : dataSource === 'bundled' ? (zh ? '示例目录' : 'Sample data')
    : dataSource === null ? (zh ? '同步中' : 'Syncing')
    : (zh ? '已同步' : 'Synced');
  return <div className={`project-directory-sync${syncError || dataSource === 'bundled' ? ' is-unavailable' : ''}`}>
    <span className="ecosystem-reviewed" role="status" title={label}><span className="ecosystem-reviewed-dot"/>{compact ? compactLabel : label}</span>
    <button type="button" className="project-directory-refresh" disabled={refreshing} onClick={onRefresh} aria-label={zh ? '刷新项目目录' : 'Refresh project directory'}>
      <RefreshCw size={13} className={refreshing ? 'is-spinning' : ''}/>{refreshing ? (zh ? '同步中' : 'Syncing') : (zh ? (compact ? '刷新' : '刷新项目') : 'Refresh')}
    </button>
  </div>;
}
