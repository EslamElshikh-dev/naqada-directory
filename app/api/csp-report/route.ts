// Bounded diagnostic input. Never retain document paths, queries, cookies or sample code.
const buckets = new Map<string,{count:number;until:number}>();
export async function POST(request: Request) {
  if (Number(request.headers.get('content-length') || 0)>16384) return new Response(null,{status:413});
  const key=(request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].slice(0,80),now=Date.now();
  for(const [key,bucket]of buckets)if(bucket.until<now)buckets.delete(key);
  if(buckets.size>1000)return new Response(null,{status:429});
  const bucket=buckets.get(key)||{count:0,until:now+60000};bucket.count++;buckets.set(key,bucket);
  if(bucket.count>20)return new Response(null,{status:429});
  const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400});
  let bytes=0,body='';const decoder=new TextDecoder();
  for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>16384){await reader.cancel();return new Response(null,{status:413});}body+=decoder.decode(value,{stream:true});}
  try {
    const parsed=JSON.parse(body);const reports=Array.isArray(parsed)?parsed.slice(0,5):[parsed];
    for(const report of reports){const item=report['csp-report']||report.body||{};const directive=String(item['effective-directive']||item.effectiveDirective||'').slice(0,80);let origin='';try{origin=new URL(item['blocked-uri']||item.blockedURL).origin;}catch{}console.warn('CSP_VIOLATION',{directive,blockedOrigin:origin});}
  }catch{return new Response(null,{status:400});}
  return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
}
