import {adminUser,draftCards,database,guard,validatedCard,noCache,ensureCatalog,displayCard} from '@/lib/store';
import {seedCards,CATALOG_VERSION,Card} from '@/lib/cards';
import {insertNumberedCard} from '@/lib/catalog-migration';
export async function GET(){if(!await adminUser())return Response.json({error:'无编辑权限'},{status:403});try{return Response.json({cards:await draftCards(),catalogVersion:CATALOG_VERSION},{headers:noCache})}catch(e){console.error(e);return Response.json({error:'无法读取草稿，请稍后重试。'},{status:503})}}
export async function POST(request:Request){
 const denied=await guard(request);if(denied)return denied;
 try{
  if(Number(request.headers.get('content-length')||0)>180000)return Response.json({error:'卡牌内容过长'},{status:413});
  const raw=await request.text();if(raw.length>180000)return Response.json({error:'卡牌内容过长'},{status:413});
  const {card,revision,action,catalogVersion}=JSON.parse(raw);
  if(catalogVersion!==CATALOG_VERSION)return Response.json({error:'卡牌编号已更新，请刷新页面后再编辑，避免覆盖其他卡牌。'},{status:409,headers:noCache});
  if(!['save','publish'].includes(action)||!Number.isInteger(revision)||revision<0)return Response.json({error:'无效的保存请求'},{status:400});
  await ensureCatalog();const db=database(),now=new Date().toISOString();
  let clean:Card,published:string|null,seed:Card|undefined;
  if(!card.id){
   if(revision!==0)return Response.json({error:'新卡牌的版本无效。'},{status:409});
   clean=validatedCard({...card,id:''});
   const inserted=await insertNumberedCard(db,clean.categoryId,seedCards.filter(c=>c.categoryId===clean.categoryId).length,clean,action==='publish',now);
   if(!inserted)throw new Error('Unable to allocate card number');
   clean=displayCard(JSON.parse(inserted.draft));published=inserted.published;
  }else{
   const row=await db.prepare('SELECT draft,published,revision FROM card_edits WHERE id=?').bind(card.id).first<any>();
   seed=seedCards.find(c=>c.id===card.id);const original=row?JSON.parse(row.draft):seed;
   if(!original)return Response.json({error:'这张卡牌的编号不存在，请刷新后重新选择。'},{status:409});
   if((row?.revision||0)!==revision)return Response.json({error:'这张卡牌已在其他窗口更新。请重新加载后再编辑。'},{status:409});
   clean=validatedCard(card,original);const json=JSON.stringify(clean);published=action==='publish'?json:row?.published||null;
   const result=row?await db.prepare('UPDATE card_edits SET draft=?,published=?,revision=revision+1,updated_at=?,write_epoch=write_epoch+1 WHERE id=? AND revision=?').bind(json,published,now,card.id,revision).run():await db.prepare('INSERT OR IGNORE INTO card_edits(id,draft,published,revision,updated_at,write_epoch) VALUES(?,?,?,1,?,1)').bind(card.id,json,published,now).run();
   if(!result.meta.changes)return Response.json({error:'资料已被更新，请重新加载。'},{status:409});
  }
  const normalizedPublished=published?displayCard(JSON.parse(published)):null;
  return Response.json({card:{...clean,revision:revision+1,hasDraft:!normalizedPublished||JSON.stringify(normalizedPublished)!==JSON.stringify(clean),published:!!published||!!seed,updatedAt:now},message:action==='publish'?'已发布，所有访客现在可见。':'草稿已保存，访客看到的内容未变化。'},{headers:noCache});
 }catch(e){console.error('Card save failed',e);return Response.json({error:e instanceof Error&&e.name==='ZodError'?'请检查卡牌名称、类别、字段长度、扩展包和图片格式。':'保存未成功，编辑内容仍保留，请稍后重试。'},{status:400})}
}
