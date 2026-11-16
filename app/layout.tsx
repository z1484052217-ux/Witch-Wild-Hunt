import type { Metadata } from 'next';
import './globals.css';
import './finishes.css';
import './static-site.css';
import SiteProvider from './site-provider';
export const metadata: Metadata={ title:'魔女：狂猎 · 卡牌图鉴', description:'查阅魔女狂猎现行卡牌、角色、配件、完整效果与规则书。', icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body><SiteProvider>{children}</SiteProvider></body></html>}
