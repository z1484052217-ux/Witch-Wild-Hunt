'use client';
import {createContext,useContext,useEffect,useRef} from 'react';
import {DisplaySettings,defaultSettings,initialArticles} from '@/lib/site-content';
const publishedContent={articles:initialArticles,settings:defaultSettings};
const Context=createContext(publishedContent);
export const useSiteContent=()=>useContext(Context);
export default function SiteProvider({children}:{children:React.ReactNode}){
  return <Context.Provider value={publishedContent}><Atmosphere settings={publishedContent.settings}/>{children}</Context.Provider>;
}
function Atmosphere({settings}:{settings:DisplaySettings}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');let frame=0;
    const move=(e:PointerEvent)=>{if(media.matches||!settings.motion)return;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{ref.current?.style.setProperty('--pointer-x',`${(e.clientX/innerWidth-.5)*40}px`);ref.current?.style.setProperty('--pointer-y',`${(e.clientY/innerHeight-.5)*30}px`);document.documentElement.style.setProperty('--mouse-x',`${e.clientX}px`);document.documentElement.style.setProperty('--mouse-y',`${e.clientY}px`);});};
    addEventListener('pointermove',move,{passive:true});document.documentElement.dataset.motion=settings.motion?'on':'off';
    return()=>{removeEventListener('pointermove',move);cancelAnimationFrame(frame)};
  },[settings.motion]);
  return <div className="ambient-scene" ref={ref} aria-hidden="true" style={{'--fog':settings.fog/100,'--glow':settings.glow/100} as React.CSSProperties}><div className="ambient-landscape"/><div className="aurora aurora-one"/><div className="aurora aurora-two"/><div className="ambient-haze"/><div className="ambient-grain"/><div className="ambient-particles">{Array.from({length:18},(_,i)=><i key={i} style={{left:`${(i*47+13)%100}%`,top:`${(i*31+7)%100}%`,animationDelay:`-${i*1.7}s`,animationDuration:`${9+i%5*3}s`}}/>)}</div></div>;
}
