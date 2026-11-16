'use client';
import edition from '@/data/game-edition.json';
import {Sparkles} from 'lucide-react';
export function Header({active='cards'}:{active?:string}){return <header className="topbar"><a className="brand" href="/"><Sparkles/><span>魔女：狂猎<small>WITCH · WILD HUNT</small></span></a><nav aria-label="主要导航"><a className={active==='cards'?'active':''} href="/">卡牌图鉴</a><a className={active==='rules'?'active':''} href="/rules">规则中枢</a><a className={active==='world'?'active':''} href="/world">角色与世界观</a></nav></header>}
export function Footer(){return <footer><span>魔女：狂猎</span><span>v{edition.version} · 玛纳海姆档案馆</span><a href="/rules">规则与卡牌原文</a><a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">湘ICP备2026050381号</a></footer>}
