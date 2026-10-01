'use client';

import { useEffect, useState } from 'react';
import { Search, ShieldAlert } from 'lucide-react';
import type { RugProject } from '@/lib/rug-projects';
import { getProjectScore } from '@/lib/project-scoring';

export default function RugPage({ language }: { language: 'en' | 'zh' }) {
  const zh = language === 'zh';
  const t = (en: string, cn: string) => zh ? cn : en;
  const [projects, setProjects] = useState<RugProject[]>([]);
  const [query, setQuery] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    fetch('/api/rug-projects', { cache: 'no-store', signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error('Unavailable'); return r.json(); })
      .then((items: RugProject[]) => { if (!controller.signal.aborted) { setProjects(items); setState('ready'); } })
      .catch(() => { if (!controller.signal.aborted) setState('error'); });
    return () => controller.abort();
  }, [attempt]);
  const term = query.trim().toLowerCase();
  const visible = projects.filter(p => `${p.name} ${p.symbol} ${p.handle} ${p.tokenAddress}`.toLowerCase().includes(term));
  return <div className="content ecosystem-content rug-content">
    <div className="page-heading ecosystem-heading"><div>
      <div className="eyebrow"><ShieldAlert size={16}/> {t('ARC RISK ARCHIVE', 'ARC 风险档案')}</div>
      <h1>{t('Rug', 'Rug')} <span>{t('Archive', '项目档案')}</span></h1>
      <p className="subtitle">{t('A record of reported exits and rug incidents, with project identity and evidence kept for reference.', '记录被标记跑路或 Rug 的项目，保留项目身份、风险记录与证据供追溯。')}</p>
    </div></div>
    <aside className="rug-notice"><ShieldAlert size={20}/><p>{t('Removed from the active ecosystem directory. Each record distinguishes a submitted report from independently verified evidence. Historical scores are not current recommendations.', '这些项目已移出正常生态目录。每条档案区分用户报告与独立核验证据，历史评分不再作为当前推荐依据。')}</p></aside>
    <section className="ecosystem-toolbar"><label className="ecosystem-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Search name, account or contract', '搜索项目名、账号或合约')} aria-label={t('Search Rug archive', '搜索 Rug 档案')}/></label><b>{state === 'ready' ? `${visible.length} ${t('records', '条记录')}` : '—'}</b></section>
    {state === 'loading' && <p role="status">{t('Loading archive…', '正在读取档案…')}</p>}
    {state === 'error' && <div role="alert"><p>{t('Could not load the archive. Please retry.', '档案暂时无法读取，请重试。')}</p><button onClick={() => setAttempt(v => v + 1)}>{t('Retry', '重试')}</button></div>}
    {state === 'ready' && !visible.length && <p>{t('No matching records.', '暂无匹配记录。')}</p>}
    {state === 'ready' && visible.map(p => <article className="rug-card" key={p.slug} id={p.slug}>
      <header><div><h2>{p.name} <small>{p.symbol}</small></h2><span>{p.handle}</span></div><strong className="rug-badge">{t('RUG · ARCHIVED', 'RUG · 已归档')}</strong></header>
      <dl className="rug-facts">
        <div><dt>{t('Recorded', '标记日期')}</dt><dd>{p.reportedOn}</dd></div>
        <div><dt>{t('Incident date', '事件日期')}</dt><dd>{p.incidentOn ?? t('Not established', '尚未核实')}</dd></div>
        <div><dt>{t('Evidence status', '证据状态')}</dt><dd>{p.classification === 'verified' ? t('Independently verified', '已独立核验') : t('User report · verification pending', '用户报告 · 待独立核验')}</dd></div>
        <div><dt>{t('Contract · Arc', '合约 · Arc')}</dt><dd className="rug-contract">{p.tokenAddress ?? '—'}</dd></div>
      </dl>
      <h3>{t('Incident record', '事件记录')}</h3><p>{zh ? p.reasonZh : p.reasonEn}</p>
      <h3>{t('Evidence', '证据资料')}</h3>
      {p.evidence.length ? <ul>{p.evidence.map(e => <li key={e.url}><a href={e.url} target="_blank" rel="noreferrer">{e.label}</a></li>)}</ul> : <p>{t('No transaction hashes, loss amounts or independent investigation have been provided. Website access failures alone are not proof of a rug.', '暂未补充交易哈希、损失金额或独立调查材料。仅凭网站无法访问不能证明 Rug。')}</p>}
      <details><summary>{t('Historical project information', '历史项目资料')}</summary>
        <p className="rug-history-note">{t('Snapshot before archiving. Product and risk statements below describe the earlier review, not the current operating status.', '以下为归档前快照；产品与风险描述属于此前复核，不代表当前运营状态。')}</p>
        <p>{zh ? p.descriptionZh : p.descriptionEn}</p>
        <p>{t('Last observation score before archiving', '归档前最后观察分')}：{getProjectScore(p.historicalScorecard).total ?? '—'}/100 · {t('Historical only', '仅供历史追溯')}</p>
        <p className="rug-contract">{t('Former website', '原官网')}：{p.website}<br/>{t('Original X profile', '原 X 账号')}：{p.x}</p>
      </details>
    </article>)}
  </div>;
}
