const DATASETS=['municipalities','sources','indicators','investmentSites','investmentProjects','industrialEnterprises','infrastructureObjects','landParcels','programExecution','fuelPrices','facilities','externalRatings'];
async function mapLimit(items,limit,fn){const out=new Array(items.length);let next=0;await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(next<items.length){const i=next++;out[i]=await fn(items[i]);}}));return out;}
export async function fetchSharedSnapshot(version=null){
 const response=await fetch('/api/snapshot-manifest',{credentials:'same-origin',cache:'no-store'});
 if(!response.ok){const body=await response.json().catch(()=>null);throw new Error(body?.message||body?.error||`HTTP ${response.status} при загрузке снимка`);}
 const manifest=await response.json();
 if(version&&version===manifest.version)return {unchanged:true,manifest};
 const tasks=DATASETS.flatMap(dataset=>(manifest.datasets?.[dataset]?.shards||[]).map(shard=>({dataset,shard})));
 const loaded=await mapLimit(tasks,8,async({dataset,shard})=>{
  const response=await fetch('/api/snapshot-chunk?key='+encodeURIComponent(shard.key),{credentials:'same-origin',cache:'force-cache'});
  if(!response.ok)throw new Error('Не удалось загрузить часть набора '+dataset);
  return {dataset,rows:await response.json()};
 });
 const data=Object.fromEntries(DATASETS.map(key=>[key,[]]));
 for(const item of loaded)data[item.dataset].push(...item.rows);
 for(const key of DATASETS){if(data[key].length!==Number(manifest.datasets?.[key]?.rows||0))throw new Error('Неполный общий снимок: '+key);}
 return {manifest,data,unchanged:false};
}
