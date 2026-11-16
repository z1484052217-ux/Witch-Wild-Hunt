import Atlas from '../../atlas';
import {seedCards} from '@/lib/cards';
export const dynamicParams=false;
export function generateStaticParams(){return seedCards.map(card=>({id:card.id}));}
export default async function CardPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <Atlas initialId={id} mode="detail"/>}
