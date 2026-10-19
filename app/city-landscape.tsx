import { memo } from 'react';

/** Decorative elements share one scale and light direction throughout the atlas. */
export const LandscapeTree = memo(function LandscapeTree({x=0,y=0,scale=1,kind=0}: {x?:number;y?:number;scale?:number;kind?:number}) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} className={`city-landscape-tree city-tree-kind-${kind%4}`} aria-hidden="true">
    <ellipse className="city-foliage-shadow" cx="8" cy="3" rx="16" ry="6"/>
    <path className="city-natural-trunk" d={kind%4===3?'M0 0Q-5-18 0-36':'M0 0V-28M0-17L-8-27M0-20L8-29'}/>
    {kind%4===1?<>
      <path className="city-foliage-deep" d="M0-55C-5-45-11-35-10-25C-13-15-6-8 0-9C8-8 12-18 9-28C12-38 4-48 0-55Z"/>
      <path className="city-foliage-mid" d="M0-52C-5-40-7-28-6-21Q-6-12 0-11Z"/>
      <path className="city-leaf-vein" d="M0-44V-16M0-25L5-30M0-33L-4-37"/>
    </>:kind%4===3?<>
      {[-1,1].map(side=><g key={side}><path className="city-palm-leaf" d={`M0-35Q${side*12}-51 ${side*24}-32Q${side*12}-41 0-35Z`}/><path className="city-palm-leaf city-palm-leaf-front" d={`M0-35Q${side*14}-34 ${side*20}-17Q${side*6}-30 0-35Z`}/></g>)}
      <path className="city-palm-leaf" d="M0-35Q-5-50 4-54Q7-43 0-35Z"/>
    </>:<>
      <path className="city-foliage-deep" d="M-16-24C-24-26-23-39-15-42C-18-52-6-58 1-52C10-58 21-49 17-40C28-35 22-23 14-22C10-14-4-15-8-22Q-14-19-16-24Z"/>
      <ellipse className="city-foliage-mid" cx="-9" cy="-38" rx="11" ry="10"/>
      <ellipse className="city-foliage-light" cx="-5" cy="-47" rx="8" ry="6"/>
      <ellipse className="city-foliage-mid" cx="9" cy="-39" rx="9" ry="8"/>
      <path className="city-leaf-vein" d="M-13-37Q-6-43 0-40M5-33Q10-38 15-35M-9-28L-3-29"/>
      {kind%4===2?<g className="city-blossoms">{[[-13,-39],[-7,-48],[2,-44],[11,-40],[-3,-30],[14,-32]].map(([cx,cy],i)=><g key={i}><circle cx={cx} cy={cy} r="3.1"/><circle className="city-blossom-center" cx={cx-.5} cy={cy-.4} r="1"/></g>)}</g>:null}
    </>}
  </g>;
});

export function LandscapeBed({x=0,y=0,scale=1,flowers=false}: {x?:number;y?:number;scale?:number;flowers?:boolean}) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} className="city-landscape-bed" aria-hidden="true">
    <polygon className="city-planter-wall" points="-15,0 1,8 17,0 17,-4 1,4 -15,-4"/>
    <polygon className="city-planter-soil" points="-15,-4 1,-12 17,-4 1,4"/>
    {[[-7,-5],[0,-9],[8,-5],[1,-1]].map(([cx,cy],i)=><g key={i}><ellipse className="city-shrub" cx={cx} cy={cy-2} rx="6" ry="4"/><ellipse className="city-shrub-light" cx={cx-2} cy={cy-4} rx="3" ry="2"/>{flowers?<><circle className={`city-flower city-flower-${i%2}`} cx={cx} cy={cy-5} r="1.8"/><circle className="city-flower-core" cx={cx} cy={cy-5} r=".6"/></>:null}</g>)}
  </g>;
}

export function LandscapeBench({x=0,y=0,scale=1}: {x?:number;y?:number;scale?:number}) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} className="city-landscape-bench" aria-hidden="true">
    <ellipse className="city-foliage-shadow" cx="4" cy="2" rx="14" ry="4"/>
    <path className="city-bench-frame" d="M-9-4V2M11 6V11M-6-9V-4M14 1V6"/>
    <polygon className="city-bench-wood" points="-12,-5 -6,-8 17,3 11,6"/>
    <polygon className="city-bench-wood" points="-6,-8 -6,-15 17,-4 17,3"/>
    <path className="city-bench-slats" d="M-6-12L17-1M-9-6L14 5"/>
  </g>;
}

export function LandscapePergola({x=0,y=0,scale=1}: {x?:number;y?:number;scale?:number}) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} className="city-landscape-pergola" aria-hidden="true">
    <polygon className="city-pergola-paving" points="-26,0 0,-13 26,0 0,13"/>
    <path className="city-bench-frame" d="M-21 0V-25M0 10V-15M21 0V-25M0-10V-35"/>
    <polygon className="city-pergola-canopy" points="-25,-25 0,-38 25,-25 0,-12"/>
    {[-8,-4,0,4,8].map(v=><path key={v} className="city-pergola-slats" d={`M${-12-v},${(-12+v)/2-25} L${12-v},${(12+v)/2-25}`}/>)}
    <LandscapeBench x={0} y={0} scale={.7}/>
  </g>;
}
