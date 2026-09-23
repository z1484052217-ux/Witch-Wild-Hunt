import {getContent} from '@/lib/content-store';
export async function GET(){try{return Response.json(await getContent(),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'文章资料暂不可用。'},{status:503,headers:{'Cache-Control':'no-store'}})}}
