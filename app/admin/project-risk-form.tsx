'use client';
import { useState } from 'react';
import { riskLabels, evidenceLabels, type RiskReview } from '@/lib/project-risk';

export default function ProjectRiskForm({slug, review, onSaved}: {slug: string; review?: RiskReview; onSaved: () => Promise<void>}) {
 const [priority,setPriority]=useState<RiskReview['priority']>(review?.priority ?? 'unassessed');
 const [evidence,setEvidence]=useState<RiskReview['evidenceStatus']>(review?.evidenceStatus ?? 'reported');
 const [en,setEn]=useState(review?.reasonEn ?? ''); const [zh,setZh]=useState(review?.reasonZh ?? '');
 const [sources,setSources]=useState(review?.sources.join('\n') ?? '');
 const [date,setDate]=useState(review?.reviewedOn ?? new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai'}).format(new Date()));
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 async function save(){setBusy(true);setMessage('');try{
  const r=await fetch('/api/admin/project-risk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug,priority,evidenceStatus:evidence,reasonEn:en,reasonZh:zh,reviewedOn:date,sources:sources.split('\n').map(s=>s.trim()).filter(Boolean)})});
  const result=await r.json();if(!r.ok)throw Error(result.error);await onSaved();setMessage('风险复核已保存，旧记录保留。');
 }catch(e){setMessage(e instanceof Error?e.message:'保存失败');}finally{setBusy(false);}}
 return <details className="admin-score-editor"><summary>风险管理 · Risk review</summary><p>独立保存风险分级与证据；每次保存新增历史记录，不改变观察评分。已核验指风险事项，不代表确认 Rug。</p><div className="admin-grid">
 <label>核查优先级<select value={priority} onChange={e=>setPriority(e.target.value as typeof priority)}>{Object.entries(riskLabels).map(([k,v])=><option key={k} value={k}>{v.zh} · {v.en}</option>)}</select></label>
 <label>证据状态<select value={evidence} onChange={e=>setEvidence(e.target.value as typeof evidence)}>{Object.entries(evidenceLabels).map(([k,v])=><option key={k} value={k}>{v.zh}</option>)}</select></label>
 <label>复核日期<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
 <label className="admin-wide">风险原因 · 中文<textarea value={zh} onChange={e=>setZh(e.target.value)} rows={4}/></label>
 <label className="admin-wide">Risk findings · EN<textarea value={en} onChange={e=>setEn(e.target.value)} rows={4}/></label>
 <label className="admin-wide">证据来源 · 每行一个链接<textarea value={sources} onChange={e=>setSources(e.target.value)} rows={3}/></label>
 <button type="button" className="admin-secondary" disabled={busy} onClick={save}>{busy?'保存中…':'保存风险复核'}</button><p role="status">{message}</p>
 </div></details>;
}
