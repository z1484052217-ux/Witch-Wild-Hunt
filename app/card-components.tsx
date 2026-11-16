'use client';
import {Sparkles,ArrowUpRight,Flame,Leaf,Droplets,Star,Moon,Orbit,Hexagon} from 'lucide-react';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import {Card,categoryName,textValue,flagValue,cardAttribute,freeSlot,cardFields,cardFieldValue,fieldLabels,cardSource} from '@/lib/cards';
import {useSiteContent} from './site-provider';
import {CardFormat} from '@/lib/site-content';
import ArticleContent from './article-content';
export function CardFace({card:c,large=false,format}:{card:Card;large?:boolean;format?:CardFormat}){
 const {settings}=useSiteContent();const f=format||settings.formats[c.categoryId]||settings.formats.basic;
 const ratio=c.imageWidth&&c.imageHeight?c.imageWidth/c.imageHeight:f.width/f.height;
 return <div className={'card-face'+(large?' large-face':'')+(c.image?' has-image':'')+(c.templeArt?' temple-face':'')} data-attribute={cardAttribute(c).replace(/^2/,'')} style={{aspectRatio:ratio,borderRadius:f.radius,'--card-ratio':ratio} as React.CSSProperties}>
 {c.image?<picture>{large&&c.imageAvif&&<source srcSet={c.imageAvif} type="image/avif"/>}<img className="uploaded-card" src={large?c.image:c.thumbnail||c.image} alt={c.name+'完整卡图'} width={c.imageWidth} height={c.imageHeight} loading={large?'eager':'lazy'} decoding="async"/></picture>:c.templeArt?<><strong className="temple-face-title">{c.name}</strong><div className="temple-stack">{[...(c.temple?.levels||[])].reverse().map((layer:any)=><div className="temple-layer" key={layer.level}><b>{layer.level===8?'8+':layer.level}</b>{c.templeArt[layer.level]?<img src={c.templeArt[layer.level].src} alt={c.name+'第'+layer.level+'层效果图'} loading="lazy"/>:<span>{layer.reward}</span>}</div>)}</div></>:<div className="card-placeholder"><Sparkles size={large?65:37}/><span>卡图待补</span><strong>{c.name}</strong></div>}
 </div>;
}
export function Tile({card:c,onClick}:{card:Card;onClick:()=>void}){return <button className="card-tile" onClick={onClick} aria-label={`查看${c.name}`}><CardFace card={c}/><div className="tile-caption"><span>{c.name}</span><ArrowUpRight size={15}/></div><p className="tile-meta">{c.cardType||categoryName(c.categoryId)}<i/>{cardAttribute(c)||'特殊卡牌'}</p>{c.categoryId==='forbidden'&&<div className="badges"><span>免费打出</span><span>{freeSlot(c)?'不占用禁咒区':'占禁咒区'}</span></div>}</button>}
export function Blocks({items}:{items:[string,any][]}){return <div className="info-blocks">{items.map(([title,value])=><section key={title}><h3>{title}</h3><p className="preserve">{textValue(value)}</p></section>)}</div>}
export function TempleTable({card:c}:{card:Card}){return <div className="temple-table"><Table><TableHeader><TableRow><TableHead>层数</TableHead><TableHead>奖励 / 效果</TableHead></TableRow></TableHeader><TableBody>{(c.temple?.levels||[]).map((l:any)=><TableRow key={l.level}><TableCell><b>{l.level===8?'8+':l.level}</b><small>{l.label}</small></TableCell><TableCell>{l.reward}</TableCell></TableRow>)}</TableBody></Table><a href="/rules/" className="text-link">查阅供奉与终局计分规则 →</a></div>}
export function Specialty({card:c}:{card:Card}){if(c.categoryId==='trick')return <Blocks items={[["触发条件",c.trick?.trigger||c.effect],["生效效果",c.trick?.effect],["业力",c.trick?.karmaText||c.trick?.karma],["生效分数",c.trick?.score??c.score]]}/>;if(c.categoryId==='tea')return <><Blocks items={[["全局效果",c.tea?.global],["举办人增益",c.tea?.host],["排名奖励",c.tea?.ranking],["弃置条件",c.tea?.discard||'未标注特殊弃置条件']]}/><div className="players-note"><strong>玩家人数与奖励</strong><p className="preserve">{textValue(c.tea?.players||c.playerCountRules,'原牌未标注人数调整，按牌面执行。')}</p></div></>;if(c.categoryId==='temple')return <TempleTable card={c}/>;if(c.categoryId==='bounty')return <Blocks items={[["达成条件",c.bounty?.condition||c.effect],["领取奖励",c.reward||'6VP + 1禁咒']]}/>;return null;}
export function CardDetails({card:c,character=false}:{card:Card;character?:boolean}){
 const {articles}=useSiteContent();const fields=cardFields(c.categoryId),isCharacter=character||c.categoryId==='witch';
 return <div className="detail-copy"><p className="eyebrow">{categoryName(c.categoryId)} <span>／ {c.gameId||c.id}</span></p><h1>{c.name}</h1>
 <div className="badges">{(c.effectTypes||[]).map((x:string)=><span key={x}>{x}</span>)}{c.categoryId==='forbidden'&&<><span>免费打出</span><span>{freeSlot(c)?'不占用禁咒区':'占禁咒区'}</span></>}</div>
 {isCharacter?<><p className="muted preserve">{c.nameRaw!==c.name?c.nameRaw?.split('\n').slice(1).join('\n'):cardAttribute(c)}</p><Blocks items={[["主动技能 · 原文",c.active],["被动技能 · 原文",c.passive],["技能补充",c.detail],["配件",c.accessories||'待设计者补充'],["背景故事",c.background||'档案尚未收录，待设计者补充。'],["设计者备注 · 打法定位",c.designerNotes||'待设计者补充']]}/></>:<><Specialty card={c}/>{['basic','forbidden'].includes(c.categoryId)&&<section className="effect-text"><h2>卡牌效果</h2><p className="preserve">{textValue(c.effect)}</p></section>}</>}
 {fields.length>0&&<><h2>字段速览</h2><dl className="field-grid" aria-label="字段速览">{fields.map(key=><div key={key}><dt>{fieldLabels[key]}</dt><dd>{textValue(cardFieldValue(c,key))}</dd></div>)}</dl></>}
 <Blocks items={[["卡牌描述",c.flavor||'暂无描述'],["效果备注 · FAQ",c.notes||'暂无补充说明']]}/>
 {isCharacter&&articles.filter(a=>a.kind==='character'&&a.characterId===c.id).map(a=><section className="character-article" key={a.id}><ArticleContent article={a}/></section>)}
 {c.sampleImage&&<details className="source-sample"><summary>规则书示例图</summary><img src={c.sampleImage} alt={`${c.name}规则书示例，可能含多张牌和标注`}/><p className="help">教学示例可能含多张卡牌和数字标注，效果请以本页完整文本为准。</p></details>}
 <p className="source-credit">来源：{cardSource(c)}{c.updatedAt?' · 已更新':''}</p></div>
}
