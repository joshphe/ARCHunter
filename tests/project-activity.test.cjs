const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
function load(name){const m={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/'+name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('exports','require','module',code)(m.exports,p=>p==='./project-activity'?load('project-activity'):require(p),m);return m.exports;}
const {summarizeActivity}=load('project-activity');const {scanActivity}=load('project-activity-provider');
const now=Date.parse('2026-10-05T12:00:00Z'),day=86400000;
const address='0x'+'1'.repeat(40),sender='0x'+'a'.repeat(40);
const contract={address,label:'Fixture',sourceUrl:'https://example.com'};
function tx(n,age=1,extra={}){return {hash:'0x'+n.toString(16).padStart(64,'0'),from:sender,to:address,timestamp:new Date(now-age*day).toISOString(),input:'0x12345678',success:true,...extra};}
function summarize(transactions,complete=true,failed=false){return summarizeActivity([{address,transactions,complete,failed}],[contract],'business',now);}
test('deduplicates hashes and mixed-case senders; excludes failed, future, old, native and token calls',()=>{
 const r=summarize([tx(1),tx(1),tx(2,2,{from:sender.toUpperCase().replace('0X','0x')}),tx(3,1,{success:false}),tx(4,31),tx(5,-1),tx(6,1,{input:'0x'}),tx(7,1,{input:'0xa9059cbb'}),tx(8,1,{to:'0x'+'2'.repeat(40)})]);
 assert.equal(r.windows[0].transactions,2);assert.equal(r.windows[0].activeAddresses,1);assert.equal(r.windows[0].returningPercent,100);
});
test('same-day repeated calls are not multi-day returning addresses',()=>{assert.equal(summarize([tx(1),tx(2)]).windows[0].returningPercent,0);});
test('rolling windows include exact start; comparison uses previous nonoverlapping 7 days',()=>{
 const r=summarize([tx(1,7),tx(2,14),tx(3,30)]);assert.equal(r.windows[0].transactions,1);assert.equal(r.windows[1].transactions,3);assert.equal(r.change7d,0);
});
test('unavailable never reports zero; partial hides ratios; empty complete is zero',()=>{
 assert.equal(summarize([],false,true).windows[0].transactions,null);
 const r=summarize([tx(1)],false,true);assert.equal(r.status,'partial');assert.equal(r.windows[0].returningPercent,null);assert.equal(r.change7d,null);
 assert.equal(summarize([]).windows[0].transactions,0);
 assert.equal(summarizeActivity([],[],'business',now).status,'unconfigured');
});
test('token scope counts approvals without mixing into business results',()=>{
 const r=summarizeActivity([{address,transactions:[tx(1,1,{input:'0x095ea7b3'})],complete:true,failed:false}],[contract],'token',now);assert.equal(r.windows[0].transactions,1);
});
const row=n=>({hash:tx(n).hash,from:{hash:sender},to:{hash:address},timestamp:tx(n).timestamp,raw_input:'0x12345678',status:'ok'});
const response=data=>({ok:true,json:async()=>data});
test('provider follows cursor, preserves input filter and stops at end',async()=>{
 let calls=0;const r=await scanActivity(address,now-30*day,new AbortController().signal,async url=>{calls++;assert.equal(url.searchParams.get('filter'),'to');if(calls===2)assert.equal(url.searchParams.get('index'),'1');return response({items:[row(calls)],next_page_params:calls===1?{index:1}:null});});assert.equal(r.complete,true);assert.equal(r.transactions.length,2);
});
test('provider failure after a page retains only partial observations',async()=>{
 let calls=0;const r=await scanActivity(address,now-30*day,new AbortController().signal,async()=>{if(++calls===2)throw Error('offline');return response({items:[row(1)],next_page_params:{index:1}});});assert.equal(r.failed,true);assert.equal(r.complete,false);assert.equal(r.transactions.length,1);
});
test('malformed response and endless pagination cannot claim full coverage',async()=>{
 const bad=await scanActivity(address,now-30*day,new AbortController().signal,async()=>response({items:[]}));assert.equal(bad.failed,true);
 let i=0;const capped=await scanActivity(address,now-30*day,new AbortController().signal,async()=>response({items:[row(++i)],next_page_params:{index:i}}));assert.equal(i,20);assert.equal(capped.complete,false);
});
