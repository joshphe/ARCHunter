import type { ProjectScorecard } from '@/lib/project-schema';
import { scoreDimensions } from '@/lib/project-scoring';

type Props = { scorecard: ProjectScorecard | null; language: 'en' | 'zh' };
const CENTER = 160;
const RADIUS = 89;
const angles = scoreDimensions.map((_, index) => (-90 + index * 72) * Math.PI / 180);
const point = (radius: number, angle: number) => `${(CENTER + Math.cos(angle) * radius).toFixed(1)},${(CENTER + Math.sin(angle) * radius).toFixed(1)}`;

export default function ProjectScoreRadar({ scorecard, language }: Props) {
  const zh = language === 'zh';
  const scored = scoreDimensions.map((item) => scorecard?.[item.key]?.score ?? 0);
  const hasScore = scored.some((score) => score > 0);
  const scorePath = scored.map((score, index) => point((score / 5) * RADIUS, angles[index])).join(' ');

  return <svg className="project-score-radar" viewBox="0 0 320 320" role="img" aria-label={zh ? '五项评分雷达图' : 'Five-dimension project score radar chart'}>
    {[1, 2, 3, 4, 5].map((level) => <polygon key={level} points={angles.map((angle) => point((level / 5) * RADIUS, angle)).join(' ')} className={level === 5 ? 'score-radar-outline' : 'score-radar-grid'} />)}
    {angles.map((angle, index) => <line key={index} x1={CENTER} y1={CENTER} x2={CENTER + Math.cos(angle) * RADIUS} y2={CENTER + Math.sin(angle) * RADIUS} className="score-radar-axis"/>)}
    {hasScore ? <>
      <polygon points={scorePath} className="score-radar-area"/>
      {scored.map((score, index) => score > 0 ? <circle key={index} cx={CENTER + Math.cos(angles[index]) * (score / 5) * RADIUS} cy={CENTER + Math.sin(angles[index]) * (score / 5) * RADIUS} r="3.5" className="score-radar-point"/> : null)}
    </> : null}
    {scoreDimensions.map((dimension, index) => {
      const labelPoint = point(124, angles[index]).split(',').map(Number);
      const anchor = labelPoint[0] < CENTER - 10 ? 'end' : labelPoint[0] > CENTER + 10 ? 'start' : 'middle';
      return <text key={dimension.key} x={labelPoint[0]} y={labelPoint[1] + 3} textAnchor={anchor} className="score-radar-label">{zh ? dimension.shortZh : dimension.shortEn}</text>;
    })}
    {!hasScore ? <text x={CENTER} y={CENTER + 4} textAnchor="middle" className="score-radar-empty">{zh ? '待评分' : 'NOT RATED'}</text> : null}
  </svg>;
}
