const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');

function loadArchive(rows) {
  const archive={exports:{}};
  let query='';
  const code=ts.transpileModule(fs.readFileSync('lib/rug-projects.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','exports','module',code)(name=>{
    assert.equal(name,'@/lib/db');
    return {getSql:()=>({query:async text=>{query=text;return rows;}})};
  },archive.exports,archive);
  return {list:archive.exports.listRugProjects,query:()=>query};
}

test('archive exposes saved logos while preserving historical project identity',async()=>{
  const logo='https://example.com/archived-logo.png';
  const snapshot={name:'Archived project',symbol:'ARC',handle:'@archive',logo_url:logo,description_en:'Historical description'};
  const archive=loadArchive([{slug:'archived',project_snapshot:snapshot,logoUrl:logo}]);
  const [project]=await archive.list();
  assert.equal(project.logoUrl,logo);
  assert.equal(project.handle,snapshot.handle);
  assert.equal(project.descriptionEn,snapshot.description_en);
  assert.match(archive.query(),/COALESCE\(NULLIF\(BTRIM\(r\.project_snapshot->>'logo_url'\)/);
  assert.match(archive.query(),/LEFT JOIN ecosystem_projects p ON p\.slug=r\.slug/);
});

test('old archive without a logo supports the existing account and initials fallback',async()=>{
  const archive=loadArchive([{slug:'old',project_snapshot:{name:'Old project',symbol:'OLD',handle:'@old'}}]);
  const [project]=await archive.list();
  assert.equal(project.logoUrl,null);
  assert.equal(project.handle,'@old');
  assert.equal(project.symbol,'OLD');
});
