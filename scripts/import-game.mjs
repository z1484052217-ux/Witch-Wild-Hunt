import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

// Explicit inputs keep a future content refresh separate from an ordinary build.
const [gameRoot,release,catalogFile]=process.argv.slice(2);
if(!gameRoot||!catalogFile||!/^[a-f0-9]{40}$/.test(release||''))throw Error('Usage: node scripts/import-game.mjs <game checkout> <40-character release SHA> <public catalog JSON>');
const readRelease=p=>JSON.parse(execFileSync('git',['-C',gameRoot,'show',`${release}:${p}`],{encoding:'utf8',maxBuffer:20_000_000,windowsHide:true}));
const readJson=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const catalog=await readJson(catalogFile),old=await readJson('data/cards.json');
const rulebook=readRelease('apps/web/src/data/edition-rulebook.json');
if(!catalog.contentVersion.startsWith(`base-content-${rulebook.version}+`))throw Error('Catalog and rulebook versions differ');
const base=readRelease('apps/web/src/data/card-art.json');
const higher=readRelease('apps/web/src/data/higher-battlefield-art.json');
const revisions=readRelease('apps/web/src/data/death-plague-art.json');
const templeArt=readRelease('apps/web/src/data/temple-art.json');
const artwork={...base,...Object.fromEntries(Object.entries(higher).filter(([id])=>id.startsWith('witch-')))};
const sourceCards=[...readRelease('packages/content/data/cards.json').cards,...['otherworld','final-abyss','higher-battlefield'].flatMap(name=>readRelease(`packages/content/data/${name}.json`))];
const norm=s=>s.normalize('NFKC').replace(/[\s「」『』“”"·：:！!？?]/g,'');
const reviewedReplacements={'basic-0-062':'basic-0062','basic-0-099':'basic-0099','basic-2-282':'basic-0282','forbidden-0-036':'forbidden-0036','witch-1-028':'witch-0028'};
const attributes={fire:'火',wood:'木',water:'水',star:'星',evil:'邪',other:'异',void:'虚',any:'任意'};
const categoryNames={basic:'基础牌',forbidden:'禁咒牌',bounty:'悬赏牌',trick:'诡计牌',tea:'茶会牌',temple:'魔神殿牌',witch:'魔女角色卡'};
const packs={base:'基础包',trickery:'诡秘戏法',otherworld:'异界来客','final-abyss':'终末深渊','higher-battlefield':'高维战场'};
const assets=new Map();
async function copyAsset(url){
  if(!url?.startsWith('/')||url.startsWith('//'))throw Error(`Not a local game asset: ${url}`);
  const clean=url.split('?')[0];
  const source=path.resolve(gameRoot,'apps/web/public','.'+clean);
  const allowed=path.resolve(gameRoot,'apps/web/public')+path.sep;
  if(!source.startsWith(allowed))throw Error('Unsafe asset path');
  const bytes=await fs.readFile(source),sha256=hash(bytes),fingerprint=new URL(url,'https://game.invalid').searchParams.get('v');
  if(fingerprint&&!sha256.startsWith(fingerprint))throw Error(`Local image differs from release manifest: ${url}`);
  const target='/game'+clean;
  if(!assets.has(target)){
    const destination=path.resolve('public','.'+target);
    await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,bytes);
    assets.set(target,{path:target,source:clean,sha256,bytes:bytes.length});
  }
  return target+(fingerprint?`?v=${fingerprint}`:'');
}
const cards=[],used=new Set(),mapping=[];
for(const {card:c,pack} of catalog.cards){
  const categoryId=c.type==='character'?'witch':c.type;
  const candidates=old.filter(o=>o.gameId===c.id||o.categoryId===categoryId&&norm(o.name)===norm(c.name));
  let previous=candidates.length===1?candidates[0]:old.find(o=>o.id===reviewedReplacements[c.id]);
  if(!previous&&!c.attachment)throw Error(`No reviewed legacy route: ${c.id} ${c.name}`);
  const id=previous?.id||c.id;if(used.has(id))throw Error(`Duplicate route: ${id}`);used.add(id);
  const art=(c.artId&&revisions[c.artId])||artwork[c.id];if(!art&&!templeArt[c.id])throw Error(`Missing current artwork: ${c.id}`);
  const source=sourceCards.find(x=>x.id===c.id),fields=source?.fields||{};
  const effectTypes=[];
  if(c.magicType==='即时魔法'||/打出时/.test(c.description))effectTypes.push('即时效果');
  if(/每当|每次|持续|当你/.test(c.description))effectTypes.push('持续效果');
  if(/行动[:：]|主动/.test(c.description))effectTypes.push('行动');
  if(/任务[:：]/.test(c.description))effectTypes.push('任务');
  if(/终局[:：]|终局计分/.test(c.description))effectTypes.push('终局');
  if(/献祭[:：]|献祭时/.test(c.description))effectTypes.push('献祭效果');
  const tag={forbidden:'禁咒',trick:'诡计',bounty:'悬赏',tea:'茶会',witch:'角色'}[categoryId];if(tag)effectTypes.push(tag);
  const entry={id,gameId:c.id,name:c.name,nameRaw:c.name,categoryId,category:categoryNames[categoryId],catalogVersion:2,
    legacyName:previous&&previous.name!==c.name?previous.name:previous?.legacyName||null,
    cardType:c.magicType||categoryNames[categoryId],cost:c.cost,prerequisite:c.requirement,
    attribute:Object.entries(c.attributes).map(([key,count])=>`${count>1?count:''}${attributes[key]||key}`).join('／'),
    score:c.scoreText??null,effect:c.description,active:c.abilities?.active||'',passive:c.abilities?.passive||'',
    detail:'',notes:c.notes||'',annotations:'',flavor:String(fields['卡牌描述']||fields['禁咒牌描述']||''),
    debuffFlag:c.debuff??null,piercingFlag:c.pierceShield??null,effectTypes,expansion:packs[pack],pack,attachment:c.attachment||false,
    ...(art?{image:await copyAsset(art.full),thumbnail:await copyAsset(art.thumb),imageWidth:art.width,imageHeight:art.height,
      ...(art.fullAvif?{imageAvif:await copyAsset(art.fullAvif)}:{})}:{image:null,templeArt:Object.fromEntries(await Promise.all(Object.entries(templeArt[c.id]).map(async([level,a])=>[level,{...a,src:await copyAsset(a.src)}])))}),
    tea:c.tea?{global:c.tea.effect,host:c.tea.hostEffect,ranking:c.tea.rewards,players:c.tea.matchup}:null,
    temple:c.templeLevels?{levels:c.templeLevels.map(l=>({level:l.level,label:l.label,reward:l.effect}))}:null,
    trick:c.trick?{trigger:c.trick.condition,effect:c.trick.effect,score:c.scoreText}:null,
    bounty:c.bounty?{condition:c.bounty.condition,reward:c.bounty.reward}:null,reward:c.bounty?.reward||c.tea?.rewards||'',
    sourceVersion:catalog.contentVersion,game:c};
  cards.push(entry);mapping.push({atlasId:id,gameId:c.id,name:c.name,previousName:previous?.name||null,artKey:c.artId||c.id});
}
const articles=[];
for(const page of rulebook.pages){
  const blocks=[];
  for(const [i,b] of page.blocks.entries()){
    const block={...b,id:`p${page.number}-b${i}`};
    if(b.type==='image')block.src=await copyAsset(b.src);
    if(b.type==='icons')block.items=await Promise.all(b.items.map(async x=>({...x,src:await copyAsset(x.src)})));
    blocks.push(block);
  }
  articles.push({id:`rule-page-${page.number}`,kind:'rule',title:page.title,summary:page.section,order:page.number,blocks});
}
await fs.mkdir('backups',{recursive:true});
await fs.copyFile('data/cards.json',`backups/cards-before-import-${Date.now()}.json`);
await fs.writeFile('data/cards.json',JSON.stringify(cards,null,2)+'\n');
await fs.writeFile('data/rule-articles.json',JSON.stringify(articles,null,2)+'\n');
await fs.writeFile('data/game-catalog.json',JSON.stringify(catalog,null,2)+'\n');
const manifest={version:rulebook.version,contentVersion:catalog.contentVersion,release,source:'https://witchwildhunt.top/api/v1/catalog',importedAt:new Date().toISOString(),cardCount:cards.length,mainCardCount:cards.filter(c=>!c.attachment).length,accessoryCount:cards.filter(c=>c.attachment).length,rulePages:articles.length,assets:[...assets.values()],mapping};
await fs.writeFile('data/game-source.json',JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile('data/game-edition.json',JSON.stringify({version:manifest.version,contentVersion:manifest.contentVersion,cardCount:manifest.cardCount,mainCardCount:manifest.mainCardCount,accessoryCount:manifest.accessoryCount,rulePages:manifest.rulePages},null,2)+'\n');
console.log(JSON.stringify({version:manifest.version,cards:cards.length,main:manifest.mainCardCount,accessories:manifest.accessoryCount,rulePages:articles.length,assets:assets.size,assetBytes:[...assets.values()].reduce((s,x)=>s+x.bytes,0)}));
