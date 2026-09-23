import {adminUser,guard,database,noCache,ensureCatalog,publicCards} from '@/lib/store';
import {getContent,articleSchema,settingsSchema} from '@/lib/content-store';
import {CATALOG_VERSION} from '@/lib/cards';
export async function GET(){if(!await adminUser())return Response.json({error:'无编辑权限'},{status:403,headers:noCache});try{return Response.json(await getContent(true),{headers:noCache})}catch{return Response.json({error:'无法读取文章和草稿。'},{status:503,headers:noCache})}}
export async function POST(request:Request){
  const denied=await guard(request);if(denied)return denied;
  try{
    if(Number(request.headers.get('content-length')||0)>1000000)return Response.json({error:'文章内容过长。'},{status:413});
    const raw=await request.text();if(raw.length>1000000)return Response.json({error:'文章内容过长。'},{status:413});
    const {item,action,revision,kind,catalogVersion}=JSON.parse(raw);
    if(kind==='character'&&catalogVersion!==CATALOG_VERSION)return Response.json({error:'卡牌编号已更新，请刷新页面后再编辑。'},{status:409,headers:noCache});
    await ensureCatalog();
    if(!['save','publish'].includes(action)||!Number.isInteger(revision)||revision<0)throw new Error();
    const isSettings=kind==='settings';const clean:any=isSettings?settingsSchema.parse(item):articleSchema.parse(item);
    if(!isSettings&&kind!==clean.kind)throw new Error();
    if(!isSettings&&clean.kind==='character'&&!(await publicCards()).some(c=>c.id===clean.characterId&&c.categoryId==='witch'))throw new Error();
    const id=isSettings?'display-settings':clean.id||`article-${crypto.randomUUID()}`;if(!isSettings){if(id==='display-settings')throw new Error();clean.id=id;}
    const db=database();const row=await db.prepare('SELECT revision,published FROM site_content WHERE id=?').bind(id).first<any>();
    if((row?.revision||0)!==revision)return Response.json({error:'内容已在其他窗口更新。请先载入最新草稿。'},{status:409,headers:noCache});
    const json=JSON.stringify(clean),published=action==='publish'?json:row?.published||null,now=new Date().toISOString();
    const result=row?await db.prepare('UPDATE site_content SET kind=?,draft=?,published=?,revision=revision+1,updated_at=?,write_epoch=write_epoch+1 WHERE id=? AND revision=?').bind(isSettings?'settings':clean.kind,json,published,now,id,revision).run():await db.prepare('INSERT OR IGNORE INTO site_content(id,kind,draft,published,revision,updated_at,write_epoch) VALUES(?,?,?,?,1,?,1)').bind(id,isSettings?'settings':clean.kind,json,published,now).run();
    if(!result.meta.changes)return Response.json({error:'内容已更新，请先载入最新草稿。'},{status:409,headers:noCache});
    return Response.json({item:{...clean,revision:revision+1,hasDraft:json!==published,published:!!published},message:action==='publish'?'已发布，所有访客可见。':'草稿已保存。'},{headers:noCache});
  }catch{return Response.json({error:'保存失败，请检查必填内容、图片和参数范围。修改仍保留在本页。'},{status:400,headers:noCache})}
}
