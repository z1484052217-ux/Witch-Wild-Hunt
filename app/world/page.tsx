'use client';
import {ArrowUpRight} from 'lucide-react';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Header,Footer} from '../chrome';
import {seedCards,cardAttribute} from '@/lib/cards';
import {useSiteContent} from '../site-provider';
import {CardFace} from '../card-components';
import ArticleContent from '../article-content';
export default function World(){
 const {articles}=useSiteContent();const cards=seedCards.filter(c=>c.categoryId==='witch');
 return <div className="atlas-shell world-shell"><Header active="world"/><main className="main"><div className="page-intro"><div><p className="eyebrow">CHRONICLES OF MANAHEIM</p><h1>角色与世界观<span>Chronicles</span></h1><p className="muted">世界树渐渐衰竭，魔女们的故事仍在续写。</p></div></div><Tabs defaultValue="witches"><TabsList className="world-tabs"><TabsTrigger value="witches">魔女档案 · {cards.length}</TabsTrigger><TabsTrigger value="lore">玛纳海姆</TabsTrigger></TabsList><TabsContent value="witches"><div className="witch-grid">{cards.map((c,i)=><a className="witch-portrait" href={'/characters/'+c.id} key={c.id}><CardFace card={c}/><div><div className="witch-number">{String(i+1).padStart(2,'0')}</div><span className="eyebrow">{cardAttribute(c)||'属性待补'}</span><h2>{c.name}</h2><p>{c.active||c.passive||'技能档案待补'}</p><span className="text-link">查看角色档案 <ArrowUpRight size={15}/></span></div></a>)}</div></TabsContent><TabsContent value="lore"><div className="lore-lead"><p className="eyebrow">MANAHEIM · 世界档案</p><h2>当盖亚陷入沉睡</h2><p>残党密谋肆虐，世界深陷毁灭的轮回。文明的湮灭、秩序的存续与权力的更迭，交由魔女们决定。</p><span className="help">原创氛围插画</span></div><div className="lore-grid">{articles.filter(a=>a.kind==='world').map((a,i)=><section key={a.id}><span className="eyebrow">{String(i+1).padStart(2,'0')}</span><ArticleContent article={a}/></section>)}</div></TabsContent></Tabs></main><Footer/></div>
}

