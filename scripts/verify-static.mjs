import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const json=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const cards=await json('data/cards.json'),origin=await json('data/game-catalog.json'),manifest=await json('data/game-source.json'),articles=await json('data/rule-articles.json');
assert.equal(cards.length,origin.cards.length);
assert.equal(new Set(cards.map(c=>c.id)).size,cards.length);
assert.equal(articles.length,manifest.rulePages);
let routes=0,images=0;
for(const route of ['','rules','world',...cards.map(c=>'cards/'+c.id),...cards.filter(c=>c.categoryId==='witch').map(c=>'characters/'+c.id)]){
  const html=await fs.readFile(path.join('out',route,'index.html'),'utf8');assert(html.includes('<html'));routes++;
}
for(const c of cards){
  const live=origin.cards.find(entry=>entry.card.id===c.gameId);assert(live,`Missing original ${c.id}`);
  assert.deepEqual(c.game,live.card,`Public fields differ ${c.id}`);
  assert.equal(c.name,live.card.name);assert.equal(c.effect,live.card.description);
  assert.equal(c.notes,live.card.notes||'');assert.equal(c.cost,live.card.cost);
  assert(c.image||Object.keys(c.templeArt||{}).length,`Missing art ${c.id}`);
}
for(const asset of manifest.assets){
  for(const root of ['public','out']){
    const bytes=await fs.readFile(path.join(root,asset.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,`Changed image ${root}${asset.path}`);
  }
  images++;
}
for(const forbidden of ['out/api','out/admin','dist/server'])await assert.rejects(fs.access(forbidden),`Unexpected runtime entry ${forbidden}`);
async function scan(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())await scan(file);else if(/\.(tsx?|mjs)$/.test(file)){const text=await fs.readFile(file,'utf8');assert(!/\bfetch\s*\(|\bWebSocket\s*\(|next\/headers|cloudflare:workers/.test(text),`Runtime dependency ${file}`);}}}
await scan('app');await scan('lib');
const result={status:'passed',contentVersion:manifest.contentVersion,publicCards:cards.length,staticPageRoutes:routes,rulebookPages:articles.length,verifiedAssets:images,runtimeApiDependencies:0};
await fs.mkdir('work',{recursive:true});await fs.writeFile('work/static-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
