import { memo, useId } from 'react';
import type { CSSProperties } from 'react';
import { BUILDING_TIERS } from '@/lib/ecosystem-map-layout';

const point = (u: number, v: number, z = 0) => `${u - v},${(u + v) / 2 - z}`;
const square = (u: number, v: number, side: number, z = 0) => [point(u-side/2,v-side/2,z),point(u+side/2,v-side/2,z),point(u+side/2,v+side/2,z),point(u-side/2,v+side/2,z)].join(' ');

function Volume({ side, height, base = 0, u = 0, v = 0, glass = true, seed = 0 }: { side: number; height: number; base?: number; u?: number; v?: number; glass?: boolean; seed?: number }) {
  const a=u-side/2,b=v-side/2,c=u+side/2,d=v+side/2,roof=base+height;
  const count=Math.max(2,Math.floor(side/7)),pane=(side-6)/count;
  const floors=Array.from({length:Math.max(0,Math.floor((height-3)/8))},(_,i)=>base+3+i*8);
  return <g>
    <polygon className="city-face-left" points={[point(a,d,base),point(c,d,base),point(c,d,roof),point(a,d,roof)].join(' ')}/>
    <polygon className="city-face-right" points={[point(c,b,base),point(c,d,base),point(c,d,roof),point(c,b,roof)].join(' ')}/>
    {glass?<g>
      <polygon className="city-glass-left" points={[point(a+2,d,base+2),point(c-2,d,base+2),point(c-2,d,roof-2),point(a+2,d,roof-2)].join(' ')}/>
      <polygon className="city-glass-right" points={[point(c,b+2,base+2),point(c,d-2,base+2),point(c,d-2,roof-2),point(c,b+2,roof-2)].join(' ')}/>
      {floors.map((z,floor)=><g key={z}>
        {Array.from({length:count},(_,i)=>{
          const offset=3+i*pane,end=offset+pane-1.8,top=Math.min(roof-2,z+5);
          return (i*7+floor*11+seed)%5<2?<g key={i} className="city-lit-window">
            <polygon points={[point(a+offset,d,z),point(a+end,d,z),point(a+end,d,top),point(a+offset,d,top)].join(' ')}/>
            {(i+floor+seed)%3===0?<polygon points={[point(c,b+offset,z),point(c,b+end,z),point(c,b+end,top),point(c,b+offset,top)].join(' ')}/>:null}
          </g>:null;
        })}
        <path className="city-floor-line" d={`M${point(a,d,z)} L${point(c,d,z)} L${point(c,b,z)}`}/>
      </g>)}
      {Array.from({length:count-1},(_,i)=><path key={i} className="city-mullion" d={`M${point(a+3+(i+1)*pane,d,base+2)} L${point(a+3+(i+1)*pane,d,roof-2)} M${point(c,b+3+(i+1)*pane,base+2)} L${point(c,b+3+(i+1)*pane,roof-2)}`}/>)}
      <path className="city-facade-glint" d={`M${point(a+side*.22,d,base+3)} L${point(a+side*.53,d,roof-3)}`}/>
    </g>:height>9?<g className="city-solid-facade">
      {floors.map(z=><g key={z}>{Array.from({length:count},(_,i)=>{
        const offset=3+i*pane,end=offset+pane-2,top=Math.min(roof-2,z+4);
        return <g key={i}><polygon className="city-recessed-window" points={[point(a+offset,d,z),point(a+end,d,z),point(a+end,d,top),point(a+offset,d,top)].join(' ')}/><polygon className="city-recessed-window" points={[point(c,b+offset,z),point(c,b+end,z),point(c,b+end,top),point(c,b+offset,top)].join(' ')}/></g>;
      })}</g>)}
    </g>:null}
    <polygon className="city-roof" points={square(u,v,side,roof)}/>
    <polygon className="city-roof-inset" points={square(u,v,side-5,roof+.2)}/>
    <path className="city-roof-rim" d={`M${point(a,d,roof)} L${point(c,d,roof)} L${point(c,b,roof)}`}/>
    <path className="city-corner" d={`M${point(c,d,base)} L${point(c,d,roof)}`}/>
    {side>=17?<g className="city-roof-services"><polygon className="city-service-shadow" points={square(u-side*.18+2,v-side*.2+3,side*.2,roof+.3)}/><polygon className="city-service-unit" points={square(u-side*.18,v-side*.2,side*.2,roof+1.2)}/><path className="city-service-grille" d={`M${point(u-side*.25,v-side*.2,roof+1.3)} L${point(u-side*.1,v-side*.2,roof+1.3)}`}/></g>:null}
  </g>;
}

function Garden({ side, z, u = 0, v = 0 }: { side: number; z: number; u?: number; v?: number }) {
  return <g>
    <polygon className="city-roof-garden" points={square(u-side*.15,v+side*.22,side*.34,z+.7)}/>
    {[-.25,-.08,.09].map(offset=><path key={offset} className="city-roof-planter" d={`M${point(u+side*offset,v+side*.22,z+3)} v-2`}/>)}
    <polygon className="city-solar" points={square(u-side*.17,v-side*.2,side*.29,z+1)}/>
    <path className="city-solar-lines" d={`M${point(u-side*.17,v-side*.34,z+1)} L${point(u-side*.17,v-side*.06,z+1)}`}/>
  </g>;
}

function PlotTree({u,v,round=false}: {u:number;v:number;round?:boolean}) {
  return <g transform={`translate(${point(u,v,1)})`}>
    <ellipse className="city-parcel-tree-shadow" cx="2" cy="1" rx="5" ry="2.5"/>
    <path className="city-parcel-tree-trunk" d="M0 0V-8"/>
    {round?<><ellipse className="city-parcel-tree" cy="-9" rx="5" ry="6"/><ellipse className="city-parcel-tree-highlight" cx="-1.6" cy="-10.5" rx="2.4" ry="3.5"/></>:<><path className="city-parcel-tree" d="M0-18L5-6L0-3L-5-6Z"/><path className="city-parcel-tree-highlight" d="M0-18V-3L-5-6Z"/></>}
  </g>;
}

function Parcel({ variant }: { variant: number }) {
  return <g className="city-parcel">
    <polygon className="city-parcel-foundation" points={[point(-32,32,-3),point(32,32,-3),point(32,-32,-3),point(32,-32),point(32,32),point(-32,32)].join(' ')}/>
    <polygon className="city-parcel-lawn" points={square(0,0,64)}/>
    <polygon className="city-parcel-boundary" points={square(0,0,61,1)}/>
    <polygon className="city-parcel-forecourt" points={square(2,5,45,.5)}/>
    <g className="city-forecourt-seams">{[-12,-4,4,12].map(offset=><path key={offset} d={`M${point(offset,24,.7)}L${point(offset,30,.7)} M${point(24,offset,.7)}L${point(30,offset,.7)}`}/>)}</g>
    <path className="city-parcel-path" d={`M${point(13,18,.8)} L${point(13,32,.8)} M${point(18,13,.8)} L${point(32,13,.8)}`}/>
    <polygon className="city-parcel-hedge" points={square(-24,-22,10,1)}/>
    <PlotTree u={-25} v={-23} round={variant===1}/>
    <PlotTree u={25} v={-24}/>
    <PlotTree u={-26} v={18} round/>
    <path className="city-parcel-bench" d={`M${point(-17,25,2)} L${point(-6,25,2)}`}/>
    <path className="city-parcel-bench-legs" d={`M${point(-15,25,2)}L${point(-15,25)} M${point(-8,25,2)}L${point(-8,25)}`}/>
    {[-17,-11,-5].map(u=><g key={u} transform={`translate(${point(u,-27,1)})`}><ellipse className="city-flower-bed" rx="3.8" ry="2"/><circle className="city-parcel-blossom" cx="-1" cy="-1.6" r=".9"/><circle className="city-parcel-blossom" cx="1.5" cy="-.5" r=".8"/></g>)}
    {[9,18].map(u=><g key={u} transform={`translate(${point(u,29,1)})`}><path className="city-parcel-light-post" d="M0 0V-6"/><circle className="city-parcel-light" cy="-6" r="1.5"/></g>)}
  </g>;
}

function GableRoof({side,z,variant}: {side:number;z:number;variant:number}) {
  const s=side/2,peak=z+10;
  return <g>
    <polygon className="city-gable" points={[point(s,-s,z),point(s,s,z),point(s,0,peak)].join(' ')}/>
    <polygon className="city-pitched-roof-back" points={[point(-s,-s,z),point(s,-s,z),point(s,0,peak),point(-s,0,peak)].join(' ')}/>
    <polygon className="city-pitched-roof" points={[point(-s,0,peak),point(s,0,peak),point(s,s,z),point(-s,s,z)].join(' ')}/>
    {[-.24,0,.24].map(v=><path key={v} className="city-roof-seam" d={`M${point(-s,v*side,peak-Math.abs(v)*20)} L${point(s,v*side,peak-Math.abs(v)*20)}`}/>)}
    <Volume side={5} height={7} base={z+6} u={-side*.2} v={-side*.16} glass={false}/>
    {variant===1?<polygon className="city-solar" points={[point(-12,4,peak-2),point(0,4,peak-2),point(0,12,z+4),point(-12,12,z+4)].join(' ')}/>:null}
  </g>;
}

function DistinctArchitecture({family,height,tier}: {family:number;height:number;tier:number}) {
  if(family===1)return <g className="city-material-brick"><Volume side={38} height={height} glass={false}/>{[0,1,2].map(i=><Volume key={i} side={7} height={Math.min(12,height*.4)} base={height*.28} u={-12+i*12} v={20}/>)}<GableRoof side={42} z={height} variant={1}/><polygon className="city-entrance-canopy" points={square(10,22,12,10)}/></g>;
  if(family===2)return <g className="city-material-stone"><Volume side={18} height={height} u={-12} v={-12}/><Volume side={18} height={height*.72} u={-12} v={10}/><Volume side={18} height={height*.72} u={10} v={-12}/><polygon className="city-courtyard-pool" points={square(10,10,17,1)}/><Garden side={18} z={height} u={-12} v={-12}/>{tier>=4?<Volume side={12} height={height*.28} base={height*.72} u={10} v={-12}/>:null}</g>;
  if(family===3)return <g className="city-material-glass"><Volume side={40} height={5}/><path className="city-round-wall" d={`M-25,${-height} a25,12 0 0 0 50,0 L25,-5 a25,12 0 0 1 -50,0 Z`}/>{Array.from({length:Math.max(1,Math.floor(height/10))},(_,i)=><path key={i} className="city-round-floor" d={`M-25,${-6-i*10} a25,12 0 0 0 50,0`}/>)}<ellipse className="city-round-roof" cy={-height} rx="25" ry="12"/><ellipse className="city-round-skylight" cy={-height-1} rx="16" ry="7"/><path className="city-round-glint" d={`M-8,${-height+10} V-1 M5,${-height+11} V4`}/></g>;
  if(family===4)return <g className="city-material-metal"><Volume side={40} height={5}/><Volume side={18} height={height-5} base={5} u={-11} v={11}/><Volume side={18} height={height*.82-5} base={5} u={11} v={-11}/><polygon className="city-skybridge" points={[point(-8,8,height*.45),point(8,-8,height*.45),point(12,-4,height*.45),point(-4,12,height*.45)].join(' ')}/><Garden side={18} z={height} u={-11} v={11}/></g>;
  if(family===5)return <g className="city-material-civic"><Volume side={42} height={height*.65} glass={false}/>{[-14,0,14].map(u=><path key={u} className="city-colonnade" d={`M${point(u,22,2)} L${point(u,22,height*.6)}`}/>)}<path className="city-dome" d={`M-30,${-height*.65} Q-27,${-height-15} 0,${-height} Q27,${-height-15} 30,${-height*.65} Q0,${-height*.65+20} -30,${-height*.65} Z`}/><path className="city-dome-rib" d={`M0,${-height} Q-12,${-height*.85} 0,${-height*.65+10} M0,${-height} Q12,${-height*.85} 0,${-height*.65+10}`}/></g>;
  return <g className="city-material-industrial"><Volume side={40} height={height} glass={tier>=2}/>{[0,1,2].map(i=>{const u=-20+i*40/3;return <g key={i}><polygon className="city-saw-roof" points={[point(u,-20,height),point(u+13,-20,height+9),point(u+13,20,height+9),point(u,20,height)].join(' ')}/><polygon className="city-saw-glass" points={[point(u+13,-20,height),point(u+13,20,height),point(u+13,20,height+9),point(u+13,-20,height+9)].join(' ')}/></g>;})}<Volume side={6} height={12} base={height} u={-15} v={-15} glass={false}/></g>;
}

function CityBuilding({tier,side:footprint,variant=0}: {tier:number;side:number;variant?:number}) {
  const id=useId().replace(/:/g,'');
  const height=BUILDING_TIERS[tier].height,s=40,base=10;
  const style={'--glass-left':`url(#${id}-left)`,'--glass-right':`url(#${id}-right)`,'--round-glass':`url(#${id}-round)`,'--concrete-left':`url(#${id}-concrete-left)`,'--concrete-right':`url(#${id}-concrete-right)`,'--dome-metal':`url(#${id}-metal)`} as CSSProperties;
  return <g className={`city-building city-tier-${tier} city-variant-${variant%3} city-family-${variant}`} data-building-family={variant} style={style} transform={`scale(${footprint/64})`}>
    <defs>
      <linearGradient id={`${id}-left`} x1="0" y1="0" x2="1" y2="1"><stop className="city-glass-stop-light" stopColor="#abd6df"/><stop className="city-glass-stop-mid" offset=".42" stopColor="#659cb6"/><stop className="city-glass-stop-dark" offset="1" stopColor="#346481"/></linearGradient>
      <linearGradient id={`${id}-right`} x1="0" y1="0" x2=".4" y2="1"><stop className="city-glass-stop-mid" stopColor="#6397b3"/><stop className="city-glass-stop-dark" offset="1" stopColor="#315776"/></linearGradient>
      <linearGradient id={`${id}-round`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#29424c"/><stop offset=".28" stopColor="#6e929e"/><stop offset=".4" stopColor="#b5ccd0"/><stop offset=".48" stopColor="#7298a2"/><stop offset=".78" stopColor="#395c69"/><stop offset="1" stopColor="#223d49"/></linearGradient>
      <linearGradient id={`${id}-concrete-left`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--concrete-light,#e0e4e1)"/><stop offset="1" stopColor="var(--concrete-mid,#aeb9b8)"/></linearGradient>
      <linearGradient id={`${id}-concrete-right`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--concrete-shade,#9ca9aa)"/><stop offset="1" stopColor="var(--concrete-dark,#677d83)"/></linearGradient>
      <linearGradient id={`${id}-metal`} x1="0" y1="0" x2=".9" y2="1"><stop stopColor="#d2dbdb"/><stop offset=".38" stopColor="#879fa6"/><stop offset=".65" stopColor="#526e7b"/><stop offset="1" stopColor="#2b4552"/></linearGradient>
    </defs>
    <Parcel variant={variant}/>
    <g className="city-architecture">
      {variant!==0?<DistinctArchitecture family={variant} height={height} tier={tier}/>:<>
      <Volume side={s} height={tier<4?height:base} glass={tier>=2} seed={variant}/>
      {tier<2?<>
        {[0,1,2].map(i=>{const u=-14+i*10;return <g key={i}><polygon className="city-house-window" points={[point(u,20,4),point(u+6,20,4),point(u+6,20,height-4),point(u,20,height-4)].join(' ')}/><polygon className="city-house-window" points={[point(20,u,4),point(20,u+6,4),point(20,u+6,height-4),point(20,u,height-4)].join(' ')}/>{tier===1?<path className="city-house-sill" d={`M${point(u-1,20,14)} L${point(u+7,20,14)}`}/>:null}</g>})}
        <Garden side={s} z={height}/>
        <polygon className="city-entrance-canopy" points={square(11,22,12,9)}/>
      </>:null}
      {tier===2?<><Garden side={s} z={height}/><Volume side={12} height={7} base={height} u={9} v={-9} glass={false}/></>:null}
      {tier===3?<><Garden side={s} z={height}/><Volume side={16} height={8} base={height} u={7} v={-7}/>{[18,36,54].map(z=><path key={z} className="city-balcony" d={`M${point(-21,21,z)} L${point(21,21,z)} L${point(21,-21,z)}`}/>)}</>:null}
      {tier===4?<><Volume side={28} height={height-base} base={base} seed={variant+2}/><Volume side={22} height={7} base={height} glass={false}/><path className="city-crown-light" d={`M${point(-14,14,height-1)} L${point(14,14,height-1)} L${point(14,-14,height-1)}`}/><Garden side={s} z={base}/></>:null}
      {tier===5?<><Volume side={34} height={36} base={base} seed={variant}/><Garden side={34} z={46}/><Volume side={25} height={28} base={46} u={-3} v={-3} seed={variant+1}/><Garden side={25} z={74} u={-3} v={-3}/><Volume side={17} height={height-74} base={74} u={-6} v={-6} seed={variant+2}/><Volume side={10} height={5} base={height} u={-6} v={-6} glass={false}/></>:null}
      {tier===6?<><Volume side={34} height={40} base={base}/><Garden side={34} z={50}/><Volume side={26} height={34} base={50} u={-3} v={-3}/><Garden side={26} z={84} u={-3} v={-3}/><Volume side={18} height={height-84} base={84} u={-6} v={-6}/><Volume side={10} height={6} base={height} u={-6} v={-6} glass={false}/></>:null}
      {tier===7?<><Volume side={34} height={36} base={base} seed={variant}/><Garden side={34} z={46}/><Volume side={26} height={40} base={46} seed={variant+1}/><Volume side={18} height={height-86} base={86} seed={variant+2}/><Volume side={10} height={8} base={height} glass={false}/><path className="city-spire" d={`M0,${-height-8} v-16`}/><circle className="city-beacon" cy={-height-24} r="2.3"/><path className="city-crown-light" d={`M${point(-9,9,height-2)} L${point(9,9,height-2)} L${point(9,-9,height-2)}`}/></>:null}
      <path className="city-entrance" d={`M${point(8,20,0)} L${point(8,20,8)} L${point(14,20,8)} L${point(14,20,0)} Z`}/>
      {tier>=2?<polygon className="city-entrance-canopy" points={square(11,21,12,9)}/>:null}
      </>}
    </g>
    <g className="city-building-entry-details">
      <path className="city-entry-steps" d={`M${point(6,24,.9)}L${point(16,24,.9)} M${point(5,27,.6)}L${point(17,27,.6)}`}/>
      <path className="city-entry-bollards" d={`M${point(4,23)}L${point(4,23,3)} M${point(18,23)}L${point(18,23,3)}`}/>
    </g>
  </g>;
}

export default memo(CityBuilding);
