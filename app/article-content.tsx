import {Article} from '@/lib/site-content';
export default function ArticleContent({article,heading=true,onPage}:{article:Article;heading?:boolean;onPage?:(page:number)=>void}){
  return <div className="article-content">{heading&&<><h1>{article.title}</h1>{article.summary&&<p className="rule-summary">{article.summary}</p>}</>}{article.blocks.map(b=>{
    if(b.type==='image')return <figure key={b.id}><a href={b.src||b.url} target="_blank" rel="noreferrer" aria-label={`查看完整插图：${b.alt||b.caption||article.title}`}><img src={b.src||b.url} alt={b.alt||b.caption||article.title} width={b.width} height={b.height} loading="lazy"/></a>{(b.alt||b.caption)&&<figcaption>{b.alt||b.caption}</figcaption>}</figure>;
    if(b.type==='heading')return <h2 key={b.id}>{b.text}</h2>;
    if(b.type==='subheading')return <h3 key={b.id}>{b.text}</h3>;
    if(b.type==='table')return <div className="rule-table-scroll" key={b.id} role="region" tabIndex={0} aria-label={b.headers?.join('、')}><table><thead><tr>{b.headers?.map((h,i)=><th key={i} scope="col">{h}</th>)}</tr></thead><tbody>{b.rows?.map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table></div>;
    if(b.type==='icons')return <ul className="rule-icons" key={b.id}>{b.items?.map((item,i)=><li key={i}><img src={item.src} alt="" loading="lazy"/>{item.text}</li>)}</ul>;
    if(b.type==='links')return <nav className="rule-crosslinks" aria-label="关联规则页" key={b.id}>{b.items?.map((item,i)=><button key={i} type="button" onClick={()=>item.page&&onPage?.(item.page)}>{item.label} · {item.page}</button>)}</nav>;
    return <p className={b.type==='caption'?'help':'rule-paragraph preserve'} key={b.id}>{b.text}</p>;
  })}</div>;
}
