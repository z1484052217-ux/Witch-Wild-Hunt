'use client';
import {useState} from 'react';
import {Search,BookOpen} from 'lucide-react';
import {Header,Footer} from '../chrome';
import {useSiteContent} from '../site-provider';
import ArticleContent from '../article-content';
import {archiveSource} from '@/lib/cards';
export default function Rules(){
 const {articles,error}=useSiteContent(),[query,setQuery]=useState(''),[selected,setSelected]=useState('rule-setup');
 const sections=articles.filter(a=>a.kind==='rule');const filtered=sections.filter(s=>[s.title,s.summary,...s.blocks.map(b=>b.text||b.caption||'')].join(' ').includes(query));const active=filtered.find(x=>x.id===selected)||filtered[0];
 return <div className="atlas-shell"><Header active="rules"/><main className="main"><div className="page-intro"><div><p className="eyebrow">THE BOOK OF LAWS <span>／ V4</span></p><h1>规则中枢<span>Rulebook</span></h1><p className="muted">从开局到终局，查阅玛纳海姆的法则。</p></div><div className="edition"><BookOpen size={36}/><span>2–5人 · 90–240分钟</span></div></div>{error&&<p role="alert" className="notice">{error}</p>}<div className="rules-layout"><aside><label className="search"><Search size={17}/><input aria-label="搜索规则" placeholder="搜索规则关键词…" value={query} onChange={e=>setQuery(e.target.value)}/></label><nav aria-label="规则目录">{filtered.map(s=><button className={active?.id===s.id?'selected':''} key={s.id} onClick={()=>setSelected(s.id)}>{s.title}</button>)}</nav></aside><article className="rule-article">{active?<><p className="eyebrow">规则索引 / {String(sections.indexOf(active)+1).padStart(2,'0')}</p><ArticleContent article={active}/><div className="rule-source">{archiveSource('规则中枢',String(sections.indexOf(active)+1).padStart(4,'0'))}</div></>:<div className="empty-state">未找到对应规则。<button onClick={()=>setQuery('')}>清除搜索</button></div>}</article></div></main><Footer/></div>
}
