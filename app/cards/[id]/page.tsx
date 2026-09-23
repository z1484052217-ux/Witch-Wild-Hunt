import Atlas from '../../atlas';
export default async function CardPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <Atlas initialId={id} mode="detail"/>}
