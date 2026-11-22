import { get } from '@vercel/blob';
async function readJson(path){const b=await get(path,{access:'private'});if(!b||b.statusCode!==200)return null;return JSON.parse(await new Response(b.stream).text());}
function send(res,status,value){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value));}
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return send(res,405,{error:'Method not allowed'});}
 try{
  let manifest=null,servedFrom='current';
  for(const path of ['snapshots/current.json','snapshots/previous.json']){
   try{const pointer=await readJson(path);if(!pointer?.manifestPath)continue;const candidate=await readJson(pointer.manifestPath);if(candidate?.version&&candidate?.datasets){manifest=candidate;if(path.endsWith('previous.json'))servedFrom='previous';break;}}
   catch(e){console.warn('Snapshot pointer read failed:',path,e?.message||e);}
  }
  if(!manifest)return send(res,503,{error:'Общий снимок ещё не опубликован'});
  let health=null;try{health=await readJson('snapshots/health/latest.json');}catch{}
  return send(res,200,{...manifest,servedFrom,health});
 }catch(e){console.error('Manifest API error:',e?.message||e);return send(res,503,{error:'Не удалось прочитать общий снимок'});}
}
