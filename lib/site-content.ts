import rules from '@/data/rule-sections.json';
import world from '@/data/world-sections.json';
export type ArticleKind = 'rule' | 'world' | 'character';
export type ArticleBlock = {id:string;type:'paragraph'|'heading'|'image';text?:string;url?:string;caption?:string};
export type Article = {id:string;kind:ArticleKind;title:string;summary:string;blocks:ArticleBlock[];order:number;characterId?:string;revision?:number;hasDraft?:boolean;published?:boolean};
export type CardFormat = {height:number;width:number;radius:number;previewWidth:number};
export type DisplaySettings = {formats:Record<string,CardFormat>;motion:boolean;glow:number;fog:number};
export const defaultSettings:DisplaySettings = {motion:true,glow:65,fog:55,formats:{
  basic:{height:88,width:63,radius:4.5,previewWidth:150}, forbidden:{height:88,width:63,radius:4.5,previewWidth:150},
  trick:{height:88,width:63,radius:4.5,previewWidth:145}, bounty:{height:52,width:43,radius:5,previewWidth:145},
  tea:{height:122.5,width:63,radius:4,previewWidth:150}, temple:{height:172,width:59.5,radius:3.5,previewWidth:180},
  witch:{height:145,width:83,radius:4,previewWidth:150}
}};
const fromSections = (sections:any[],kind:ArticleKind):Article[] => sections.map((s,i)=>({
  id:`${kind}-${s.id}`,kind,title:s.title,summary:s.summary||'',order:i,
  blocks:(s.paragraphs||[]).map((text:string,j:number)=>({id:`p${j}`,type:'paragraph',text}))
}));
export const initialArticles:Article[]=[...fromSections(rules,'rule'),...fromSections(world,'world')];
export function newArticle(kind:ArticleKind,order=0):Article{return {id:'',kind,title:'',summary:'',order,blocks:[{id:crypto.randomUUID(),type:'paragraph',text:''}],revision:0,published:false};}
