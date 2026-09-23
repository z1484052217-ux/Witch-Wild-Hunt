'use client';
import {ArrowUpRight} from 'lucide-react';
import {Card,cardAttribute,categoryName} from '@/lib/cards';
import {CardFace,Specialty} from './card-components';
import {useSiteContent} from './site-provider';
export default function SpecialEntry({card:c,index,onOpen}:{card:Card;index:number;onOpen:()=>void}){
 const {settings}=useSiteContent();
 return <article className={`special-card ${c.categoryId}`} style={{'--preview-width':`${settings.formats[c.categoryId]?.previewWidth||150}px`} as React.CSSProperties}>
  <button className="side-art" onClick={onOpen} aria-label={`放大${c.name}卡图`}><CardFace card={c}/><span>查看完整卡牌</span></button>
  <div className="special-card-copy"><button className="special-title" onClick={onOpen}><span><small>{c.categoryId==='bounty'?`${String(index+1).padStart(2,'0')} · ${c.bounty?.difficulty||'需结合局面'}`:categoryName(c.categoryId)}</small><h2>{c.name}</h2></span><ArrowUpRight size={19}/></button>
  {c.categoryId==='witch'?<><div className="badges"><span>{cardAttribute(c)||'属性待补'}</span></div><div className="witch-quick"><h3>主动技能</h3><p>{c.active||'未标注'}</p><h3>被动技能</h3><p>{c.passive||'未标注'}</p></div><a className="text-link" href={`/characters/${c.id}`}>进入角色档案 <ArrowUpRight size={14}/></a></>:<Specialty card={c}/>}</div>
 </article>;
}
