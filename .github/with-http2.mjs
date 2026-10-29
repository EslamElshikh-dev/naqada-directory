// Match the deployment's HTTPS/HTTP2 transport without changing the Next server.
// The certificate and key exist only in a disposable local test directory.
import http from 'node:http';
import http2 from 'node:http2';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash,createPublicKey} from 'node:crypto';
const [upstreamUrl,command,...args]=process.argv.slice(2);
const upstream=new URL(upstreamUrl);
if(upstream.protocol!=='http:'||!['127.0.0.1','localhost'].includes(upstream.hostname)||upstream.pathname!=='/'||upstream.search||upstream.username||upstream.password||!command)throw Error('An HTTP loopback origin and a test command are required');
const directory=mkdtempSync(join(tmpdir(),'naqada-http2-qa-'));
const cert=join(directory,'certificate.pem'),key=join(directory,'key.pem');
const generated=spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
if(generated.status!==0){rmSync(directory,{recursive:true,force:true});throw Error('Cannot generate the local QA certificate');}
const agent=new http.Agent({keepAlive:true});
const spki=createHash('sha256').update(createPublicKey(readFileSync(cert)).export({type:'spki',format:'der'})).digest('base64');
const proxy=http2.createSecureServer({key:readFileSync(key),cert:readFileSync(cert),allowHTTP1:true},(req,res)=>{
 const headers=Object.fromEntries(Object.entries(req.headers).filter(([k])=>!k.startsWith(':')&&!['host','connection','keep-alive','transfer-encoding','upgrade'].includes(k)));
 headers.host=req.headers[':authority']||req.headers.host;headers['x-forwarded-proto']='https';
 const call=http.request({hostname:upstream.hostname,port:upstream.port||80,path:req.url,method:req.method,headers,agent},r=>{
  const responseHeaders=Object.fromEntries(Object.entries(r.headers).filter(([k])=>!['connection','keep-alive','transfer-encoding','upgrade'].includes(k)));
  res.writeHead(r.statusCode,responseHeaders);r.pipe(res);
 });
 call.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});req.pipe(call);
});
const sessions=new Set();proxy.on('session',s=>{sessions.add(s);s.once('close',()=>sessions.delete(s));});
let child;
try{
 await new Promise((resolve,reject)=>{proxy.once('error',reject);proxy.listen(0,'127.0.0.1',resolve);});
 const base='https://127.0.0.1:'+proxy.address().port;
 console.log(JSON.stringify({performanceTransport:'HTTPS/HTTP2 local proxy',upstream:upstream.origin,base,cssBudgetChanged:false}));
 child=spawn(command,args,{stdio:'inherit',env:{...process.env,NODE_EXTRA_CA_CERTS:cert,QA_LOCAL_TLS_SPKI:spki,QA_BASE_URL:base,LCP_QA_BASE_URL:base}});
 process.exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>resolve(code??1));});
}finally{if(child?.exitCode===null)child.kill('SIGTERM');for(const s of sessions)s.destroy();proxy.close();agent.destroy();rmSync(directory,{recursive:true,force:true});}
