import seed from '@/data/cards.json';
export type Card={id:string;name:string;categoryId:string;[key:string]:any};
export const seedCards=seed as Card[];
export const categories=[['basic','基础牌'],['forbidden','禁咒牌'],['trick','诡计牌'],['bounty','悬赏牌'],['tea','茶会牌'],['temple','魔神殿牌'],['witch','魔女角色卡']];
export const CATALOG_VERSION=2;
export const effects=['即时效果','持续效果','行动','任务','终局','献祭效果','禁咒','诡计','悬赏','茶会','角色'] as const;
export const expansions=['基础包','扩展1','扩展2','扩展3','扩展4'] as const;
export const categoryEffect:Record<string,string>={forbidden:'禁咒',trick:'诡计',bounty:'悬赏',tea:'茶会',witch:'角色'};
export const archiveSource=(type:string,number:string)=>`寰宇智识院·第4宇宙泡·坐标377-3-1189-7-90·玛纳海姆·${type}·${number}`;
export const cardSource=(c:Card)=>archiveSource(categoryName(c.categoryId),c.id);
export const fieldLabels={cardType:'卡牌类型',cost:'魔晶费用',attribute:'属性',prerequisite:'前置条件',score:'固定分',actionCount:'行动次数',faceColor:'牌面色',debuffFlag:'减益标记',piercingFlag:'护盾穿透',expansion:'扩展包所属'};
export type CardField=keyof typeof fieldLabels;
const fieldsByCategory:Record<string,CardField[]>={
 basic:['cardType','cost','attribute','prerequisite','score','actionCount','faceColor','debuffFlag','piercingFlag'],
 forbidden:['cardType','actionCount','faceColor','debuffFlag','piercingFlag'],
 trick:['score','debuffFlag','piercingFlag'], bounty:['debuffFlag','piercingFlag'], tea:[], temple:[],
 witch:['attribute','expansion','debuffFlag','piercingFlag']
};
export const cardFields=(categoryId:string)=>fieldsByCategory[categoryId]||fieldsByCategory.basic;
export function cardFieldValue(c:Card,key:CardField){
 if(key==='cardType')return c.cardType||categoryName(c.categoryId);
 if(key==='attribute')return cardAttribute(c);
 if(key==='prerequisite')return c.prerequisite||'无前置条件';
 if(key==='faceColor')return ({green:'绿色',blue:'蓝色',gold:'金色',purple:'紫色'} as Record<string,string>)[c.faceColor]||c.faceColor;
 if(key==='debuffFlag'||key==='piercingFlag')return flagValue(c[key]);
 if(key==='actionCount')return c.actionCount??(c.effectTypes?.includes('行动')?'1次 / 时代（通则）':'未标注');
 return c[key];
}
export const categoryName=(id:string)=>categories.find(x=>x[0]===id)?.[1]||id;
export const textValue=(v:any,fallback='未标注')=>v===null||v===undefined||v===''?fallback:String(v);
export const flagValue=(v:any)=>v===true?'有':v===false?'无':'未标注';
export const cardAttribute=(c:Card)=>String(c.attribute||c.witch?.attribute||'').trim();
export const freeSlot=(c:Card)=>/不占[用据]?.{0,5}禁咒区/.test(c.effect||'');
export function searchText(c:Card){return [c.name,c.effect,c.active,c.passive,c.flavor,c.detail,c.prerequisite,JSON.stringify(c.temple||''),c.notes].filter(Boolean).join(' ').toLowerCase()}
export function newCard(categoryId='basic'):Card{return {id:'',name:'',categoryId,category:categoryName(categoryId),cardType:'',cost:null,attribute:'',score:null,prerequisite:'',effect:'',flavor:'',image:null,expansion:null,catalogVersion:CATALOG_VERSION,effectTypes:categoryEffect[categoryId]?[categoryEffect[categoryId]]:[],debuffFlag:null,piercingFlag:null,actionCount:null,faceColor:null,notes:'',annotations:'',active:'',passive:'',detail:'',background:'',accessories:'',designerNotes:'',trick:{trigger:'',effect:'',karma:null,score:null},tea:{global:'',host:'',ranking:'',discard:'',players:''},temple:{offering:'',levels:Array.from({length:8},(_,i)=>({level:i+1,reward:'',label:`第${i+1}层`}))},bounty:{condition:'',reward:'6VP + 1禁咒',difficulty:'需结合局面'}}}
export function canonicalCard(c:Card):Card{
 const x={...c};x.name=x.name.trim();x.category=categoryName(x.categoryId);x.catalogVersion=CATALOG_VERSION;x.sourceLabel=cardSource(x);
 if(x.categoryId==='witch'){x.witch={...x.witch,attribute:x.attribute||x.witch?.attribute||'',active:x.active,passive:x.passive,detail:x.detail};}
 if(x.categoryId==='trick'&&x.trick){x.effect=[x.trick.trigger,x.trick.effect].filter(Boolean).join('\n\n');x.score=x.trick.score;}
 if(x.categoryId==='tea'&&x.tea){x.effect=[x.tea.global,x.tea.host?`举办人：${x.tea.host}`:'',x.tea.discard?`弃置条件：${x.tea.discard}`:''].filter(Boolean).join('\n');x.reward=x.tea.ranking;x.playerCountRules=x.tea.players;}
 if(x.categoryId==='bounty'&&x.bounty){x.effect=x.bounty.condition;x.reward=x.bounty.reward;}
 return x;
}
