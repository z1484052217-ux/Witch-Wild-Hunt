import {z} from 'zod';
import {database,ensureCatalog} from './store';
import {Article,defaultSettings,initialArticles} from './site-content';
import {categories,CATALOG_VERSION} from './cards';
const image=z.string().regex(/^\/(?:api\/images\/[a-z0-9-]+\.(?:png|jpg|webp|gif)|rules\/image\d+\.(?:png|jpg))$/);
export const articleSchema=z.object({id:z.string().regex(/^[a-z0-9-]{0,90}$/),kind:z.enum(['rule','world','character']),title:z.string().trim().min(1).max(120),summary:z.string().max(2000),order:z.number().int().min(0).max(9999),characterId:z.string().regex(/^[a-z0-9-]{1,90}$/).optional(),blocks:z.array(z.discriminatedUnion('type',[
  z.object({id:z.string().max(90),type:z.literal('paragraph'),text:z.string().max(25000)}),
  z.object({id:z.string().max(90),type:z.literal('heading'),text:z.string().max(200)}),
  z.object({id:z.string().max(90),type:z.literal('image'),url:image,caption:z.string().max(1000).optional()})
])).max(120)}).refine(a=>a.kind!=='character'||!!a.characterId,{message:'请选择所属角色'});
const format=z.object({height:z.number().min(10).max(500),width:z.number().min(10).max(400),radius:z.number().min(0).max(20),previewWidth:z.number().min(80).max(320)});
export const settingsSchema=z.object({formats:z.record(format),motion:z.boolean(),glow:z.number().min(0).max(100),fog:z.number().min(0).max(100)}).refine(s=>categories.every(([id])=>s.formats[id]),{message:'请填写七类卡牌尺寸'});
export async function getContent(drafts=false){
  await ensureCatalog();
  const rows=await database().prepare('SELECT id,kind,draft,published,revision FROM site_content').all<any>();
  const articles=new Map(initialArticles.map(a=>[a.id,{...a,revision:0,hasDraft:false,published:true}]));
  let settings:any=defaultSettings,settingsRevision=0,settingsHasDraft=false;
  for(const row of rows.results){
    const text=drafts?row.draft:row.published;if(!text)continue;const value=JSON.parse(text);
    if(row.id==='display-settings'){settings=value;settingsRevision=row.revision;settingsHasDraft=row.draft!==row.published;}
    else articles.set(row.id,{...value,...(drafts?{revision:row.revision,hasDraft:row.draft!==row.published,published:!!row.published||initialArticles.some(a=>a.id===row.id)}:{})});
  }
  return {catalogVersion:CATALOG_VERSION,articles:Array.from(articles.values()).sort((a,b)=>a.order-b.order),settings,...(drafts?{settingsRevision,settingsHasDraft}:{})};
}
