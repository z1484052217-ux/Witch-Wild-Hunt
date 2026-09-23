import {Article} from '@/lib/site-content';
export default function ArticleContent({article,heading=true}:{article:Article;heading?:boolean}){
  return <div className="article-content">{heading&&<><h1>{article.title}</h1>{article.summary&&<p className="rule-summary">{article.summary}</p>}</>}{article.blocks.map(b=>b.type==='image'?<figure key={b.id}><img src={b.url} alt={b.caption||article.title} loading="lazy"/>{b.caption&&<figcaption>{b.caption}</figcaption>}</figure>:b.type==='heading'?<h2 key={b.id}>{b.text}</h2>:<p className="rule-paragraph preserve" key={b.id}>{b.text}</p>)}</div>;
}
