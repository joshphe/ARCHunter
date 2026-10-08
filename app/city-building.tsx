import { useId } from 'react';
import type { CSSProperties } from 'react';
import { BUILDING_TIERS } from '@/lib/ecosystem-map-layout';

const point = (u: number, v: number, z = 0) => `${u - v},${(u + v) / 2 - z}`;

function Volume({ side, height, base = 0, u = 0, v = 0, glass = true }: { side: number; height: number; base?: number; u?: number; v?: number; glass?: boolean }) {
  const a = u - side / 2, b = v - side / 2, c = u + side / 2, d = v + side / 2, roof = base + height;
  const pane = Math.max(4, (side - 10) / Math.max(2, Math.floor(side / 9)));
  const columns = Array.from({ length: Math.max(2, Math.floor(side / 9)) }, (_, i) => 5 + i * pane);
  const floors = Array.from({ length: Math.max(0, Math.floor((height - 5) / 10)) }, (_, i) => base + 5 + i * 10);
  return <g>
    <polygon className="city-face-left" points={[point(a,d,base),point(c,d,base),point(c,d,roof),point(a,d,roof)].join(' ')}/>
    <polygon className="city-face-right" points={[point(c,b,base),point(c,d,base),point(c,d,roof),point(c,b,roof)].join(' ')}/>
    {glass && height > 9 ? <g>
      {columns.map((offset, index) => <g key={index}>
        <polygon className="city-glass-left" points={[point(a+offset,d,base+3),point(a+offset+pane-2,d,base+3),point(a+offset+pane-2,d,roof-3),point(a+offset,d,roof-3)].join(' ')}/>
        <polygon className="city-glass-right" points={[point(c,b+offset,base+3),point(c,b+offset+pane-2,base+3),point(c,b+offset+pane-2,roof-3),point(c,b+offset,roof-3)].join(' ')}/>
      </g>)}
      {floors.map(z => <g key={z} className="city-floor-line"><path d={`M${point(a,d,z)} L${point(c,d,z)} L${point(c,b,z)}`}/></g>)}
      <path className="city-facade-glint" d={`M${point(a+side*.27,d,base+3)} L${point(a+side*.48,d,roof-3)} M${point(c,b+side*.6,base+3)} L${point(c,b+side*.8,roof-3)}`}/>
    </g> : null}
    <polygon className="city-roof" points={[point(a,b,roof),point(c,b,roof),point(c,d,roof),point(a,d,roof)].join(' ')}/>
    <polygon className="city-roof-inset" points={[point(a+3,b+3,roof),point(c-3,b+3,roof),point(c-3,d-3,roof),point(a+3,d-3,roof)].join(' ')}/>
    <path className="city-roof-rim" d={`M${point(a,d,roof)} L${point(c,d,roof)} L${point(c,b,roof)}`}/>
    <path className="city-corner" d={`M${point(c,d,base)} L${point(c,d,roof)}`}/>
  </g>;
}

function RoofGarden({ side, z }: { side: number; z: number }) {
  return <g>
    <polygon className="city-roof-garden" points={[point(-side*.39,side*.05,z),point(-side*.39,side*.36,z),point(side*.23,side*.36,z),point(side*.23,side*.05,z)].join(' ')}/>
    {[0,1,2].map(i => <path key={i} className="city-roof-planter" d={`M${point(-side*.3+i*side*.18,side*.12,z+2)} l0,-4`}/>)}
    <polygon className="city-solar" points={[point(-side*.3,-side*.3,z+1),point(side*.15,-side*.3,z+1),point(side*.15,-side*.08,z+1),point(-side*.3,-side*.08,z+1)].join(' ')}/>
    <path className="city-solar-lines" d={`M${point(-side*.08,-side*.3,z+1)} L${point(-side*.08,-side*.08,z+1)}`}/>
  </g>;
}

function PitchedRoof({ side, z }: { side: number; z: number }) {
  const s = side / 2;
  return <g>
    <polygon className="city-gable" points={[point(s,-s,z),point(s,s,z),point(s,0,z+14)].join(' ')}/>
    <polygon className="city-pitched-roof-back" points={[point(-s,-s,z),point(s,-s,z),point(s,0,z+14),point(-s,0,z+14)].join(' ')}/>
    <polygon className="city-pitched-roof" points={[point(-s,0,z+14),point(s,0,z+14),point(s,s,z),point(-s,s,z)].join(' ')}/>
    {[-.25,0,.25].map(v=><path key={v} className="city-roof-seam" d={`M${point(-s,v*side,z+14-Math.abs(v)*28)} L${point(s,v*side,z+14-Math.abs(v)*28)}`}/>)}
    <Volume side={side*.12} height={10} base={z+10} u={-side*.2} v={-side*.15} glass={false}/>
  </g>;
}

export default function CityBuilding({ tier, side: footprint }: { tier: number; side: number }) {
  const side = 64;
  const id = useId().replace(/:/g, '');
  const height = BUILDING_TIERS[tier].height;
  const glassStyle = { '--glass-left': `url(#${id}-left)`, '--glass-right': `url(#${id}-right)` } as CSSProperties;
  return <g className={`city-building city-tier-${tier}`} style={glassStyle} transform={`scale(${footprint/side})`}>
    <defs>
      <linearGradient id={`${id}-left`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#88b3be"/><stop offset=".42" stopColor="#416879"/><stop offset="1" stopColor="#243e4f"/></linearGradient>
      <linearGradient id={`${id}-right`} x1="0" y1="0" x2=".4" y2="1"><stop stopColor="#517889"/><stop offset="1" stopColor="#233847"/></linearGradient>
    </defs>
    <Volume side={side} height={tier < 4 ? height : 18} glass={tier>=2}/>
    {tier<2 ? <g>{[0,1,2].map(i=>{
      const u=-side*.34+i*side*.26, v=side/2;
      return <g key={i}><polygon className="city-house-window" points={[point(u,v,5),point(u+side*.14,v,5),point(u+side*.14,v,height-4),point(u,v,height-4)].join(' ')}/><polygon className="city-house-window" points={[point(v,u,5),point(v,u+side*.14,5),point(v,u+side*.14,height-4),point(v,u,height-4)].join(' ')}/></g>;
    })}</g> : null}
    {tier < 2 ? <PitchedRoof side={side} z={height}/> : null}
    {tier >= 2 && tier < 4 ? <><RoofGarden side={side} z={height}/><Volume side={side*.38} height={7} base={height} u={side*.16} v={-side*.16}/></> : null}
    {tier === 4 ? <><Volume side={side*.76} height={height-18} base={18}/><RoofGarden side={side*.76} z={height}/></> : null}
    {tier === 5 ? <><Volume side={side*.8} height={42} base={18}/><RoofGarden side={side*.8} z={60}/><Volume side={side*.53} height={height-60} base={60} v={-side*.06}/></> : null}
    {tier === 6 ? <><Volume side={side*.36} height={height-32} base={18} u={-side*.24} v={side*.24}/><Volume side={side*.42} height={height-18} base={18} u={side*.24} v={-side*.24}/></> : null}
    {tier === 7 ? <><Volume side={side*.78} height={46} base={18}/><Volume side={side*.58} height={42} base={64}/><Volume side={side*.36} height={height-106} base={106}/><path className="city-spire" d={`M0,${-height} v-17`}/><circle className="city-beacon" cy={-height-17} r="2"/></> : null}
    <path className="city-entrance" d={`M${point(side*.21,side/2,0)} L${point(side*.21,side/2,8)} L${point(side*.36,side/2,8)} L${point(side*.36,side/2,0)}`}/>
  </g>;
}
