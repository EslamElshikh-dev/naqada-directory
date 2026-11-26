// A real local production Next server with every external request intercepted.
// Never post a synthetic record or revalidation request to a hosted deployment.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = await mkdtemp(path.join(tmpdir(),'naqada-news-cache-qa-'));
const fixturePath=path.join(dir,'fixture.json'), readsPath=path.join(dir,'reads.jsonl');
const secret='synthetic-local-news-cache-secret-not-for-production';
const port=Number(process.env.NAQADA_NEWS_CACHE_QA_PORT || 3198), origin=`http://127.0.0.1:${port}`;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const story=(id,days)=>({id,title:`NEWS_ITEM_QA_${id}`,description:'Isolated archived news summary.',
  url:`https://example.invalid/${id}`,source:'Synthetic publisher',sourceUrl:'https://example.invalid',
  publishedAt:new Date(Date.now()-days*86400000).toISOString(),imageUrl:null,imageAlt:'',category:'تعليم',
  isNaqada:true,isOfficial:false,editorialBody:'Synthetic local-only story body. No publisher or production call is made.'});
let fixture={archive:[story('item-cache-root',2),story('item-cache-related',3)],curated:{},jobs:[],owners:[]};
const save=()=>writeFile(fixturePath,JSON.stringify(fixture));
await save(); await writeFile(readsPath,'');
const server=spawn(process.execPath,['--import',path.resolve('tests/helpers/scoped-cache-fetch.mjs'),'node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(port)],{
  env:{...process.env,CONTENT_REVALIDATION_SECRET:secret,NAQADA_CACHE_FIXTURE:fixturePath,NAQADA_CACHE_READS:readsPath,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe'],
});
let logs='';server.stdout.on('data',data=>logs+=data);server.stderr.on('data',data=>logs+=data);
async function read(route,status=200){const response=await fetch(origin+route);const body=await response.text();assert.equal(response.status,status,route);return {response,body};}
async function revalidate(scopes,newsItems){const r=await fetch(origin+'/api/revalidate/',{method:'POST',headers:{authorization:'Bearer '+secret},body:JSON.stringify({scopes,...(newsItems?{newsItems}:{})})});assert.equal(r.status,200,await r.text());}
const reads=async()=> (await readFile(readsPath,'utf8')).trim().split('\n').filter(Boolean).map(row=>JSON.parse(row));
const itemReads=rows=>rows.filter(row=>row.path.endsWith('/naqada_news_archive') && row.query.includes('id=eq.item-cache-root')).length;
try {
  let ready=false;for(let i=0;i<60;i++){try{await read('/robots.txt');ready=true;break;}catch{await sleep(500);}}
  assert.ok(ready,logs);
  await revalidate(['business','owner-listings','jobs','news','news-archive','article','role_model']);
  await sleep(21000);
  const initial=await read('/news/item-cache-root/');
  assert.ok(initial.body.includes('NEWS_ITEM_QA_item-cache-root'));
  assert.ok(initial.body.includes('NEWS_ITEM_QA_item-cache-related'),'Related links remain in SSR HTML');
  assert.ok(initial.body.includes('https://example.invalid/item-cache-root'),'Publisher canonical is retained');
  const before=itemReads(await reads());
  fixture.archive.push(story('item-cache-new',1));await save();await revalidate(['news-archive'],['item-cache-new']);
  assert.ok((await read('/api/news/')).body.includes('NEWS_ITEM_QA_item-cache-new'),'New archive reaches the headline API');
  assert.ok((await read('/news/')).body.includes('NEWS_ITEM_QA_item-cache-new'),'New archive reaches collection HTML');
  const immediate=await read('/news/item-cache-root/');
  assert.equal(immediate.response.headers.get('x-nextjs-cache'),'HIT','Unrelated insert must retain the actual ISR document');
  assert.equal(itemReads(await reads()),before);
  await sleep(21000);
  const after=await read('/news/item-cache-root/');
  assert.equal(after.response.headers.get('x-nextjs-cache'),'HIT','Delayed purge must retain unrelated ISR documents');
  assert.equal(itemReads(await reads()),before);
  fixture.archive[1].title='NEWS_ITEM_QA_RELATED_CORRECTED';await save();await revalidate(['news-archive'],['item-cache-related']);
  assert.ok((await read('/news/item-cache-root/')).body.includes('NEWS_ITEM_QA_RELATED_CORRECTED'),'A linked story correction refreshes its parent document');
  await read('/news/item-cache-new/');
  fixture.curated.news=[{kind:'news',slug:'item-cache-root',origin:'static',status:'hidden',payload:{},updatedAt:new Date().toISOString()}];
  await save();await revalidate(['news'],['item-cache-root']);
  await read('/news/item-cache-root/',404);
  assert.ok(!(await read('/news/item-cache-new/')).body.includes('NEWS_ITEM_QA_item-cache-root'),'A hidden story leaves related links immediately');
  assert.ok(!(await read('/api/news/')).body.includes('NEWS_ITEM_QA_item-cache-root'));
  // Deliberately let a pre-hide raw read finish after the immediate purge.
  fixture.curated.news=[];fixture.delay={id:'item-cache-root',key:'late-read',ms:700};await save();
  await revalidate(['news'],['item-cache-root']);
  const count=itemReads(await reads()), late=fetch(origin+'/news/item-cache-root/').then(response=>response.text());
  for(let i=0;i<50 && itemReads(await reads())===count;i++) await sleep(20);
  fixture.curated.news=[{kind:'news',slug:'item-cache-root',origin:'static',status:'hidden',payload:{},updatedAt:new Date().toISOString()}];
  await save();await revalidate(['news'],['item-cache-root']);await late;await sleep(21000);
  await read('/news/item-cache-root/',404);
  fixture.archive=fixture.archive.filter(item=>item.id!=='item-cache-root');fixture.curated.news=[];
  await save();await revalidate(['news','news-archive'],['item-cache-root']);await read('/news/item-cache-root/',404);
  console.log('PASS: actual ISR isolation after unrelated insert and both purges; fresh index/API; linked-story corrections/hiding; hidden/deleted 404; late-read protection; SSR canonical and related links. All upstreams were isolated.');
} catch(error){console.error(logs);throw error;}
finally{server.kill('SIGTERM');await new Promise(resolve=>{server.once('exit',resolve);setTimeout(resolve,5000).unref();});await rm(dir,{recursive:true,force:true});}
