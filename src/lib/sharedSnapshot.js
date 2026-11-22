const DATASETS=['municipalities','sources','forecastScenarios','indicators','investmentSites','investmentProjects','industrialEnterprises','infrastructureObjects','landParcels','programExecution','fuelPrices','facilities','externalRatings'];
function compareText(field) {
  return (a, b) => String(a?.[field] ?? '').localeCompare(String(b?.[field] ?? ''), 'ru-RU', { numeric: true });
}
function compareId(a, b) {
  return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
}
function compareNumber(field, direction = 1) {
  return (a, b) => {
    const left = Number(a?.[field]);
    const right = Number(b?.[field]);
    const safeLeft = Number.isFinite(left) ? left : (direction > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
    const safeRight = Number.isFinite(right) ? right : (direction > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
    return (safeLeft - safeRight) * direction;
  };
}
function compareDate(field, direction = 1) {
  return (a, b) => {
    const left = Date.parse(a?.[field] || '') || 0;
    const right = Date.parse(b?.[field] || '') || 0;
    return (left - right) * direction;
  };
}
function chainCompare(...comparators) {
  return (a, b) => {
    for (const comparator of comparators) {
      const result = comparator(a, b);
      if (result) return result;
    }
    return 0;
  };
}
function restoreDatasetOrder(data) {
  const orders = {
    municipalities: chainCompare(compareNumber('rank2024', 1), compareText('name'), compareId),
    sources: chainCompare(compareText('category'), compareText('name'), compareId),
    forecastScenarios: chainCompare(compareNumber('display_order', 1), compareId),
    indicators: chainCompare(compareNumber('reference_year', -1), compareId),
    investmentSites: chainCompare(compareText('name'), compareId),
    investmentProjects: chainCompare(compareText('project_name'), compareId),
    industrialEnterprises: chainCompare(compareText('enterprise_name'), compareId),
    infrastructureObjects: chainCompare(compareText('name'), compareId),
    landParcels: chainCompare(compareText('municipality_id'), compareId),
    programExecution: chainCompare(compareDate('report_date', -1), compareId),
    fuelPrices: chainCompare(compareDate('observed_at', -1), compareText('source_row'), compareId),
    facilities: chainCompare(compareText('facility_category'), compareText('name_short'), compareId),
    externalRatings: chainCompare(compareText('geography_name'), compareId),
  };
  for (const [dataset, comparator] of Object.entries(orders)) {
    if (Array.isArray(data[dataset])) data[dataset].sort(comparator);
  }
  return data;
}

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
 restoreDatasetOrder(data);
 return {manifest,data,unchanged:false};
}
