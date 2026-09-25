'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, LogOut, Plus, Save } from 'lucide-react';
import type { EcosystemProject } from '@/lib/project-schema';

type EditableProject = EcosystemProject & { taglineZh: string; isPublished: boolean };

const blankProject = (): EditableProject => ({
  slug: '', name: '', symbol: '', handle: '', tagline: '', taglineZh: '',
  description: { en: '', zh: '' }, categories: ['DeFi'], status: 'upcoming', products: [],
  tvl: null, fees24h: null, volume24h: null, tokenAddress: null, tokenMetrics: null, website: '', x: '',
  sourceUrls: [], verifiedOn: new Date().toISOString().slice(0, 10), recommended: false,
  recommendationReason: null, isPublished: true, updates: [],
});

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [projects, setProjects] = useState<EditableProject[]>([]);
  const [form, setForm] = useState<EditableProject>(blankProject);
  const [categoryText, setCategoryText] = useState('DeFi');
  const [productText, setProductText] = useState('');
  const [sourcesText, setSourcesText] = useState('');
  const [updates, setUpdates] = useState<Array<{ id: string; titleEn: string; titleZh: string; summaryEn: string; summaryZh: string; sourceUrl: string; publishedAt: string | null; isPublished: boolean }>>([]);
  const [updateDraft, setUpdateDraft] = useState({ titleEn: '', titleZh: '', summaryEn: '', summaryZh: '', sourceUrl: '', publishedAt: '' });
  const [loginPassword, setLoginPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadProjects() {
    const response = await fetch('/api/admin/projects', { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to load project records.');
    const items = await response.json() as EditableProject[];
    setProjects(items);
  }

  useEffect(() => {
    let current = true;
    fetch('/api/admin/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then(async ({ authenticated: isAuthenticated }) => {
        if (!current) return;
        setAuthenticated(Boolean(isAuthenticated));
        if (isAuthenticated) await loadProjects();
      })
      .catch(() => { if (current) { setAuthenticated(false); setMessage('Could not connect to the project database.'); } });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (!authenticated || !form.slug) { setUpdates([]); return; }
    fetch(`/api/admin/project-updates?slug=${encodeURIComponent(form.slug)}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : [])
      .then((items) => setUpdates(Array.isArray(items) ? items : []))
      .catch(() => setUpdates([]));
  }, [authenticated, form.slug]);

  function chooseProject(project: EditableProject) {
    setForm(project);
    setCategoryText(project.categories.join(', '));
    setProductText(project.products.map((item) => `${item.en} | ${item.zh}${item.status === 'upcoming' ? ' | upcoming' : ''}`).join('\n'));
    setSourcesText(project.sourceUrls.join('\n'));
    setMessage('');
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: loginPassword }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not sign in.');
      setAuthenticated(true);
      setLoginPassword('');
      await loadProjects();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const products = productText.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const [en = '', zh = '', status] = line.split('|').map((part) => part.trim());
      return { en, zh, ...(status === 'upcoming' ? { status: 'upcoming' as const } : {}) };
    });
    const recommendationReason = form.recommendationReason ?? { en: '', zh: '' };
    const payload = {
      ...form,
      categories: categoryText.split(',').map((item) => item.trim()).filter(Boolean),
      products,
      sourceUrls: sourcesText.split('\n').map((item) => item.trim()).filter(Boolean),
      recommendationReason: recommendationReason.en || recommendationReason.zh ? recommendationReason : null,
    };
    try {
      const response = await fetch('/api/admin/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not save the project.');
      await loadProjects();
      setMessage('Project saved to Neon.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the project.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/admin/session', { method: 'DELETE' });
    setAuthenticated(false);
    setProjects([]);
    setForm(blankProject());
  }

  async function saveUpdate() {
    if (!form.slug) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/project-updates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...updateDraft, slug: form.slug, publishedAt: updateDraft.publishedAt ? new Date(updateDraft.publishedAt).toISOString() : null }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not save the update.');
      const list = await fetch(`/api/admin/project-updates?slug=${encodeURIComponent(form.slug)}`, { cache: 'no-store' });
      setUpdates(await list.json());
      setUpdateDraft({ titleEn: '', titleZh: '', summaryEn: '', summaryZh: '', sourceUrl: '', publishedAt: '' });
      setMessage('Project update saved to Neon.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the update.');
    } finally {
      setBusy(false);
    }
  }

  function update<K extends keyof EditableProject>(key: K, value: EditableProject[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  if (authenticated === null) return <main className="admin-shell"><p className="admin-message">Loading administrator session…</p></main>;

  if (!authenticated) return <main className="admin-shell">
    <a className="admin-back" href="/"><ArrowLeft size={15}/> Back to ARC Watch</a>
    <section className="admin-login-card">
      <div className="admin-eyebrow">ARC WATCH · PROJECT CONTENT</div>
      <h1>Project management</h1>
      <p>Sign in to curate the public ARC ecosystem directory.</p>
      <form onSubmit={login} className="admin-form">
        <label>Administrator password<input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} autoComplete="current-password" required/></label>
        {message && <div className="admin-error">{message}</div>}
        <button className="admin-primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </section>
  </main>;

  return <main className="admin-shell">
    <header className="admin-header"><div><div className="admin-eyebrow">ARC WATCH · CONTENT ADMIN</div><h1>Project management</h1><p>Manage curated project records stored in Neon.</p></div><div className="admin-header-actions"><a className="admin-back" href="/"><ArrowLeft size={15}/> View site</a><button className="admin-secondary" onClick={logout}><LogOut size={14}/> Sign out</button></div></header>
    <div className="admin-workspace">
      <aside className="admin-projects"><button className="admin-new" type="button" onClick={() => { setForm(blankProject()); setCategoryText('DeFi'); setProductText(''); setSourcesText(''); setMessage(''); }}><Plus size={15}/> New project</button>{projects.map((project) => <button type="button" key={project.slug} className={`admin-project-option ${project.slug === form.slug ? 'selected' : ''}`} onClick={() => chooseProject(project)}><b>{project.name}</b><small>{project.slug}{project.isPublished ? ' · Published' : ' · Draft'}</small></button>)}</aside>
      <form onSubmit={save} className="admin-editor">
        <div className="admin-editor-heading"><div><h2>{form.slug ? `Edit ${form.name}` : 'New project'}</h2><p>Fields with both language labels support EN / 中文.</p></div><button className="admin-primary" type="submit" disabled={busy}><Save size={14}/> {busy ? 'Saving…' : 'Save project'}</button></div>
        <div className="admin-grid">
          <label>Project name<input value={form.name} onChange={(event) => update('name', event.target.value)} required/></label>
          <label>URL slug<input value={form.slug} onChange={(event) => update('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="project-name" required/></label>
          <label>Symbol<input value={form.symbol} onChange={(event) => update('symbol', event.target.value)} required/></label>
          <label>X handle<input value={form.handle} onChange={(event) => update('handle', event.target.value)} required/></label>
          <label>Website URL<input type="url" value={form.website} onChange={(event) => update('website', event.target.value)} required/></label>
          <label>X URL<input type="url" value={form.x} onChange={(event) => update('x', event.target.value)} required/></label>
          <label>Token contract<input value={form.tokenAddress ?? ''} onChange={(event) => update('tokenAddress', event.target.value || null)} placeholder="Optional EVM contract"/></label>
          <label>Categories<input value={categoryText} onChange={(event) => setCategoryText(event.target.value)} placeholder="DeFi, Prediction Markets" required/></label>
          <label>Project status<select value={form.status} onChange={(event) => update('status', event.target.value as EditableProject['status'])}><option value="live">Live</option><option value="beta">Beta</option><option value="upcoming">Upcoming</option></select></label>
          <label>Verified on<input type="date" value={form.verifiedOn} onChange={(event) => update('verifiedOn', event.target.value)} required/></label>
          <label className="admin-wide">Tagline · EN<input value={form.tagline} onChange={(event) => update('tagline', event.target.value)} required/></label>
          <label className="admin-wide">Tagline · 中文<input value={form.taglineZh} onChange={(event) => update('taglineZh', event.target.value)}/></label>
          <label className="admin-wide">Description · EN<textarea rows={3} value={form.description.en} onChange={(event) => update('description', { ...form.description, en: event.target.value })} required/></label>
          <label className="admin-wide">Description · 中文<textarea rows={3} value={form.description.zh} onChange={(event) => update('description', { ...form.description, zh: event.target.value })} required/></label>
          <label className="admin-wide">Products · one per line: English | 中文 | upcoming (optional)<textarea rows={4} value={productText} onChange={(event) => setProductText(event.target.value)} placeholder={'Swap | 兑换\nKAIRO Pools | KAIRO 池 | upcoming'}/></label>
          <label className="admin-wide">Sources · one URL per line<textarea rows={3} value={sourcesText} onChange={(event) => setSourcesText(event.target.value)} placeholder="Official website, docs, verified social account"/></label>
          <label className="admin-check"><input type="checkbox" checked={form.recommended} onChange={(event) => update('recommended', event.target.checked)}/> Feature as recommended</label>
          <label className="admin-check"><input type="checkbox" checked={form.isPublished} onChange={(event) => update('isPublished', event.target.checked)}/> Publish in directory</label>
          <label className="admin-wide">Recommendation reason · EN<textarea rows={2} value={form.recommendationReason?.en ?? ''} onChange={(event) => update('recommendationReason', { en: event.target.value, zh: form.recommendationReason?.zh ?? '' })}/></label>
          <label className="admin-wide">推荐理由 · 中文<textarea rows={2} value={form.recommendationReason?.zh ?? ''} onChange={(event) => update('recommendationReason', { en: form.recommendationReason?.en ?? '', zh: event.target.value })}/></label>
        </div>
        {message && <div className={message.includes('saved') ? 'admin-success' : 'admin-error'}>{message}</div>}
        <section className="admin-updates">
          <div className="admin-editor-heading"><div><h2>Project updates</h2><p>Updates are linked to a source and shown on the public project profile.</p></div></div>
          {updates.map((item) => <div className="admin-update-row" key={item.id}><div><b>{item.titleEn}</b><small>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'Date not set'} · {item.isPublished ? 'Published' : 'Draft'}</small></div><a href={item.sourceUrl} target="_blank" rel="noreferrer">Source ↗</a></div>)}
          {form.slug && <div className="admin-grid admin-update-form">
            <label>Update title · EN<input value={updateDraft.titleEn} onChange={(event) => setUpdateDraft({ ...updateDraft, titleEn: event.target.value })}/></label>
            <label>动态标题 · 中文<input value={updateDraft.titleZh} onChange={(event) => setUpdateDraft({ ...updateDraft, titleZh: event.target.value })}/></label>
            <label className="admin-wide">Summary · EN<textarea rows={2} value={updateDraft.summaryEn} onChange={(event) => setUpdateDraft({ ...updateDraft, summaryEn: event.target.value })}/></label>
            <label className="admin-wide">动态摘要 · 中文<textarea rows={2} value={updateDraft.summaryZh} onChange={(event) => setUpdateDraft({ ...updateDraft, summaryZh: event.target.value })}/></label>
            <label>Source URL<input type="url" value={updateDraft.sourceUrl} onChange={(event) => setUpdateDraft({ ...updateDraft, sourceUrl: event.target.value })}/></label>
            <label>Published at<input type="datetime-local" value={updateDraft.publishedAt} onChange={(event) => setUpdateDraft({ ...updateDraft, publishedAt: event.target.value })}/></label>
            <button className="admin-secondary" type="button" disabled={busy || !updateDraft.titleEn || !updateDraft.summaryEn || !updateDraft.sourceUrl} onClick={saveUpdate}><Plus size={14}/> Save update</button>
          </div>}
        </section>
      </form>
    </div>
  </main>;
}
