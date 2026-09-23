import type { Metadata } from 'next';
import './globals.css';
import './finishes.css';
import SiteProvider from './site-provider';
export const metadata: Metadata={ title:'魔女：狂猎 · 卡牌图鉴', description:'探索魔女狂猎 V4 全卡牌、规则与魔女角色档案。', icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body><SiteProvider>{children}</SiteProvider></body></html>}
