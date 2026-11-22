import { createClient } from '@supabase/supabase-js';
import { del, get, put } from '@vercel/blob';
import { createHash, randomUUID } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { fetchOfficialData, mergeOfficialDataSnapshots } from '../src/lib/officialData.js';
import { fetchMunicipalities } from '../src/lib/municipalities.js';

export const config = { maxDuration: 300 };
const ROOT = 'snapshots';
const CURRENT = `${ROOT}/current.json`;
const PREVIOUS = `${ROOT}/previous.json`;
const LOCK = `${ROOT}/refresh-lock.json`;
const HEALTH = `${ROOT}/health/latest.json`;
const FULL_SYNC_MS = 6 * 60 * 60 * 1000;
const LEASE_MS = 8 * 60 * 1000;
const CHUNK_ROWS = 4000;
const BASE_RETRY_BACKOFF_MS = 5 * 60 * 1000;
const MAX_RETRY_BACKOFF_MS = 60 * 60 * 1000;
const KEYS = ['municipalities','sources','forecastScenarios','indicators','investmentSites','investmentProjects','industrialEnterprises','infrastructureObjects','landParcels','programExecution','fuelPrices','facilities','externalRatings'];

function send(res,status,value){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value));}
function clients(){
 const cu=process.env.SUPABASE_CORE_URL||process.env.VITE_SUPABASE_CORE_URL||process.env.VITE_SUPABASE_URL||'https://dmbikidqikjupkghywbz.supabase.co';
 const ck=process.env.SUPABASE_CORE_ANON_KEY||process.env.VITE_SUPABASE_CORE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY;
 const du=process.env.SUPABASE_DATA_URL||process.env.VITE_SUPABASE_DATA_URL||'https://zhywrpguzbtvjnmslwvs.supabase.co';
 const dk=process.env.SUPABASE_DATA_ANON_KEY||process.env.VITE_SUPABASE_DATA_ANON_KEY;
 if(!ck||!dk)throw new Error('Не настроены публичные ключи чтения обеих баз Supabase');
 const opts={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
 return {core:createClient(cu,ck,opts),data:createClient(du,dk,opts)};
}
async function readJson(path,{fresh=false}={}){const b=await get(path,{access:'private',useCache:!fresh});if(!b||b.statusCode!==200)return null;return JSON.parse(await new Response(b.stream).text());}
async function readRows(path){const b=await get(path,{access:'private'});if(!b||b.statusCode!==200)throw new Error('Не удалось прочитать часть снимка: '+path);const z=Buffer.from(await new Response(b.stream).arrayBuffer());return JSON.parse(gunzipSync(z).toString('utf8'));}
async function writeJson(path,value,immutable=false){return put(path,JSON.stringify(value),{access:'private',addRandomSuffix:false,allowOverwrite:!immutable,contentType:'application/json; charset=utf-8',cacheControlMaxAge:immutable?31536000:0});}
async function lock(){
 const value={token:randomUUID(),createdAt:new Date().toISOString(),expiresAt:Date.now()+LEASE_MS};
 try{
  await writeJson(LOCK,value,true);
  console.log('Yugra18 snapshot lock acquired',{expiresAt:value.expiresAt});
  return value;
 }catch(error){
  const old=await readJson(LOCK,{fresh:true});
  if(old?.expiresAt&&old.expiresAt<=Date.now()){
   await del(LOCK);
   const removed=await readJson(LOCK,{fresh:true});
   if(removed){
    console.warn('Expired snapshot lock remained after delete; replacing it with an expired lease');
    await writeJson(LOCK,{...removed,expiresAt:0,releasedAt:new Date().toISOString()},false);
   }
   try{
    await writeJson(LOCK,value,true);
    console.log('Yugra18 expired snapshot lock reclaimed',{expiresAt:value.expiresAt});
    return value;
   }catch(reclaimError){
    console.warn('Snapshot lock reclaim raced with another invocation:',reclaimError?.message||reclaimError);
    return null;
   }
  }
  if(!old)throw error;
  console.log('Yugra18 snapshot refresh skipped because lock is active',{expiresAt:old.expiresAt});
  return null;
 }
}
async function unlock(value){
 try{
  const old=await readJson(LOCK,{fresh:true});
  if(old?.token!==value.token){
   console.warn('Yugra18 snapshot lock owner changed before release');
   return;
  }
  await del(LOCK);
  const remaining=await readJson(LOCK,{fresh:true});
  if(remaining?.token===value.token){
   await writeJson(LOCK,{...remaining,expiresAt:0,releasedAt:new Date().toISOString()},false);
   console.warn('Yugra18 snapshot lock delete did not remove the lease; expired it explicitly');
  }else{
   console.log('Yugra18 snapshot lock released');
  }
 }catch(e){
  console.warn('Lock release failed:',e?.message||e);
  try{
   const old=await readJson(LOCK,{fresh:true});
   if(old?.token===value.token){
    await writeJson(LOCK,{...old,expiresAt:0,releasedAt:new Date().toISOString()},false);
    console.warn('Yugra18 snapshot lock marked expired as a fallback');
   }
  }catch(fallbackError){
   console.error('Could not expire the snapshot lock:',fallbackError?.message||fallbackError);
  }
 }
 }
function partition(row){return String(row?.municipality_id??row?.id_municipality??'__shared__');}
function group(rows){const m=new Map();for(const row of rows||[]){const k=partition(row);if(!m.has(k))m.set(k,[]);m.get(k).push(row);}return m;}
async function writePartition(dataset,part,rows,previousPaths){
 const out=[];
 for(let i=0;i<rows.length;i+=CHUNK_ROWS){
  const chunk=rows.slice(i,i+CHUNK_ROWS), payload=Buffer.from(JSON.stringify(chunk));
  const hash=createHash('sha256').update(payload).digest('hex'), key=`${ROOT}/chunks/${dataset}/${hash}.json.gz`;
  const zipped=gzipSync(payload,{level:6});
  if(!previousPaths.has(key))await put(key,zipped,{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/gzip',cacheControlMaxAge:31536000});
  out.push({key,sha256:hash,partition:part,partIndex:Math.floor(i/CHUNK_ROWS),rows:chunk.length,compressedBytes:zipped.byteLength,uncompressedBytes:payload.byteLength});
 }
 return out;
}
function mergeMunicipalityRows(previousRows=[], updateRows=[]) {
 const rows=new Map((previousRows||[]).map(row=>[String(row.id),row]));
 for(const update of updateRows||[]){
  const previous=rows.get(String(update.id))||{};
  const previousInvestments=previous.investments||{};
  const nextInvestments=update.investments||{};
  rows.set(String(update.id),{
   ...previous,...update,
   group2024:update.group2024??previous.group2024??null,
   rank2024:update.rank2024??previous.rank2024??null,
   score:update.score??previous.score??null,
   investments:{
    ...previousInvestments,...nextInvestments,
    volumeBillion:nextInvestments.volumeBillion??previousInvestments.volumeBillion??null,
    growthPercent:nextInvestments.growthPercent??previousInvestments.growthPercent??null
   },
   smeCount:update.smeCount??previous.smeCount??null,
   assessmentScore:update.assessmentScore??previous.assessmentScore??null
  });
 }
 return [...rows.values()].sort((a,b)=>{
  const ar=Number(a.rank2024),br=Number(b.rank2024);
  if(Number.isFinite(ar)&&Number.isFinite(br))return ar-br;
  if(Number.isFinite(ar))return -1;
  if(Number.isFinite(br))return 1;
  return String(a.name).localeCompare(String(b.name),'ru');
 });
}
async function prepare(data,oldManifest,isFull){
 const prev=oldManifest?.datasets||{}, allOld=new Set(KEYS.flatMap(k=>(prev[k]?.shards||[]).map(s=>s.key)));
 const datasets={};let changed=0;
 for(const key of KEYS){
  const old=prev[key]?.shards||[], oldGroups=new Map();
  for(const shard of old){if(!oldGroups.has(shard.partition))oldGroups.set(shard.partition,[]);oldGroups.get(shard.partition).push(shard);}
  const incoming=group(Array.isArray(data[key])?data[key]:[]);
  const replace=isFull?new Set([...incoming.keys(),...oldGroups.keys()]):new Set(incoming.keys());
  if(key==='municipalities'&&!isFull)replace.add('__shared__');
  const shards=[];
  if(!isFull)for(const [part,items] of oldGroups)if(!replace.has(part))shards.push(...items);
  for(const part of replace){
   let rows=incoming.get(part)||[];
   if(!isFull&&oldGroups.has(part)){
    const oldRows=[];for(const item of oldGroups.get(part).sort((a,b)=>a.partIndex-b.partIndex))oldRows.push(...await readRows(item.key));
    rows=key==='municipalities'
     ? mergeMunicipalityRows(oldRows,rows)
     : (mergeOfficialDataSnapshots({[key]:oldRows},{[key]:rows})[key]||rows);
   }
   const next=await writePartition(key,part,rows,allOld);
   for(const item of next)if(!allOld.has(item.key))changed++;
   shards.push(...next);
  }
  shards.sort((a,b)=>a.partition.localeCompare(b.partition)||a.partIndex-b.partIndex);
  datasets[key]={rows:shards.reduce((n,s)=>n+s.rows,0),shards};
 }
 const all=KEYS.flatMap(k=>datasets[k].shards);
 return {datasets,changedShards:changed,shardCount:all.length,compressedBytes:all.reduce((n,s)=>n+s.compressedBytes,0),uncompressedBytes:all.reduce((n,s)=>n+s.uncompressedBytes,0)};
}
export default async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'Method not allowed'});}
 const secret=process.env.YUGRA_SNAPSHOT_CRON_SECRET;
 if(!secret||req.headers.authorization!==`Bearer ${secret}`)return send(res,401,{error:'Unauthorized'});
 const started=Date.now();let activeLock=null;let previousFailureCount=0;
 try{
  activeLock=await lock();if(!activeLock)return send(res,202,{ok:true,skipped:true,reason:'refresh_already_running'});
  const previousHealth=await readJson(HEALTH);
  if(previousHealth?.status==='error'){
   previousFailureCount=Math.max(1,Number(previousHealth.failureCount)||1);
   const backoffMs=Math.min(MAX_RETRY_BACKOFF_MS,BASE_RETRY_BACKOFF_MS*Math.pow(2,Math.min(previousFailureCount-1,4)));
   const attemptedAt=Date.parse(previousHealth.lastAttemptAt||'');
   const retryIn=backoffMs-(Date.now()-attemptedAt);
   if(Number.isFinite(retryIn)&&retryIn>0)return send(res,202,{ok:true,skipped:true,reason:'source_retry_backoff',retryAfterMs:retryIn,failureCount:previousFailureCount});
  }
  const current=await readJson(CURRENT),oldManifest=current?.manifestPath?await readJson(current.manifestPath):null;
  const lastFull=Date.parse(oldManifest?.lastFullReconciliationAt||'')||0;
  const full=!oldManifest||Date.now()-lastFull>=FULL_SYNC_MS;
  const supabase=clients();
  const municipalities=full
   ? await fetchMunicipalities(supabase.core,supabase.data,[],{strict:true})
   : await fetchMunicipalities(null,supabase.data,[],{strict:true});
  const result=await fetchOfficialData(full?supabase.core:null,supabase.data,full?{}:{sinceByTable:oldManifest.cursors||{}});
  const errors=result?.cacheMeta?.errors||[];
  if(errors.length)throw new Error('Публикация отменена: '+errors.map(e=>e.key+': '+e.message).join(' · '));
  const data={...result,municipalities};
  const prepared=await prepare(data,oldManifest,full);
  if(!full&&oldManifest&&prepared.changedShards===0){
   const durationMs=Date.now()-started;
   await writeJson(HEALTH,{status:'ok',lastAttemptAt:new Date().toISOString(),lastSuccessAt:oldManifest.lastSuccessfulUpdateAt,version:oldManifest.version,durationMs,refreshType:'unchanged',counts:oldManifest.recordCounts,compressedBytes:oldManifest.compressedBytes,uncompressedBytes:oldManifest.uncompressedBytes,shardCount:oldManifest.shardCount,failureCount:0});
   return send(res,200,{ok:true,unchanged:true,version:oldManifest.version,durationMs});
  }
  const syncedAt=new Date().toISOString(),version=`${Date.now()}-${randomUUID().slice(0,8)}`;
  const sourceStatus={
   db1:{status:'ok',lastCheckedAt:full?syncedAt:oldManifest?.sourceStatus?.db1?.lastCheckedAt||null,mode:full?'full':'retained_until_full_reconciliation'},
   db2:{status:'ok',lastCheckedAt:syncedAt,mode:full?'full':'incremental'}
  };
  const manifest={
   schemaVersion:1,version,createdAt:syncedAt,lastSuccessfulUpdateAt:syncedAt,
   lastFullReconciliationAt:full?syncedAt:oldManifest.lastFullReconciliationAt,
   refreshType:full?'full':'incremental',sourceStatus,
   recordCounts:Object.fromEntries(KEYS.map(k=>[k,prepared.datasets[k].rows])),
   compressedBytes:prepared.compressedBytes,uncompressedBytes:prepared.uncompressedBytes,
   shardCount:prepared.shardCount,datasets:prepared.datasets,
   cursors:{...(oldManifest?.cursors||{}),...(result.cacheMeta?.cursorCandidates||{})}
  };
  const manifestPath=`${ROOT}/manifests/${version}.json`;
  await writeJson(manifestPath,manifest,true);
  if(current?.manifestPath)await writeJson(PREVIOUS,current);
  await writeJson(CURRENT,{version,manifestPath,publishedAt:syncedAt});
  const durationMs=Date.now()-started;
  await writeJson(HEALTH,{status:'ok',lastAttemptAt:syncedAt,lastSuccessAt:syncedAt,version,durationMs,refreshType:manifest.refreshType,counts:manifest.recordCounts,compressedBytes:manifest.compressedBytes,uncompressedBytes:manifest.uncompressedBytes,shardCount:manifest.shardCount,failureCount:0});
  console.log('Yugra18 snapshot published',{version,full,durationMs,counts:manifest.recordCounts,shards:manifest.shardCount});
  return send(res,200,{ok:true,version,refreshType:manifest.refreshType,durationMs,counts:manifest.recordCounts,shardCount:manifest.shardCount});
 }catch(error){
  const message=error?.message||String(error);console.error('Yugra18 snapshot refresh failed:',message);
  try{await writeJson(HEALTH,{status:'error',lastAttemptAt:new Date().toISOString(),durationMs:Date.now()-started,error:message.slice(0,1200),failureCount:previousFailureCount+1});}catch(e){console.error('Snapshot health write failed:',e?.message||e);}
  return send(res,500,{ok:false,error:'Snapshot refresh failed',message});
 }finally{if(activeLock)await unlock(activeLock);}
}
