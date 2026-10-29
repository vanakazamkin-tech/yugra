export const FALLBACK_DATA_SOURCES = [
  {
    id: 'rosstat_municipal',
    name: 'Росстат — База данных показателей муниципальных образований',
    category: 'official_statistics',
    url: 'https://www.rosstat.gov.ru/storage/mediabank/MUNST.htm',
    description: 'Официальные социально-экономические показатели и бюджетные данные по муниципальным образованиям.',
    format: 'HTML / XLSX',
    coverage: 'РФ; охват конкретных показателей проверяется отдельно',
    import_status: 'identified',
  },
  {
    id: 'rosstat_population_2025',
    name: 'Росстат — численность населения по муниципальным образованиям на 01.01.2025',
    category: 'demography',
    url: 'https://rosstat.gov.ru/folder/12781',
    description: 'Официальная таблица численности постоянного населения на 1 января 2025 года.',
    format: 'XLSX',
    coverage: 'РФ; названия и границы территорий требуют сопоставления',
    import_status: 'ready_for_import',
  },
  {
    id: 'rosstat_city_population_2024',
    name: 'Росстат — города Югры: численность населения на 01.01.2024',
    category: 'demography',
    url: 'https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf',
    description: 'Официальная публикация; четыре значения по городским округам импортированы с указанием года и источника.',
    format: 'PDF',
    coverage: 'Частично: 4 городских округа',
    import_status: 'partially_imported',
  },
  {
    id: 'megion_admin_territorial_population',
    name: 'Открытые данные Мегиона — население на 01.01.2025',
    category: 'demography',
    url: 'https://opendata.admmegion.ru/datasets/departament-ekonomecheskoy-politiki/34830/',
    description: 'Паспорт административно-территориального устройства: официальная строка по населению города Мегион.',
    format: 'CSV',
    coverage: 'Частичное покрытие: Мегион',
    import_status: 'partially_imported',
  },

  {
    id: 'emiss',
    name: 'Росстат — ЕМИСС',
    category: 'official_statistics',
    url: 'https://rosstat.gov.ru/emiss',
    description: 'Реестр официальных статистических показателей; применимость муниципальной детализации проверяется отдельно.',
    format: 'Веб-портал',
    coverage: 'Зависит от показателя',
    import_status: 'identified',
  },
  {
    id: 'rosstat_sme',
    name: 'Росстат — статистика малого и среднего предпринимательства',
    category: 'business',
    url: 'https://www.rosstat.gov.ru/folder/210/document/13223',
    description: 'Федеральные и региональные материалы по малому и среднему предпринимательству.',
    format: 'Публикации / XLSX',
    coverage: 'Не подменять муниципальные значения региональными',
    import_status: 'identified',
  },
  {
    id: 'investugra_portal',
    name: 'Инвестиционный портал Югры',
    category: 'investments',
    url: 'https://investugra.ru/',
    description: 'Инвестиционные проекты, предложения, инфраструктура и меры поддержки.',
    format: 'Веб-портал',
    coverage: 'По карточкам проектов',
    import_status: 'identified',
  },
  {
    id: 'investugra_map',
    name: 'Инвестиционная карта Югры',
    category: 'investment_sites',
    url: 'https://map.investugra.ru/',
    description: 'Инвестиционные площадки и инфраструктурные предложения на карте.',
    format: 'Веб-карта',
    coverage: 'По объектам карты',
    import_status: 'identified',
  },
  {
    id: 'megion_investment_sites',
    name: 'Открытые данные Мегиона — инвестиционные площадки',
    category: 'investment_sites',
    url: 'https://opendata.admmegion.ru/datasets/upravlenie-arkhitektury-i-gradostroitelstva/76774/',
    description: 'Муниципальный CSV-набор площадок с параметрами участков и условиями предоставления.',
    format: 'CSV',
    coverage: 'Мегион; одно муниципальное образование',
    import_status: 'partially_imported',
  },
  {
    id: 'megion_open_data',
    name: 'Портал открытых данных Мегиона',
    category: 'municipal_open_data',
    url: 'https://opendata.admmegion.ru/datasets/',
    description: 'Каталог открытых данных по бюджету, муниципальным программам, объектам и городскому хозяйству.',
    format: 'CSV / веб-наборы',
    coverage: 'Мегион; одно муниципальное образование',
    import_status: 'identified',
  },
];

export async function fetchOfficialData(client) {
  if (!client) {
    return { sources: FALLBACK_DATA_SOURCES, indicators: [], investmentSites: [] };
  }

  const [sourcesResult, indicatorsResult, sitesResult, programsResult] = await Promise.all([
    client.from('data_sources')
      .select('id,name,category,url,description,format,coverage,update_frequency,import_status,last_checked_at,notes')
      .order('category', { ascending: true })
      .order('name', { ascending: true }),
    client.from('municipality_indicators')
      .select('id,municipality_id,indicator_code,indicator_name,reference_year,value,unit,source_id,source_url,source_published_at,retrieved_at,verification_status,notes,geographic_level,geographic_name')
      .eq('verification_status', 'verified')
      .order('reference_year', { ascending: false }),
    client.from('investment_sites')
      .select('id,municipality_id,source_id,external_id,name,site_type,location_text,area_hectares,land_status,offer_type,permitted_use,source_url,source_updated_at,verification_status,retrieved_at')
      .eq('verification_status', 'verified')
      .order('name', { ascending: true }),
    client.from('municipal_program_execution')
      .select('id,municipality_id,source_id,program_code,program_name,report_date,approved_budget_thousand,revised_budget_thousand,executed_budget_thousand,execution_percent,source_url,source_published_at,retrieved_at,verification_status,notes')
      .eq('verification_status', 'verified')
      .order('report_date', { ascending: false }),
  ]);

  // A failed query is surfaced rather than being silently treated as an empty official dataset.
  if (sourcesResult.error) throw sourcesResult.error;
  if (indicatorsResult.error) throw indicatorsResult.error;
  if (sitesResult.error) throw sitesResult.error;
  if (programsResult.error) throw programsResult.error;

  return {
    sources: Array.isArray(sourcesResult.data) && sourcesResult.data.length
      ? sourcesResult.data
      : FALLBACK_DATA_SOURCES,
    indicators: Array.isArray(indicatorsResult.data) ? indicatorsResult.data : [],
    investmentSites: Array.isArray(sitesResult.data) ? sitesResult.data : [],
    programExecution: Array.isArray(programsResult.data) ? programsResult.data : [],
  };
}

export const DATA_CATEGORY_LABELS = {
  official_statistics: 'ОФИЦИАЛЬНАЯ СТАТИСТИКА',
  demography: 'ДЕМОГРАФИЯ',
  business: 'БИЗНЕС И МСП',
  investments: 'ИНВЕСТИЦИИ',
  investment_sites: 'ИНВЕСТПЛОЩАДКИ',
  municipal_open_data: 'МУНИЦИПАЛЬНЫЕ ДАННЫЕ',
};

export const DATA_STATUS_LABELS = {
  identified: 'Источник найден · данные ещё не импортированы',
  ready_for_import: 'Подготовлен к загрузке',
  partially_imported: 'Загружен частично',
  imported: 'Данные импортированы',
  access_issue: 'Требуется проверить доступ к данным',
};
