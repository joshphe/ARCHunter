const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const m={exports:{}};
new Function('exports','module',ts.transpileModule(fs.readFileSync('lib/ecosystem-map-layout.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m.exports,m);
const {mapScale,layoutMap,PROJECT_PLOTS,PLOT_TIERS,NEIGHBORHOOD_ORIGIN,PROJECT_BLOCKS}=m.exports;
test('all USD building boundaries are lower-inclusive',()=>{
  [0,1e5,5e5,1e6,5e6,1e7,1e8,1e9].forEach((cap,i)=>{
    assert.equal(mapScale(cap).buildingTier,i);
    if(i) assert.equal(mapScale(cap-.01).buildingTier,i-1);
  });
  assert.equal(mapScale(1e12).buildingTier,7);
});
test('land changes at its own five boundaries, independent of floor count',()=>{
  [0,5e5,5e6,1e8,1e9].forEach((cap,i)=>{
    assert.equal(mapScale(cap).plotTier,i);
    if(i)assert.equal(mapScale(cap-.01).plotTier,i-1);
  });
  assert.equal(mapScale(1e5).side,mapScale(0).side);
  assert.notEqual(mapScale(1e5).buildingTier,mapScale(0).buildingTier);
});
test('missing or invalid caps are not silently treated as zero',()=>{
  [null,undefined,NaN,Infinity,-1].forEach(cap=>assert.equal(mapScale(cap).buildingTier,null));
  assert.equal(mapScale(0).buildingTier,0);
});

test('square side lengths double and every edge aligns to the base grid',()=>{
  assert.deepEqual(PLOT_TIERS.map(p=>p.side),[64,128,256,512,1024]);
  for(let i=1;i<PLOT_TIERS.length;i++)assert.equal(PLOT_TIERS[i].side**2,4*PLOT_TIERS[i-1].side**2);
});
const project=(slug,cap)=>({slug,tokenMetrics:{marketCapUsd:cap}});
function verifyTiling(result){
  const cells=[...result.parcels,...result.vacant];
  for(const block of result.blocks){
    const members=cells.filter(c=>c.block===block.block);
    assert.equal(members.reduce((area,c)=>area+c.side*c.side,0),block.packedWidth*block.packedDepth);
    for(const cell of members){
      assert.equal(cell.packedU%cell.side,0);assert.equal(cell.packedV%cell.side,0);
      assert.ok(cell.u>=block.u&&cell.v>=block.v&&cell.u+cell.side<=block.u+block.width&&cell.v+cell.side<=block.v+block.depth);
    }
  }
  for(let i=0;i<cells.length;i++)for(let j=i+1;j<cells.length;j++){
    const a=cells[i],b=cells[j];
    assert.ok(a.u+a.side<=b.u||b.u+b.side<=a.u||a.v+a.side<=b.v||b.v+b.side<=a.v,'Parcels must not overlap');
  }
  for(const [a,b] of result.streets)for(const cell of result.parcels){
    const vertical=a.u===b.u;
    const intersects=vertical?a.u+18>cell.u&&a.u-18<cell.u+cell.side&&Math.max(a.v,b.v)>cell.v&&Math.min(a.v,b.v)<cell.v+cell.side:a.v+18>cell.v&&a.v-18<cell.v+cell.side&&Math.max(a.u,b.u)>cell.u&&Math.min(a.u,b.u)<cell.u+cell.side;
    assert.equal(intersects,false,'Road and sidewalks must not cut into a plot');
  }
}
test('underlying parcels tile each block before spacing, with no rendered overlap',()=>{
  for(let offset=0;offset<8;offset++)verifyTiling(layoutMap(PROJECT_PLOTS.map((slug,i)=>project(slug,[0,1e5,5e5,1e6,5e6,1e7,1e8,1e9][(i+offset)%8]))));
});
test('parcel arrangement is deterministic across directory order and unregistered projects',()=>{
  const projects=PROJECT_PLOTS.map((slug,i)=>project(slug,i%2?1e6:0));
  const coordinates=result=>result.buildings.map(({project,...b})=>b);
  assert.deepEqual(coordinates(layoutMap(projects)),coordinates(layoutMap([...projects].reverse())));
  const withNew=layoutMap([...projects,project('new-project',1e10)]);
  const world=result=>result.buildings.filter(b=>b.project.slug!=='new-project').map(b=>({slug:b.project.slug,u:b.u,v:b.v,side:b.side,block:b.block}));
  assert.deepEqual(world(layoutMap(projects)),world(withNew));
  assert.ok(withNew.buildings.some(b=>b.project.slug==='new-project'));
});
test('crossing cap bands repacks inside the fixed neighborhood and all XXL parcels fit',()=>{
  const before={...NEIGHBORHOOD_ORIGIN};
  const after=layoutMap(PROJECT_PLOTS.map(slug=>project(slug,1e9)));
  verifyTiling(after);assert.deepEqual(NEIGHBORHOOD_ORIGIN,before);
  assert.equal(after.buildings.length,PROJECT_PLOTS.length);
  assert.ok(after.parcels.every(p=>p.side===1024));
});

test('every permanent cluster has two to four projects and membership survives cap changes',()=>{
  assert.deepEqual([...PROJECT_BLOCKS.flat()].sort(),[...PROJECT_PLOTS].sort());
  assert.ok(PROJECT_BLOCKS.every(block=>block.length>=2&&block.length<=4));
  const before=layoutMap(PROJECT_PLOTS.map(slug=>project(slug,0)));
  const after=layoutMap(PROJECT_PLOTS.map(slug=>project(slug,1e9)));
  for(const p of before.buildings)assert.equal(after.buildings.find(b=>b.project.slug===p.project.slug).block,p.block);
});

test('neighboring buildings have a pedestrian gap without changing parcel dimensions',()=>{
  for(const cap of [0,5e5,5e6,1e8,1e9]){
    const result=layoutMap(PROJECT_PLOTS.map(slug=>project(slug,cap)));
    for(let i=0;i<result.parcels.length;i++)for(let j=i+1;j<result.parcels.length;j++){
      const a=result.parcels[i],b=result.parcels[j];
      const gapU=Math.max(a.u,b.u)-Math.min(a.u+a.side,b.u+b.side);
      const gapV=Math.max(a.v,b.v)-Math.min(a.v+a.side,b.v+b.side);
      assert.ok(gapU>=16||gapV>=16,'Buildings must not share an occupied edge');
    }
    assert.ok(result.parcels.every(p=>p.side===mapScale(cap).side));
  }
});

test('project architecture is stable and all seven silhouettes are assigned',()=>{
  const {buildingVariant,BUILDING_FAMILIES}=m.exports;
  assert.equal(BUILDING_FAMILIES.length,7);
  assert.equal(new Set(PROJECT_PLOTS.map(buildingVariant)).size,7);
  assert.equal(buildingVariant('kairo'),2);
  assert.equal(buildingVariant('argus'),0);
  assert.ok(buildingVariant('future-project')>=0&&buildingVariant('future-project')<7);
});
test('all architectural families render at every scale with distinct geometry',()=>{
  const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  const buildingModule={exports:{}};
  const code=ts.transpileModule(fs.readFileSync('app/city-building.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('require','exports','module',code)(name=>name==='@/lib/ecosystem-map-layout'?m.exports:require(name),buildingModule.exports,buildingModule);
  for(let tier=0;tier<8;tier++){
    const shapes=[];
    for(let family=0;family<7;family++){
      const html=renderToStaticMarkup(React.createElement('svg',null,React.createElement(buildingModule.exports.default,{tier,side:64,variant:family})));
      assert.ok(!html.includes('NaN')&&!html.includes('undefined'));
      shapes.push([...html.matchAll(/(?:points|d)="([^"]+)"/g)].map(p=>p[1]).join('|'));
    }
    assert.equal(new Set(shapes).size,7,'Every family must have different geometry, not just a different color');
  }
});
