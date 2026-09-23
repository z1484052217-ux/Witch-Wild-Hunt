// One transaction moves existing content to the new catalog numbering.
// Schema is created by Drizzle; this only backfills records after deployment.
export async function migrateCatalog(db:D1Database,seedMap:Record<string,string>,seedCounts:Record<string,number>){
 const marker='card-numbering-0001-v2';
 if(await db.prepare('SELECT name FROM catalog_updates WHERE name=?').bind(marker).first())return;
 const rows=await db.prepare('SELECT id,draft FROM card_edits ORDER BY updated_at,id').all<{id:string;draft:string}>();
 if(await db.prepare('SELECT name FROM catalog_updates WHERE name=?').bind(marker).first())return;
 const mapping={...seedMap},counts={...seedCounts};
 for(const row of rows.results){
  const card=JSON.parse(row.draft);
  if(card.id!==row.id)throw new Error('Card identity mismatch; migration stopped');
  if(!mapping[row.id]){
   if(!row.id.startsWith('custom-')||!(card.categoryId in counts))throw new Error('Unrecognized card identity; migration stopped');
   mapping[row.id]=`${card.categoryId}-${String(++counts[card.categoryId]).padStart(4,'0')}`;
  }
 }
 if(new Set(Object.values(mapping)).size!==Object.keys(mapping).length)throw new Error('Duplicate catalog identity');
 const json=JSON.stringify(mapping),pending="NOT EXISTS (SELECT 1 FROM catalog_updates WHERE name='card-numbering-0001-v2')";
 await db.batch([
  db.prepare(`UPDATE card_edits SET id='catalog-v1-'||id,
   draft=json_set(draft,'$.id',(SELECT value FROM json_each(?) WHERE key=card_edits.id),'$.catalogVersion',2),
   published=CASE WHEN published IS NULL THEN NULL ELSE json_set(published,'$.id',(SELECT value FROM json_each(?) WHERE key=card_edits.id),'$.catalogVersion',2) END,
   write_epoch=write_epoch+1 WHERE ${pending} AND id IN (SELECT key FROM json_each(?))`).bind(json,json,json),
  db.prepare(`UPDATE card_edits SET id=json_extract(draft,'$.id'),write_epoch=write_epoch+1 WHERE ${pending} AND id LIKE 'catalog-v1-%'`),
  db.prepare(`UPDATE site_content SET
   draft=CASE WHEN json_extract(draft,'$.characterId') IN (SELECT key FROM json_each(?)) THEN json_set(draft,'$.characterId',(SELECT value FROM json_each(?) WHERE key=json_extract(site_content.draft,'$.characterId'))) ELSE draft END,
   published=CASE WHEN published IS NOT NULL AND json_extract(published,'$.characterId') IN (SELECT key FROM json_each(?)) THEN json_set(published,'$.characterId',(SELECT value FROM json_each(?) WHERE key=json_extract(site_content.published,'$.characterId'))) ELSE published END,
   write_epoch=write_epoch+1 WHERE ${pending} AND (json_extract(draft,'$.characterId') IN (SELECT key FROM json_each(?)) OR json_extract(published,'$.characterId') IN (SELECT key FROM json_each(?)))`).bind(json,json,json,json,json,json),
  db.prepare('INSERT OR IGNORE INTO catalog_updates(name) VALUES(?)').bind(marker)
 ]);
}

// Allocation and insert are a single statement, so simultaneous new cards
// receive distinct numbers without overwriting a draft or skipping a failed insert.
export async function insertNumberedCard(db:D1Database,category:string,seedCount:number,card:Record<string,unknown>,publish:boolean,now:string){
 const prefix=category+'-';
 return db.prepare(`WITH next AS (
  SELECT ?||printf('%04d',MAX(?,COALESCE(MAX(CAST(substr(id,?) AS INTEGER)),0))+1) AS id
  FROM card_edits WHERE id LIKE ?
 ) INSERT INTO card_edits(id,draft,published,revision,updated_at,write_epoch)
 SELECT id,json_set(?,'$.id',id,'$.sourceLabel',?||id),CASE WHEN ? THEN json_set(?,'$.id',id,'$.sourceLabel',?||id) ELSE NULL END,1,?,1 FROM next
 RETURNING id,draft,published`).bind(prefix,seedCount,prefix.length+1,prefix+'%',JSON.stringify(card),String(card.sourceLabel||''),publish?1:0,JSON.stringify(card),String(card.sourceLabel||''),now).first<{id:string;draft:string;published:string|null}>();
}
