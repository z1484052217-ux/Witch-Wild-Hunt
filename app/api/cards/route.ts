import {publicCards,noCache} from '@/lib/store';
import {CATALOG_VERSION} from '@/lib/cards';
export async function GET(){try{return Response.json({cards:await publicCards(),catalogVersion:CATALOG_VERSION}, {headers:noCache})}catch(e){console.error('Public card load failed',e);return Response.json({error:'最新资料暂时无法加载，请稍后重试。'},{status:503,headers:noCache})}}
