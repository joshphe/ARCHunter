const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const path=require('node:path');
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/project-risk.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};new Function('exports','require','module',code)(mod.exports,require,mod);
const {validateRiskReview}=mod.exports;
const valid={slug:'example',priority:'watch',evidenceStatus:'partial',reasonEn:'Unverified admin permissions.',reasonZh:'管理员权限待核验。',sources:['https://example.com/security'],reviewedOn:'2026-10-02'};
test('accepts a structured review with evidence',()=>assert.equal(validateRiskReview(valid),true));
test('rejects unsupported classifications and inherited property names',()=>{
 for(const priority of ['safe','rug','__proto__','constructor'])assert.equal(validateRiskReview({...valid,priority}),false);
 assert.equal(validateRiskReview({...valid,evidenceStatus:'guaranteed'}),false);
});
test('rejects invalid dates, blank reasons and unsafe evidence URLs',()=>{
 for(const reviewedOn of ['2026-02-30','yesterday','2026-13-01'])assert.equal(validateRiskReview({...valid,reviewedOn}),false);
 assert.equal(validateRiskReview({...valid,reasonZh:' '}),false);
 for(const sources of [[],['javascript:alert(1)'],['file:///private']])assert.equal(validateRiskReview({...valid,sources}),false);
});
