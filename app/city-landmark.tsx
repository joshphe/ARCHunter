import { memo, useId } from 'react';
import type { CityLandmarkKind } from '@/lib/ecosystem-map-layout';

type Props = { kind: CityLandmarkKind; side: number; language: 'en' | 'zh' };
const names={stadium:['ARC Stadium','ARC 体育馆'],playland:['ARC Playland','ARC 游乐园'],museum:['ARC Pavilion','ARC 展馆'],monument:['ARC Square','ARC 雕塑广场'],garden:['ARC Conservatory','ARC 植物园']} as const;
const p=(u:number,v:number,z=0)=>`${u-v},${(u+v)/2-z}`;
const plane=(s:number,z=0,u=0,v=0)=>[p(u-s/2,v-s/2,z),p(u+s/2,v-s/2,z),p(u+s/2,v+s/2,z),p(u-s/2,v+s/2,z)].join(' ');

function Landscape() {
  return <g>
    {[-1,1].map(k=><g key={k} transform={`translate(${k*75} 0)`}>
      <ellipse cy="4" rx="8" ry="3" fill="#355e5e" opacity=".18"/>
      <path d="M0 2V-10" stroke="#738c76" strokeWidth="2"/>
      <ellipse cy="-13" rx="8" ry="11" fill="#688f6b"/>
      <ellipse cx="-2" cy="-16" rx="4" ry="7" fill="#a3c88c"/>
    </g>)}
    {[[-44,23],[44,23]].map(([x,y])=><g key={x} transform={`translate(${x} ${y})`}>
      <path d="M-8 0L7 7M-6 2L6 8" stroke="#927d68" strokeWidth="2.5"/>
      <path d="M-6 2v4M5 8v4" stroke="#657b7c" strokeWidth="1.2"/>
    </g>)}
    {[-22,22].map(x=><g key={x} transform={`translate(${x} 36)`}><path d="M0 0V-8" stroke="#739393" strokeWidth="1.2"/><circle cy="-8" r="1.6" className="city-landmark-light"/></g>)}
  </g>;
}

function Pavilion({id}:{id:string}) {
  return <g>
    <polygon className="city-landmark-shadow" points="-47,14 25,48 73,7 14,-30"/>
    <polygon points={[p(-29,29),p(29,29),p(29,29,17),p(-29,29,17)].join(' ')} fill={`url(#${id}-wall)`}/>
    <polygon points={[p(29,-29),p(29,29),p(29,29,17),p(29,-29,17)].join(' ')} fill="#5c7d86"/>
    <polygon points={plane(62,17)} fill="#c8d7cf" stroke="#edf2dc" strokeWidth="1.2"/>
    {[-23,-12,-1,10,21].map(u=><g key={u}><path d={`M${p(u,29,3)}L${p(u,29,14)}`} stroke="#345368" strokeWidth="5"/><path d={`M${p(29,u,3)}L${p(29,u,14)}`} stroke="#2d4b5d" strokeWidth="5"/></g>)}
    <path d="M-47-19L-34-43L0-66L36-42L47-19L0 4Z" fill={`url(#${id}-glass)`} stroke="#d4e5df" strokeWidth="1.3"/>
    <path d="M0-66L0 4M-34-43L0 4L36-42M-47-19L36-42M47-19L-34-43M-20-53L-24-6M20-53L24-6" fill="none" stroke="#c9dbd9" strokeWidth="1"/>
    <path d="M-34-43L0-66L-8-15L-24-6Z" fill="#eaf8ef" opacity=".25"/>
    <polygon points={plane(11,19,12,24)} fill="#e3e6ce" stroke="#abc6bb"/>
    {[0,1,2].map(i=><path key={i} d={`M${p(-9,29+i*3,2-i)}L${p(12,29+i*3,2-i)}`} stroke="#f2edda" strokeWidth="2"/>)}
    <text x="0" y="-18" fill="#e6f0da" fontSize="9" fontWeight="800" textAnchor="middle" letterSpacing="3">ARC</text>
  </g>;
}

function Monument({id}:{id:string}) {
  return <g>
    <ellipse cy="8" rx="46" ry="22" fill="#709a99" stroke="#ecedde" strokeWidth="3"/>
    <ellipse cy="7" rx="35" ry="16" fill="#65aab1" stroke="#a7ccd0"/>
    <path d="M-29 7Q0 19 29 7" fill="none" stroke="#c1e5dd" strokeWidth="1.5"/>
    <polygon points={plane(28,4)} fill="#466573"/>
    <polygon points={plane(24,10)} fill="#d5dfd4" stroke="#eff2d8"/>
    <path d="M-28-6L0-72L27-6H11L0-37L-13-6Z" fill={`url(#${id}-metal)`} stroke="#ddedcd" strokeWidth="1"/>
    <path d="M0-72L6-66L33 0L27-6L11-6L17 0H33L6-66Z" fill="#507b78"/>
    <path d="M-6-18H9L13-9H-10Z" fill="#aedb80" stroke="#d4edb8"/>
    <path d="M-24-9L0-65" fill="none" stroke="#eff8d5" strokeWidth="1" opacity=".65"/>
    {[-1,1].map(k=><g key={k}><path d={`M${k*34} 5q${-k*3}-25 ${-k*8}-16`} fill="none" stroke="#c9eee7" strokeWidth="1.5"/><ellipse cx={k*34} cy="6" rx="5" ry="2" fill="#a8d4cb"/></g>)}
  </g>;
}

function Conservatory({id}:{id:string}) {
  return <g>
    <ellipse className="city-landmark-shadow" cx="5" cy="8" rx="59" ry="23"/>
    <path d="M-52 4V-10Q-50-55 0-58Q50-55 52-10V4Q0 32-52 4Z" fill={`url(#${id}-glass)`} stroke="#d5e3d6" strokeWidth="1.5"/>
    <path d="M-45 5L-32-10L0-37L30-8L43 5Q0 24-45 5Z" fill="#75a589" opacity=".55"/>
    {[-25,0,25].map(x=><g key={x}><path d={`M${x} 8v-24`} stroke="#456f67" strokeWidth="1.5"/><path d={`M${x}-8q-12-19-15-8M${x}-13q10-20 15-13M${x}-6q12-13 17-2`} fill="none" stroke="#bad69b" strokeWidth="4" strokeLinecap="round"/></g>)}
    <path d="M0-58V21M-30-46Q-41-13-28 15M30-46Q41-13 28 15M-47-28Q0-5 47-28M-52-8Q0 19 52-8" fill="none" stroke="#d9e5d9" strokeWidth="1.4"/>
    <path d="M-42-32Q-32-51-14-52L-21-14L-36-18Z" fill="#f4fff7" opacity=".2"/>
    <path d="M-10 21V7Q0 0 10 7V21" fill="#3a6570" stroke="#c8ddd2" strokeWidth="1.5"/>
    <path d="M0 5V22" stroke="#c0d7cb"/>
    <path d="M-12 23H12M-16 27H16" stroke="#eee9d6" strokeWidth="2"/>
  </g>;
}
const cabins=Array.from({length:10},(_,i)=>{
  const angle=(i*36-90)*Math.PI/180;
  return {x:33+Math.cos(angle)*34,y:-65+Math.sin(angle)*39};
});

function Stadium({id}:{id:string}) {
  return <g>
    <ellipse className="city-landmark-shadow" cx="6" cy="10" rx="80" ry="33"/>
    <path d="M-77-15A77 36 0 0 0 77-15V7A77 36 0 0 1-77 7Z" fill={`url(#${id}-wall)`}/>
    {Array.from({length:19},(_,i)=>{
      const angle=(i+1)*Math.PI/20,x=-77*Math.cos(angle),y=-15+36*Math.sin(angle);
      return <path key={i} d={`M${x.toFixed(1)} ${y.toFixed(1)}v22`} className="city-stadium-rib"/>;
    })}
    <ellipse cy="-15" rx="78" ry="37" fill="#e5ede8" stroke="#f7fff4" strokeWidth="2"/>
    <ellipse cy="-15" rx="73" ry="33" fill="none" stroke="#bacfca" strokeWidth="1"/>
    <ellipse cy="-15" rx="65" ry="28" fill="#517a83"/>
    <ellipse cy="-14" rx="60" ry="25" fill="#82ab9d" stroke="#afccaf" strokeWidth="3"/>
    <ellipse cy="-13" rx="52" ry="20" fill="#58876d" stroke="#d5e2be" strokeWidth="2"/>
    {Array.from({length:28},(_,i)=>{
      const a=i*Math.PI/14;
      return <path key={i} d={`M${(53*Math.cos(a)).toFixed(1)} ${(-14+22*Math.sin(a)).toFixed(1)}L${(63*Math.cos(a)).toFixed(1)} ${(-14+27*Math.sin(a)).toFixed(1)}`} stroke="#d8e3c3" strokeWidth=".7"/>;
    })}
    <g transform="translate(0 -13) matrix(1 .35 -1 .35 0 0)">
      <rect x="-31" y="-21" width="62" height="42" rx="2" fill="#69a667"/>
      {[-26,-14,-2,10,22].map(x=><rect key={x} x={x} y="-20" width="6" height="40" fill="#91be76" opacity=".6"/>)}
      <rect x="-30" y="-20" width="60" height="40" fill="none" stroke="#f0f4d7" strokeWidth="1"/>
      <path d="M0-20V20M-30-12H-20V12H-30M30-12H20V12H30" fill="none" stroke="#f0f4d7"/>
      <circle r="7" fill="none" stroke="#f0f4d7"/>
    </g>
    <path d="M-72-28Q0-68 72-28M-73-21Q0-53 73-21" fill="none" stroke="#cad9d3" strokeWidth="3"/>
    <path d="M-75-3Q0 33 75-3" className="city-landmark-accent"/>
    <path d="M-12 39V27H12V39" fill="#264c61" stroke="#c6d8d0" strokeWidth="1.5"/>
    <path d="M-19 38H19M-23 41H23" stroke="#efe9d7" strokeWidth="2"/>
    <text x="0" y="19" className="city-stadium-wordmark" textAnchor="middle">ARC</text>
    {[-57,57].map(x=><g key={x} transform={`translate(${x} -36)`}>
      <path d="M0 0V-32" stroke="#aec7c7" strokeWidth="2"/>
      <rect x="-9" y="-33" width="18" height="5" rx="1" className="city-landmark-light"/>
    </g>)}
  </g>;
}

function Playland() {
  return <g>
    <path d="M-75 12Q-15-25 71 9M-35 29Q6 4 57 26" className="city-landmark-walk"/>
    <ellipse className="city-landmark-shadow" cx="34" cy="3" rx="40" ry="15"/>
    <path d="M8 5L33-65L57 5M16 5H51" fill="none" stroke="#b1d0cc" strokeWidth="4"/>
    <ellipse cx="33" cy="-65" rx="37" ry="42" fill="#43677818" stroke="#698f9a" strokeWidth="5"/>
    <ellipse cx="37" cy="-66" rx="37" ry="42" fill="none" stroke="#567580" strokeWidth="1.5"/>
    <ellipse cx="33" cy="-65" rx="34" ry="39" fill="none" className="city-landmark-accent"/>
    {cabins.map(({x,y},i)=><g key={i}>
      <path d={`M33-65L${x.toFixed(1)} ${y.toFixed(1)}`} stroke="#b8d4d0" strokeWidth="1.2"/>
      <path d={`M${x.toFixed(1)} ${y.toFixed(1)}v5`} stroke="#cbe0d0"/>
      <rect x={x-5} y={y+3} width="10" height="8" rx="2" fill={i%2?'#e9b891':'#a8d981'} stroke="#f1f1d8" strokeWidth=".8"/>
      <path d={`M${x-3} ${y+5}h6`} stroke="#496779" strokeWidth="2.5"/>
      <path d={`M${x-2} ${y+8}h4`} stroke="#f5edcf" strokeWidth=".7"/>
    </g>)}
    <circle cx="33" cy="-65" r="5" fill="#b0e378" stroke="#eef4d0" strokeWidth="2"/>
    <g transform="translate(-43 4)">
      <ellipse cy="8" rx="27" ry="13" fill="#597e84"/>
      <ellipse cy="4" rx="26" ry="12" fill="#ead3b1" stroke="#e9ecda" strokeWidth="2"/>
      {[-17,-8,8,17].map((x,i)=><g key={x}><path d={`M${x} 3v-20`} stroke="#e7e5c9" strokeWidth="1.5"/><path d={`M${x-3} -3q3-5 6 0l-1 4h-5Z`} fill={i%2?'#8baf9d':'#e7a88b'}/></g>)}
      <path d="M-29-17Q0-27 29-17L0-40Z" fill="#dfb399" stroke="#eee7ce"/>
      <path d="M0-40L-10-21L0-23L10-21Z" fill="#ecedc9"/>
      <path d="M0-40V-50L14-47L0-44" className="city-landmark-flag"/>
      <path d="M-29-17Q0-8 29-17" fill="none" stroke="#e7d6b8" strokeWidth="3"/>
    </g>
    <g transform="translate(-6 27)"><path d="M-8 4V-11H8V4" fill="#d9ddd0"/><path d="M-12-11L0-22L12-11Z" fill="#638c96"/><rect x="-3" y="-7" width="6" height="10" fill="#315269"/></g>
    <path d="M-75 18L-60 26M-52 30L-36 38M58 17L73 10" stroke="#91a898" strokeWidth="3" strokeDasharray="1 3"/>
  </g>;
}

function CityLandmark({kind,side,language}:Props) {
  const id=useId().replace(/:/g,'');
  const zh=language==='zh',name=names[kind][zh?1:0];
  const description=zh?'城市装饰地标，不代表生态项目或真实设施。':'Decorative city landmark; not an ecosystem project or a real-world facility.';
  return <g className={`city-landmark city-landmark-${kind}`} transform={`scale(${side/100})`} role="img" aria-label={`${name} · ${description}`}>
    <defs>
      <linearGradient id={`${id}-wall`}><stop stopColor="#cedbd7"/><stop offset=".4" stopColor="#8caaa9"/><stop offset="1" stopColor="#3b6272"/></linearGradient>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b6d9d8"/><stop offset=".35" stopColor="#6fadb3"/><stop offset="1" stopColor="#325c72"/></linearGradient>
      <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2=".5"><stop stopColor="#e4f1c3"/><stop offset=".35" stopColor="#b4d77f"/><stop offset=".7" stopColor="#83b6a0"/><stop offset="1" stopColor="#547f86"/></linearGradient>
    </defs>
    <polygon className="city-landmark-foundation" points="-100,0 0,50 100,0 100,6 0,56 -100,6"/>
    <polygon className="city-landmark-ground" points="0,-50 100,0 0,50 -100,0"/>
    <polygon className="city-landmark-paving" points="0,-44 88,0 0,44 -88,0"/>
    <path className="city-landmark-paving-lines" d="M-66-11L44 33M-44-22L66 22M-22-33L77 16M66-11L-44 33M44-22L-66 22M22-33L-77 16"/>
    <Landscape/>
    {kind==='stadium'?<Stadium id={id}/>:kind==='playland'?<Playland/>:kind==='museum'?<Pavilion id={id}/>:kind==='monument'?<Monument id={id}/>:<Conservatory id={id}/>}
  </g>;
}

export default memo(CityLandmark);
