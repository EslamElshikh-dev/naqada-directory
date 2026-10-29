import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,readdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import sharp from 'sharp';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:3000';
const folder='artifacts/performance-followup';await mkdir(folder,{recursive:true});
const checks=[];let failures=0;
async function check(name,run){try{const detail=await run();checks.push({name,passed:detail?.blockedByEnvironment?null:true,detail});console.log(detail?.blockedByEnvironment?'BLOCKED':'PASS',name);}catch(e){failures++;checks.push({name,passed:false,error:e.message});console.log('FAIL',name,e.message);}}
async function html(path){const r=await fetch(new URL(path,base));return {r,text:await r.text()};}
function schemas(text){return [...text.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m=>{const j=JSON.parse(m[1]);return j['@graph']||[j];});}
const home=await html('/');
await check('public ISR and dynamic query policies',async()=>{
 const documents=[];
 for(const path of ['/','/about/','/install/','/coverage/','/updates/','/directory/','/villages/','/villages/'+encodeURIComponent('الخطاره')+'/']){
  await fetch(new URL(path,base)).then(r=>r.arrayBuffer());const t=performance.now();const {r}=await html(path);assert.equal(r.status,200);const cache=r.headers.get('cache-control')||'';assert.ok(!cache.includes('no-store'),path+': '+cache);assert.equal(r.headers.get('x-nextjs-cache'),'HIT',path);documents.push({path,cache,xNextjsCache:r.headers.get('x-nextjs-cache'),localResponseMs:Math.round(performance.now()-t)});
 }
 const query=await html('/directory/?q='+encodeURIComponent('صيدلية'));
 assert.equal(query.r.status,200);assert.match(query.r.headers.get('cache-control')||'',/no-store/);
 assert.match(query.r.headers.get('content-security-policy'),/'strict-dynamic'/);assert.match(query.text,/<script[^>]*nonce="[^"]+"/);
 for(const path of ['/api/news/','/api/jobs/']){const {r}=await html(path);assert.equal(r.status,200);assert.match(r.headers.get('cache-control')||'',/s-maxage=300/);}
 return documents;
});
await check('exactly two font preloads',async()=>{
 const fonts=[...home.text.matchAll(/<link[^>]*as="font"[^>]*>/g)];assert.equal(fonts.length,2);return fonts.map(x=>x[0]);
});
await check('legacy activity URLs redirect to reviewed Arabic slugs',async()=>{
 const review=JSON.parse(await readFile('data/owner-copy-review.json','utf8'));const links=[];
 for(const item of review.items){const r=await fetch(new URL('/activity/'+item.id+'/',base),{redirect:'manual'});assert.equal(r.status,308);const location=r.headers.get('location');assert.ok(!location.includes(item.id));assert.ok(!location.includes(','),'duplicate Location');const page=await html(location);assert.equal(page.r.status,200,item.id+' '+location);assert.ok(page.text.includes(item.after.name));links.push({id:item.id,location});}
 const center=await fetch(new URL('/villages/'+encodeURIComponent('مركز-نقاده')+'/',base),{redirect:'manual'});assert.equal(center.status,308);assert.equal(new URL(center.headers.get('location'),base).pathname,'/villages/');return links;
});
let listing;
await check('factual business geo, hours, ratings, site search and contact schema',async()=>{
 const pins=JSON.parse(await readFile('data/business-geo.json','utf8'));
 const records=(await Promise.all((await readdir('data')).filter(x=>/^businesses-.*\.json$/.test(x)).map(x=>readFile('data/'+x,'utf8').then(JSON.parse)))).flat();
 const row=records.find(x=>pins[x.placeId]&&/24|٢٤|طوال اليوم/.test(x.hours||''));assert.ok(row);listing='/listing/'+encodeURIComponent(row.slug)+'/';
 const page=await html(listing);assert.equal(page.r.status,200);const entity=schemas(page.text).find(x=>x.geo);assert.ok(entity);assert.equal(entity.geo.latitude,pins[row.placeId].latitude);assert.equal(entity.geo.longitude,pins[row.placeId].longitude);assert.equal(entity.openingHoursSpecification[0].opens,'00:00');assert.equal(entity.openingHoursSpecification[0].closes,'23:59');
 if(entity.aggregateRating)assert.ok(entity.aggregateRating.ratingCount>0);
 const site=schemas(home.text);assert.ok(site.find(x=>x['@type']==='WebSite').potentialAction.target.urlTemplate.endsWith('/directory/?q={search_term_string}'));const org=site.find(x=>x['@type']==='Organization');assert.ok(org.contactPoint.url);assert.ok(org.sameAs.length);
 return {path:listing,entity,verifiedPins:Object.keys(pins).length,officialRichResultsTest:'Not run: unpublished local URL'};
});
const browser=await chromium.launch({headless:true,ignoreDefaultArgs:['--disable-back-forward-cache']});
try{
 await check('RTL layout and named landmarks at five widths',async()=>{
  const results=[];
  for(const width of [320,390,430,768,1440]){
   const page=await browser.newPage({viewport:{width,height:900},serviceWorkers:'block'});await page.goto(base,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);
   const result=await page.evaluate(()=>({rtl:document.documentElement.dir,overflow:document.documentElement.scrollWidth>innerWidth+1,headers:document.querySelectorAll('header').length,unnamedNavs:[...document.querySelectorAll('nav')].filter(x=>!x.getAttribute('aria-label')&&!x.getAttribute('aria-labelledby')).length,unnamedSections:[...document.querySelectorAll('section')].filter(x=>!x.getAttribute('aria-label')&&!x.getAttribute('aria-labelledby')).length}));
   assert.equal(result.rtl,'rtl');assert.equal(result.overflow,false,'overflow '+width);assert.equal(result.headers,1);assert.equal(result.unnamedNavs,0);assert.equal(result.unnamedSections,0);results.push({width,...result});await page.close();
  }return results;
 });
 await check('bottom navigation hides down and returns up',async()=>{
  const page=await browser.newPage({viewport:{width:390,height:900},serviceWorkers:'block'});await page.goto(base);const nav=page.getByRole('navigation',{name:'التنقل على الجوال'});await page.evaluate(()=>window.scrollTo(0,750));await page.waitForFunction(()=>document.querySelector('nav[data-hidden]')?.getAttribute('data-hidden')==='true');await page.evaluate(()=>window.scrollTo(0,250));await page.waitForFunction(()=>document.querySelector('nav[data-hidden]')?.getAttribute('data-hidden')==='false');assert.equal(await nav.getAttribute('data-hidden'),'false');await page.close();return true;
 });
 await check('reduced motion stops the ticker and slider',async()=>{
  const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce',serviceWorkers:'block'});await page.goto(base);const button=page.getByRole('button',{name:'إيقاف الشريط',exact:true});await button.click();await page.getByRole('button',{name:'تشغيل الشريط',exact:true}).waitFor();
  const animated=await page.evaluate(()=>[...document.querySelectorAll('section[aria-label="آخر أخبار وتحديثات دليل نقادة"] *')].filter(x=>getComputedStyle(x).animationName!=='none').length);assert.equal(animated,0);
  const feature=page.locator('section[aria-labelledby="home-role-model-title"]');await feature.scrollIntoViewIfNeeded();await page.getByRole('button',{name:'الشخصية التالية',exact:true}).waitFor();const before=await page.locator('#home-role-model-title').textContent();await page.waitForTimeout(3400);assert.equal(await page.locator('#home-role-model-title').textContent(),before);await page.close();return true;
 });
 await check('dynamic search hydrates under an enforced nonce CSP',async()=>{
  const page=await browser.newPage({viewport:{width:390,height:900},serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error'&&/Content Security|Refused/.test(e.text()))errors.push(e.text());});await page.goto(base+'/directory/?q='+encodeURIComponent('صيدلية'),{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'افتح محادثة سند، مساعد دليل نقادة'}).click();await page.getByRole('dialog',{name:'محادثة سند'}).waitFor();await page.keyboard.press('Escape');assert.deepEqual(errors,[]);await page.close();return {errors:0};
 });
 await check('public history restoration has no blocking reason',async()=>{
  const page=await browser.newPage({viewport:{width:390,height:900},serviceWorkers:'allow'});const reasons=[];const cdp=await page.context().newCDPSession(page);await cdp.send('Page.enable');cdp.on('Page.backForwardCacheNotUsed',e=>reasons.push(e.notRestoredExplanations));await page.addInitScript(()=>{window.addEventListener('pageshow',e=>{window.__restored=e.persisted;});});await page.goto(base);await page.goto(base+'/about/');await page.goBack({waitUntil:'commit'});await page.waitForTimeout(500);const restored=await page.evaluate(()=>window.__restored);await page.close();
  if(!restored&&reasons.flat().some(x=>x.reason==='BackForwardCacheDisabledForDelegate'))return {restored:false,verified:false,blockedByEnvironment:true,reasons,requires:'Full Chrome on the hosted deployment. This runner cannot start full Chrome and headless-shell disables BFCache.'};
  assert.equal(restored,true,JSON.stringify(reasons));return {restored,verified:true,reasons};
 });
 await check('Arabic OG images render with the logo and bounded output',async()=>{
  const items=[];for(const [i,path]of [listing,'/villages/'+encodeURIComponent('الخطاره')+'/','/blog/naqada-civilization-history/'].entries()){
   assert.ok(path);const r=await fetch(new URL(path+'opengraph-image/',base));assert.equal(r.status,200,path);const bytes=Buffer.from(await r.arrayBuffer());const meta=await sharp(bytes).metadata();assert.equal(meta.width,1200);assert.equal(meta.height,630);await writeFile(folder+'/og-'+i+'.jpg',bytes);items.push({path,bytes:bytes.length});
  }return items;
 });
}finally{await browser.close();await writeFile(folder+'/results.json',JSON.stringify({checks,failures},null,2));}
process.exitCode=failures?1:0;
