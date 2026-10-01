'use client';
import { useState } from 'react';

export default function RugArchiveForm({ slug, onArchived }: { slug: string; onArchived: () => Promise<void> }) {
  const [reasonZh, setReasonZh] = useState('');
  const [reasonEn, setReasonEn] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function archive() {
    setBusy(true); setMessage('');
    try {
      const r = await fetch('/api/admin/rug-projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, reasonEn, reasonZh }) });
      if (!r.ok) throw new Error((await r.json()).error ?? '归档失败');
      setMessage('已移入 Rug 档案，历史资料已保留。');
      await onArchived();
    } catch (e) { setMessage(e instanceof Error ? e.message : '归档失败'); }
    finally { setBusy(false); }
  }
  return <details className="rug-card"><summary>移入 Rug 档案 / Archive reported Rug</summary>
    <p>将 {slug} 移出正常列表与推荐，保留完整快照。新记录标为“用户报告 · 待独立核验”。重复归档不会覆盖原始快照。</p>
    <label>事件说明（中文）<textarea value={reasonZh} onChange={e=>setReasonZh(e.target.value)} maxLength={5000}/></label>
    <label>Incident description (English)<textarea value={reasonEn} onChange={e=>setReasonEn(e.target.value)} maxLength={5000}/></label>
    <button type="button" disabled={busy || !reasonZh.trim() || !reasonEn.trim()} onClick={() => void archive()}>{busy ? '正在归档…' : '移出列表并归档'}</button>
    <p role="status">{message}</p>
  </details>;
}
