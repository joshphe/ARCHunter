'use client';
import { riskLabels, evidenceLabels, riskDescriptions, evidenceDescriptions, type RiskReview } from '@/lib/project-risk';

export default function ProjectRiskPanel({reviews=[],language}: {reviews?: RiskReview[]; language:'en'|'zh'}) {
 const zh=language==='zh';const current=reviews[0];
 return <section className="project-detail-panel project-risk-panel" id="risk">
  <h2>{zh?'当前风险':'Current risk review'}</h2>
  {current ? <><div className="risk-review-meta"><span title={riskDescriptions[current.priority][language]} className={`ecosystem-risk-badge risk-${current.priority}`}>{riskLabels[current.priority][language]}</span><span title={evidenceDescriptions[current.evidenceStatus][language]}>{evidenceLabels[current.evidenceStatus][language]}</span><time>{current.reviewedOn}</time></div>
  <p>{zh?current.reasonZh:current.reasonEn}</p><ul>{current.sources.map((url,i)=><li key={url}><a href={url} target="_blank" rel="noreferrer">{zh?'证据来源':'Source'} {i+1} · {new URL(url).hostname}</a></li>)}</ul>
  <p className="risk-review-note">{zh?'分级表示核查优先级，不是跑路概率；已核验指具体风险事项，不代表已确认 Rug。':'Priority is not a probability of fraud. Verified findings do not mean a confirmed rug.'}</p>
  {reviews.length>1 && <details><summary>{zh?'历史风险复核':'Previous risk reviews'} · {reviews.length-1}</summary>{reviews.slice(1).map(r=><article key={r.id}><h3 title={riskDescriptions[r.priority][language]}>{r.reviewedOn} · {riskLabels[r.priority][language]}</h3><small title={evidenceDescriptions[r.evidenceStatus][language]}>{evidenceLabels[r.evidenceStatus][language]}</small><p>{zh?r.reasonZh:r.reasonEn}</p><ul>{r.sources.map((url,i)=><li key={url}><a href={url} target="_blank" rel="noreferrer">{zh?'证据来源':'Source'} {i+1}</a></li>)}</ul></article>)}</details>}</>
  : <p>{zh?'尚无独立风险复核记录，待核查。':'No separate risk review is available yet.'}</p>}
 </section>;
}
