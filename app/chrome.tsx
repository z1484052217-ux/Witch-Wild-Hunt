'use client';
import {Sparkles,LockKeyhole} from 'lucide-react';
export function Header({active='cards'}:{active?:string}){return <header className="topbar"><a className="brand" href="/"><Sparkles/><span>魔女：狂猎<small>WITCH · WILD HUNT</small></span></a><nav aria-label="主要导航"><a className={active==='cards'?'active':''} href="/">卡牌图鉴</a><a className={active==='rules'?'active':''} href="/rules">规则中枢</a><a className={active==='world'?'active':''} href="/world">角色与世界观</a></nav><a className="admin-link" href="/admin"><LockKeyhole size={15}/>管理员入口</a></header>}
export function Footer(){return <footer><span>魔女：狂猎</span><span>V4 · 玛纳海姆档案馆</span><a href="/rules">规则与卡牌原文</a></footer>}
