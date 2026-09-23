'use client';
import {useEffect,useState} from 'react';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Card,seedCards,CATALOG_VERSION} from '@/lib/cards';
import Editor from './editor';
import ArticleEditor from './article-editor';
import SettingsEditor from './settings-editor';
export default function Workspace({emailMode}:{emailMode:boolean}){
 const [tab,setTab]=useState('cards'),[visited,setVisited]=useState(['cards']),[cards,setCards]=useState<Card[]>(seedCards),[error,setError]=useState('');
 useEffect(()=>{fetch('/api/cards',{cache:'no-store'}).then(r=>r.json()).then((j:any)=>{if(j.catalogVersion===CATALOG_VERSION&&j.cards)setCards(j.cards)}).catch(()=>{})},[tab]);
 async function logout(){try{const r=await fetch('/api/auth/logout',{method:'POST'});if(!r.ok)throw new Error();location.assign('/admin')}catch{setError('退出失败，请稍后重试。')}}
 return <><div className="article-toolbar"><div><p className="eyebrow">THE KEEPER'S DESK</p><h2>档案工作台</h2></div>{emailMode?<button className="outline-button" onClick={logout}>退出登录</button>:<a className="outline-button" href="/signout-with-chatgpt?return_to=%2Fadmin" target="_top">退出登录</a>}</div>{error&&<p className="notice" role="alert">{error}</p>}<Tabs value={tab} onValueChange={v=>{setTab(v);setVisited(all=>all.includes(v)?all:[...all,v])}}><TabsList className="admin-section-tabs">{[['cards','卡牌档案'],['rule','规则文章'],['world','世界观文章'],['character','角色文章'],['settings','展示参数']].map(([id,n])=><TabsTrigger value={id} key={id}>{n}</TabsTrigger>)}</TabsList>{visited.map(id=><TabsContent forceMount value={id} className="admin-panel" key={id}>{id==='cards'?<Editor/>:id==='settings'?<SettingsEditor/>:<ArticleEditor kind={id as 'rule'|'world'|'character'} characters={cards.filter(c=>c.categoryId==='witch')}/>}</TabsContent>)}</Tabs></>;
}
