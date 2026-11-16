"""Domain split only: keep the running game code, database and locked rules."""
import fcntl,hashlib,json,os,pathlib,re,shutil,sqlite3,subprocess,sys,tarfile,time
from urllib.request import urlopen
from datetime import datetime,timezone

BASE='257babdd237c8e15c8a581c4384a78a97dc7927f'
ARCHIVE_SHA='6735f46d5686b513c18834a84585eaa5a1f1633871353e4a2a48414348b9e1f1'
INCOMING=pathlib.Path('/home/ubuntu/wwh-domain-split-20261116')
WORK=pathlib.Path('/var/tmp/witch-domain-split-20261116')
APP=pathlib.Path('/opt/witch/app')
DB=pathlib.Path('/var/lib/witch/production.sqlite')
ATLAS=pathlib.Path('/opt/witch/atlas/releases/20261116')
CONF=pathlib.Path('/etc/nginx/sites-available/witchwildhunt.conf')
ENV=pathlib.Path('/etc/witch/witch.env')
BUILD=pathlib.Path('/etc/witch/build.env')
def require(condition,message):
    if not condition: raise RuntimeError(message)
def sha(p):
    with pathlib.Path(p).open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def run(args,**kw):return subprocess.run(args,check=True,**kw)
def database():return sqlite3.connect(DB.as_uri()+'?mode=ro',uri=True,timeout=20)
def marker():return json.loads((APP/'deployment.json').read_text())
def emit(name,result):
    (WORK/(name+'.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps(result,ensure_ascii=False),flush=True)
def health():
    for _ in range(40):
        try:
            if json.load(urlopen('http://127.0.0.1:3001/api/v1/health',timeout=2))['status']=='ok':return
        except OSError:pass
        time.sleep(.5)
    raise RuntimeError('Game health check failed')
def snapshot():
    with database() as db:
        db.execute('BEGIN')
        tables={}
        for (name,) in db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"):
            rows=list(db.execute('SELECT * FROM "'+name.replace('"','""')+'"'))
            encoded=sorted(json.dumps(row,default=lambda b:b.hex(),ensure_ascii=False,separators=(',',':')) for row in rows)
            tables[name]={'count':len(rows),'sha256':hashlib.sha256('\n'.join(encoded).encode()).hexdigest()}
        games={r[0]:[r[1],hashlib.sha256(r[2].encode()).hexdigest()] for r in db.execute('SELECT roomId,contentVersion,contentSnapshot FROM GameState')}
        return {'tables':tables,'lockedRules':games}
def pending():
    with database() as db:
        calls=db.execute("""SELECT count(*) FROM Room r,json_each(r.settings,'$.botPlayers') b
        WHERE r.status='PREPARING' AND b.key LIKE 'bot:ai:%'
        AND json_extract(b.value,'$.ledger.pendingKey') IS NOT NULL
        AND json_extract(b.value,'$.ledger.failure') IS NULL
        AND (json_extract(b.value,'$.ledger.pendingDeadlineAt') IS NULL OR json_extract(b.value,'$.ledger.pendingDeadlineAt')>?)""",(int(time.time()*1000),)).fetchone()[0]
        reviews=db.execute("SELECT count(*) FROM AiExperience WHERE json_extract(summary,'$.modelReview.state')='claimed' AND (json_extract(summary,'$.modelReview.requestedAt') IS NULL OR json_extract(summary,'$.modelReview.requestedAt')>=?)",(int(time.time()*1000)-150000,)).fetchone()[0]
        return calls+reviews
def update_env(file,key,value):
    text=file.read_text();pattern=re.compile(r'^'+re.escape(key)+r'=.*$',re.M)
    text=pattern.sub(key+'='+value,text) if pattern.search(text) else text+'\n'+key+'='+value+'\n'
    tmp=file.with_name(file.name+'.domain-new');tmp.write_text(text);shutil.copystat(file,tmp);tmp.replace(file)
def public_permissions(root):
    require(root==ATLAS or root==WORK/'game-source/apps/web/dist','Unexpected public artifact path')
    for directory,dirs,files in os.walk(root):
        os.chmod(directory,0o755)
        for name in files:os.chmod(pathlib.Path(directory)/name,0o644)
def prepare():
    require(marker()['commit']==BASE,'Running source changed')
    require(not WORK.exists(),'Stage exists; inspect before reusing')
    require(sha(INCOMING/'atlas-20261116.tar.gz')==ARCHIVE_SHA,'Artifact hash mismatch')
    WORK.mkdir(mode=0o700)
    for name in ['nginx-domain-split.conf','release-backup.py']:shutil.copyfile(INCOMING/name,WORK/name)
    backup=json.loads(subprocess.check_output([sys.executable,str(WORK/'release-backup.py'),'prepare',BASE,'--refresh']))
    require(backup['sqliteCheck']=='ok','Backup verification failed')
    for source,name in [(CONF,'nginx.before'),(ENV,'runtime.before'),(BUILD,'build.before'),(APP/'deployment.json','deployment.before')]:shutil.copy2(source,WORK/name)
    print(json.dumps({'stage':'backup verified','counts':backup['counts']}),flush=True)
    unpack=WORK/'atlas';unpack.mkdir()
    with tarfile.open(INCOMING/'atlas-20261116.tar.gz') as archive:
        for member in archive.getmembers():
            target=(unpack/member.name).resolve()
            require(target==unpack or target.is_relative_to(unpack),'Unsafe archive path')
            require(member.isdir() or member.isfile(),'Archive must contain only static files')
        archive.extractall(unpack,filter='data')
    require((unpack/'index.html').is_file() and (unpack/'cards/basic-0001/index.html').is_file(),'Static output missing')
    require(not ATLAS.exists(),'Atlas release already exists')
    ATLAS.parent.mkdir(parents=True,exist_ok=True,mode=0o755);unpack.rename(ATLAS)
    for directory,dirs,files in os.walk(ATLAS):
        os.chmod(directory,0o755)
        for name in files:os.chmod(pathlib.Path(directory)/name,0o644)
    # Rebuild only the live frontend, with its existing dependencies and content.
    source=WORK/'game-source';(source/'apps').mkdir(parents=True)
    shutil.copytree(APP/'apps/web',source/'apps/web',ignore=shutil.ignore_patterns('dist'),symlinks=True)
    shutil.copy2(APP/'tsconfig.base.json',source/'tsconfig.base.json')
    shutil.copy2(APP/'package.json',source/'package.json')
    (source/'packages').symlink_to(APP/'packages',target_is_directory=True)
    (source/'node_modules').symlink_to(APP/'node_modules',target_is_directory=True)
    build_env=dict(os.environ,VITE_GAME_SITE_URL='https://game.witchwildhunt.top',VITE_ICP_RECORD='湘ICP备2026050381号')
    with (WORK/'game-build.log').open('w') as log:
        run(['/usr/local/bin/node',str(APP/'node_modules/typescript/bin/tsc'),'-p','tsconfig.json','--noEmit'],cwd=source/'apps/web',env=build_env,stdout=log,stderr=subprocess.STDOUT)
        run(['/usr/local/bin/node',str(APP/'node_modules/vite/bin/vite.js'),'build'],cwd=source/'apps/web',env=build_env,stdout=log,stderr=subprocess.STDOUT)
    finish_prepare()

def finish_prepare():
    require(marker()['commit']==BASE,'Running source changed')
    require(not (WORK/'game-dist.before').exists(),'Activation already attempted')
    require(sha(INCOMING/'atlas-20261116.tar.gz')==ARCHIVE_SHA,'Artifact hash mismatch')
    for source,name in [(CONF,'nginx.before'),(ENV,'runtime.before'),(BUILD,'build.before'),(APP/'deployment.json','deployment.before')]:
        require(sha(source)==sha(WORK/name),'Live configuration changed during preparation')
    subprocess.run([sys.executable,str(WORK/'release-backup.py'),'verify',BASE],check=True)
    require('built in' in (WORK/'game-build.log').read_text(),'Game build did not complete')
    candidate=WORK/'game-source/apps/web/dist'
    for asset in (APP/'apps/web/dist/assets').rglob('*'):
        require(not asset.is_symlink(),'Unexpected old asset symlink')
        if asset.is_dir():continue
        dest=candidate/'assets'/asset.relative_to(APP/'apps/web/dist/assets')
        dest.parent.mkdir(parents=True,exist_ok=True)
        if dest.exists():require(sha(dest)==sha(asset),'Asset hash filename collision')
        else:shutil.copy2(asset,dest)
    run(['certbot','certonly','--webroot','-w','/var/www/certbot','--cert-name','game.witchwildhunt.top','-d','game.witchwildhunt.top','--non-interactive','--agree-tos','--keep-until-expiring'])
    main=pathlib.Path('/etc/nginx/nginx.conf').read_text()
    require('include /etc/nginx/sites-enabled/*;' in main,'Unexpected nginx include layout')
    (WORK/'nginx-test.conf').write_text(main.replace('include /etc/nginx/sites-enabled/*;','include '+str(WORK/'nginx-domain-split.conf')+';'))
    run(['nginx','-t','-c',str(WORK/'nginx-test.conf')])
    entries={url:sha(candidate/url.lstrip('/')) for url in re.findall(r'(?:src|href)="(/assets/[^\"]+\.(?:js|css))"',(candidate/'index.html').read_text())}
    require(len(entries)==2,'Expected game JS and CSS entry points')
    inventory={}
    for root,folder in [('apps/web/dist',candidate),('apps/admin/dist',APP/'apps/admin/dist')]:
        for file in folder.rglob('*'):
            require(not file.is_symlink(),'Unexpected built asset symlink')
            if file.is_file():inventory[root+'/'+file.relative_to(folder).as_posix()]=sha(file)
    receipt={'files':len(inventory),'sha256':hashlib.sha256(json.dumps(inventory,sort_keys=True,separators=(',',':')).encode()).hexdigest()}
    emit('prepared',{'stage':'prepared','commit':BASE,'atlasArchiveSha256':ARCHIVE_SHA,'atlasIndexSha256':sha(ATLAS/'index.html'),'gameIndexSha256':sha(candidate/'index.html'),'webEntries':entries,'staticAssets':receipt,'nginxSha256':sha(WORK/'nginx-domain-split.conf'),'backup':'/var/backups/witch/release-'+BASE,'gameBuild':'passed','nginxTest':'passed'})
def activate():
    prepared=json.loads((WORK/'prepared.json').read_text());require(marker()['commit']==BASE,'Running source changed')
    candidate=WORK/'game-source/apps/web/dist';old=WORK/'game-dist.before'
    public_permissions(ATLAS);public_permissions(candidate)
    os.chmod(ATLAS.parent,0o755);os.chmod(ATLAS.parent.parent,0o755)
    run(['runuser','-u','www-data','--','test','-r',str(ATLAS/'index.html')])
    require(not old.exists(),'Activation already attempted')
    require(sha(candidate/'index.html')==prepared['gameIndexSha256'],'Game artifact drift')
    require(sha(ATLAS/'index.html')==prepared['atlasIndexSha256'],'Atlas artifact drift')
    require(sha(WORK/'nginx-domain-split.conf')==prepared['nginxSha256'],'Config drift')
    for _ in range(90):
        if not pending():break
        time.sleep(2)
    else:raise RuntimeError('Paid AI requests are still active')
    inode=DB.stat();started=time.monotonic();run(['systemctl','stop','witch'])
    try:
        require(not pending(),'An AI request started before service stop')
        before=snapshot();(WORK/'stopped-before.json').write_text(json.dumps(before))
        with database() as live,sqlite3.connect(WORK/'stopped.sqlite') as out:live.backup(out)
        update_env(ENV,'APP_ORIGINS','https://witchwildhunt.top,https://www.witchwildhunt.top,https://game.witchwildhunt.top')
        update_env(BUILD,'VITE_GAME_SITE_URL','https://game.witchwildhunt.top')
        (APP/'apps/web/dist').rename(old);candidate.rename(APP/'apps/web/dist')
        require(os.path.samestat(inode,DB.stat()) and snapshot()==before,'Database changed during domain switch')
        run(['systemctl','start','witch']);health()
        outage=round(time.monotonic()-started,2)
        current=ATLAS.parent.parent/'current';require(not current.exists(),'Unexpected existing atlas link')
        current.symlink_to(ATLAS,target_is_directory=True)
        shutil.copy2(WORK/'nginx-domain-split.conf',CONF);run(['nginx','-t']);run(['systemctl','reload','nginx'])
        m=marker();m['domainSplit']={'date':datetime.now(timezone.utc).isoformat(),'gameOrigin':'https://game.witchwildhunt.top','atlasOrigin':'https://witchwildhunt.top','atlasArchiveSha256':ARCHIVE_SHA,'previousGameIndexSha256':sha(old/'index.html'),'recoveryPoint':'/var/backups/witch/release-'+BASE};m.setdefault('outputs',{})['apps/web/dist/index.html']=sha(APP/'apps/web/dist/index.html');m['webEntries']=prepared['webEntries'];m['staticAssets']=prepared['staticAssets'];(APP/'deployment.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
        emit('activated',{'stage':'active','commit':BASE,'databaseUnchangedAtSwitch':True,'tablesVerified':len(before['tables']),'counts':{name:before['tables'][name]['count'] for name in ['User','Room','GameState','MatchArchive','PlayerProfile']},'serviceSwitchSeconds':outage,'gameOrigin':'https://game.witchwildhunt.top','atlasOrigin':'https://witchwildhunt.top'})
    except BaseException:
        run(['systemctl','stop','witch'])
        if old.exists():
            failed=WORK/'game-dist.failed'
            if (APP/'apps/web/dist').exists():(APP/'apps/web/dist').rename(failed)
            old.rename(APP/'apps/web/dist')
        for name,target in [('runtime.before',ENV),('build.before',BUILD),('nginx.before',CONF),('deployment.before',APP/'deployment.json')]:shutil.copy2(WORK/name,target)
        run(['systemctl','start','witch']);health();run(['nginx','-t']);run(['systemctl','reload','nginx']);raise
def verify():
    health();before=json.loads((WORK/'stopped-before.json').read_text());after=snapshot()
    missing=set(before['lockedRules'])-set(after['lockedRules'])
    require(all(after['lockedRules'][room]==value for room,value in before['lockedRules'].items() if room not in missing),'A prior locked game snapshot changed')
    expired=[]
    # Account for the existing 72h/48h cleanup only with both the stopped
    # snapshot's actual runtime deadline and a matching production audit.
    with database() as db,sqlite3.connect((WORK/'stopped.sqlite').as_uri()+'?mode=ro',uri=True) as saved:
        for room in missing:
            state,updated=saved.execute('SELECT state,updatedAt FROM GameState WHERE roomId=?',(room,)).fetchone()
            check="import {expiry} from '/opt/witch/app/apps/server/dist/room-lifecycle.js';let data='';for await(const chunk of process.stdin)data+=chunk;const x=JSON.parse(data);process.stdout.write(JSON.stringify(expiry(x.state,new Date(x.updatedAt))));"
            deadline=json.loads(subprocess.check_output(['/usr/local/bin/node','--input-type=module','-e',check],input=json.dumps({'state':json.loads(state),'updatedAt':updated}).encode()))
            require(deadline and deadline['reason'] in ('inactivity','report-retention'),'Missing room was not eligible for expiry')
            audits=[json.loads(row[0]) for row in db.execute('SELECT details FROM AuditLog WHERE target=? AND actorId=? AND action=?',(room,'system:room-expiry','room.expired'))]
            matched=[a for a in audits if a.get('reason')==deadline['reason'] and round(datetime.fromisoformat(a['expiredAt'].replace('Z','+00:00')).timestamp()*1000)==deadline['at'] and datetime.fromisoformat(a['removedAt'].replace('Z','+00:00')).timestamp()*1000>=deadline['at']]
            require(len(matched)==1,'Missing room has no matching expiry audit')
            if deadline['reason']=='report-retention':require(db.execute('SELECT count(*) FROM MatchArchive WHERE id=?',(room,)).fetchone()[0]==1,'Expired finished room has no permanent archive')
            expired.append(matched[0])
    for name in ['User','MatchArchive','PlayerProfile']:
        require(after['tables'][name]['count']>=before['tables'][name]['count'],'Protected records missing: '+name)
    emit('verified',{'stage':'verified','commit':marker()['commit'],'lockedGamesPreserved':len(before['lockedRules'])-len(missing),'existingPolicyExpirations':expired,'counts':{name:after['tables'][name]['count'] for name in ['User','Room','GameState','MatchArchive','PlayerProfile']},'liveCatalogVersion':json.load(urlopen('http://127.0.0.1:3001/api/v1/catalog'))['contentVersion'],'nginxConfigSha256':sha(CONF),'gameIndexSha256':sha(APP/'apps/web/dist/index.html'),'atlasIndexSha256':sha(ATLAS/'index.html')})

def finalize():
    checked=json.loads((WORK/'verified.json').read_text())
    require(checked['stage']=='verified' and sha(CONF)==checked['nginxConfigSha256'],'Deployment verification is stale')
    require(marker()['domainSplit']['atlasArchiveSha256']==ARCHIVE_SHA,'Wrong active deployment')
    health()
    subprocess.run([sys.executable,str(WORK/'release-backup.py'),'verify',BASE],check=True)
    root=pathlib.Path('/var/backups/witch')
    previous=root/'release-e6c20ea783ccc5d9d1a9ac911d82fc1a5b18fffa'
    kept=root/('release-'+BASE)
    require(kept.is_dir() and kept.resolve()==kept,'Missing immediate predecessor recovery point')
    removed=[]
    if previous.exists():
        require(previous.resolve()==previous and previous.parent==root and previous.is_dir(),'Unexpected prior backup path')
        old=json.loads((previous/'manifest.json').read_text())
        require(old['format']==1 and old['commit']=='e6c20ea783ccc5d9d1a9ac911d82fc1a5b18fffa','Unrecognized old recovery point')
        shutil.rmtree(previous);removed.append(previous.name)
    emit('finalized',{'stage':'finalized','recoveryPoint':str(kept),'removedOlderRecoveryPoints':removed,'activeSourceCommit':BASE,'atlasArchiveSha256':ARCHIVE_SHA})
require(os.geteuid()==0,'Run on the designated server as root')
os.umask(0o077)
with open('/run/lock/witch-release.lock','a') as lock:
    fcntl.flock(lock,fcntl.LOCK_EX)
    {'prepare':prepare,'resume-prepare':finish_prepare,'activate':activate,'verify':verify,'finalize':finalize}[sys.argv[1]]()
