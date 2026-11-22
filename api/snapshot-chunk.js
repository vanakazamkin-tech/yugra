import { get } from '@vercel/blob';
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');res.statusCode=405;return res.end('Method not allowed');}
 const url=new URL(req.url,'https://yugra18.vercel.app'),key=url.searchParams.get('key')||'';
 if(!/^snapshots\/chunks\/[a-zA-Z0-9_-]+\/[a-f0-9]{64}\.json\.gz$/.test(key)){res.statusCode=400;return res.end('Invalid snapshot key');}
 try{
  const blob=await get(key,{access:'private'});if(!blob||blob.statusCode!==200){res.statusCode=404;return res.end('Chunk not found');}
  const bytes=Buffer.from(await new Response(blob.stream).arrayBuffer());
  res.statusCode=200;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Content-Encoding','gzip');
  res.setHeader('Cache-Control','public, max-age=31536000, immutable');res.setHeader('Content-Length',String(bytes.byteLength));res.end(bytes);
 }catch(e){console.error('Snapshot chunk API error:',e?.message||e);res.statusCode=503;res.end('Snapshot chunk unavailable');}
}
