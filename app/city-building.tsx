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
    </g>:null}
    <polygon className="city-roof" points={square(u,v,side,roof)}/>
    <polygon className="city-roof-inset" points={square(u,v,side-5,roof+.2)}/>
    <path className="city-roof-rim" d={`M${point(a,d,roof)} L${point(c,d,roof)} L${point(c,b,roof)}`}/>
    <path className="city-corner" d={`M${point(c,d,base)} L${point(c,d,roof)}`}/>
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
    <path className="city-parcel-path" d={`M${point(13,18,.8)} L${point(13,32,.8)} M${point(18,13,.8)} L${point(32,13,.8)}`}/>
    <polygon className="city-parcel-hedge" points={square(-24,-22,10,1)}/>
    <PlotTree u={-25} v={-23} round={variant===1}/>
    <PlotTree u={25} v={-24}/>
    <PlotTree u={-26} v={18} round/>
    <path className="city-parcel-bench" d={`M${point(-17,25,2)} L${point(-6,25,2)}`}/>
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

function CityBuilding({tier,side:footprint,variant=0}: {tier:number;side:number;variant?:number}) {
  const id=useId().replace(/:/g,'');
  const height=BUILDING_TIERS[tier].height,s=40,base=10;
  const style={'--glass-left':`url(#${id}-left)`,'--glass-right':`url(#${id}-right)`} as CSSProperties;
  return <g className={`city-building city-tier-${tier} city-variant-${variant%3}`} style={style} transform={`scale(${footprint/64})`}>
    <defs>
      <linearGradient id={`${id}-left`} x1="0" y1="0" x2="1" y2="1"><stop className="city-glass-stop-light" stopColor="#abd6df"/><stop className="city-glass-stop-mid" offset=".42" stopColor="#659cb6"/><stop className="city-glass-stop-dark" offset="1" stopColor="#346481"/></linearGradient>
      <linearGradient id={`${id}-right`} x1="0" y1="0" x2=".4" y2="1"><stop className="city-glass-stop-mid" stopColor="#6397b3"/><stop className="city-glass-stop-dark" offset="1" stopColor="#315776"/></linearGradient>
    </defs>
    <Parcel variant={variant}/>
    <g className="city-architecture">
      <Volume side={s} height={tier<4?height:base} glass={tier>=2} seed={variant}/>
      {tier<2?<>
        {[0,1,2].map(i=>{const u=-14+i*10;return <g key={i}><polygon className="city-house-window" points={[point(u,20,4),point(u+6,20,4),point(u+6,20,height-4),point(u,20,height-4)].join(' ')}/><polygon className="city-house-window" points={[point(20,u,4),point(20,u+6,4),point(20,u+6,height-4),point(20,u,height-4)].join(' ')}/>{tier===1?<path className="city-house-sill" d={`M${point(u-1,20,14)} L${point(u+7,20,14)}`}/>:null}</g>})}
        <GableRoof side={s+3} z={height} variant={variant}/>
        <polygon className="city-entrance-canopy" points={square(11,22,12,9)}/>
      </>:null}
      {tier===2?<><Garden side={s} z={height}/><Volume side={12} height={7} base={height} u={9} v={-9} glass={false}/></>:null}
      {tier===3?<><Garden side={s} z={height}/><Volume side={16} height={8} base={height} u={7} v={-7}/>{[18,36,54].map(z=><path key={z} className="city-balcony" d={`M${point(-21,21,z)} L${point(21,21,z)} L${point(21,-21,z)}`}/>)}</>:null}
      {tier===4?<><Volume side={28} height={height-base} base={base} seed={variant+2}/><Volume side={22} height={7} base={height} glass={false}/><path className="city-crown-light" d={`M${point(-14,14,height-1)} L${point(14,14,height-1)} L${point(14,-14,height-1)}`}/><Garden side={s} z={base}/></>:null}
      {tier===5?<><Volume side={34} height={36} base={base} seed={variant}/><Garden side={34} z={46}/><Volume side={25} height={28} base={46} u={-3} v={-3} seed={variant+1}/><Garden side={25} z={74} u={-3} v={-3}/><Volume side={17} height={height-74} base={74} u={-6} v={-6} seed={variant+2}/><Volume side={10} height={5} base={height} u={-6} v={-6} glass={false}/></>:null}
      {tier===6?<><Volume side={17} height={height-base-14} base={base} u={-11} v={11} seed={variant}/><Volume side={19} height={height-base} base={base} u={11} v={-11} seed={variant+2}/><polygon className="city-skybridge" points={[point(-8,8,58),point(8,-8,58),point(12,-4,58),point(-4,12,58)].join(' ')}/><Volume side={14} height={6} base={height} u={11} v={-11} glass={false}/><path className="city-crown-light" d={`M${point(1.5,-1.5,height)} L${point(20.5,-1.5,height)} L${point(20.5,-20.5,height)}`}/></>:null}
      {tier===7?<><Volume side={34} height={36} base={base} seed={variant}/><Garden side={34} z={46}/><Volume side={26} height={40} base={46} seed={variant+1}/><Volume side={18} height={height-86} base={86} seed={variant+2}/><Volume side={10} height={8} base={height} glass={false}/><path className="city-spire" d={`M0,${-height-8} v-16`}/><circle className="city-beacon" cy={-height-24} r="2.3"/><path className="city-crown-light" d={`M${point(-9,9,height-2)} L${point(9,9,height-2)} L${point(9,-9,height-2)}`}/></>:null}
      <path className="city-entrance" d={`M${point(8,20,0)} L${point(8,20,8)} L${point(14,20,8)} L${point(14,20,0)} Z`}/>
      {tier>=2?<polygon className="city-entrance-canopy" points={square(11,21,12,9)}/>:null}
    </g>
  </g>;
}

export default memo(CityBuilding);
