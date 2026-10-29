import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {openSync,closeSync,writeFileSync,rmSync,mkdirSync,mkdtempSync,renameSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const temporary=mkdtempSync(join(tmpdir(),'naqada-isr-withdrawal-'));
const state=join(temporary,'state.json'),started=state+'.started';
function writeState(value){writeFileSync(state+'.next',JSON.stringify(value));renameSync(state+'.next',state);}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
mkdirSync('artifacts/withdrawal',{recursive:true});
const log=openSync('artifacts/withdrawal/server.log','w');
const secret=randomBytes(32).toString('hex'),fixtureId=randomUUID(),base='http://127.0.0.1:3048';
writeState({mode:'visible'});
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3048'],{
 env:{...process.env,NAQADA_PUBLIC_READ_TIMEOUT_MS:'5000',NODE_OPTIONS:'--import=./.github/qa-withdrawal-fetch.mjs',NAQADA_QA_WITHDRAWAL_STATE:state,NAQADA_QA_WITHDRAWAL_ID:fixtureId,CONTENT_REVALIDATION_SECRET:secret},stdio:['ignore',log,log],
});
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/manifest.webmanifest')).ok)break;}catch{}await sleep(200);}
 const target=base+'/activity/'+encodeURIComponent('اختبار-السحب-المحلي')+'-'+fixtureId+'/';
 async function invalidate(){const r=await fetch(base+'/api/revalidate/',{method:'POST',headers:{authorization:'Bearer '+secret}});assert.equal(r.status,200);assert.equal((await r.json()).revalidated,true);}
 async function hidden(){const r=await fetch(target),body=await r.text();if(r.status!==404)return false;assert.match(body,/noindex/);assert.ok(!body.includes('<h1>اختبار السحب المحلي</h1>'));return true;}
 async function waitHidden(){for(let i=0;i<80;i++){if(await hidden())return;await sleep(400);}throw Error('Hidden activity persisted after the follow-up purge window');}
 assert.equal((await fetch(base+'/api/revalidate/',{method:'POST'})).status,401);
 const before=await fetch(target);assert.equal(before.status,200);assert.ok((await before.text()).includes('اختبار السحب المحلي'));
 writeState({mode:'hidden'});await invalidate();await waitHidden();
 assert.equal((await fetch(target+'opengraph-image/')).status,404);
 writeState({mode:'visible'});await invalidate();assert.equal((await fetch(target)).status,200);
 await invalidate();writeState({mode:'hold'});
 const oldRequest=fetch(target).then(async r=>({status:r.status,html:await r.text()}));
 for(let i=0;i<150&&!existsSync(started);i++)await sleep(40);
 assert.ok(existsSync(started),'The older ISR regeneration never reached the fixture');
 writeState({mode:'hidden'});await invalidate();writeState({mode:'hidden',release:true});
 await oldRequest;const releasedAt=Date.now();await waitHidden();
 const concurrentConvergenceMs=Date.now()-releasedAt;
 assert.equal((await fetch(target+'opengraph-image/')).status,404);
 let hiddenFoundation;
 if(process.env.NAQADA_QA_WITHDRAWAL_COVERAGE==='1'){
   const directory=await fetch(base+'/directory/').then(r=>r.text());
   const path=directory.match(/href="(\/listing\/[^"?]+)"/)?.[1];assert.ok(path);
   const initial=await fetch(new URL(path,base));assert.equal(initial.status,200);await initial.text();
   writeState({mode:'hidden',release:true,hiddenSlug:decodeURIComponent(path.split('/')[2])});await invalidate();
   for(let i=0;i<80;i++){const r=await fetch(new URL(path,base));const text=await r.text();if(r.status===404){assert.match(text,/noindex/);hiddenFoundation=404;break;}await sleep(400);}
   assert.equal(hiddenFoundation,404);
   assert.equal((await fetch(new URL(path+'opengraph-image/',base))).status,404);
 }
 const result={productionWrites:0,fixtureOnly:true,before:200,normalWithdrawal:404,republished:200,unauthorizedInvalidation:401,afterConcurrentReadAndPurge:404,concurrentConvergenceMs,hiddenShareImage:404,hiddenFoundation,guarantee:'Bounded eventual consistency after older ISR regeneration, not an instantaneous withdrawal guarantee.'};
 writeFileSync('artifacts/withdrawal/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{writeState({mode:'hidden',release:true});server.kill('SIGTERM');await Promise.race([new Promise(resolve=>server.once('exit',resolve)),sleep(1000)]);if(server.exitCode===null)server.kill('SIGKILL');closeSync(log);rmSync(temporary,{recursive:true,force:true});}
