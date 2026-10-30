const CATEGORY_DEFINITIONS = [
  {
    key: 'employment',
    label: 'Занятость',
    description: 'Среднесписочная численность работников, отраслевые ряды, историческая доля занятости в МСП и зарегистрированная безработица; показатели имеют разные определения и периоды.',
  },
  {
    key: 'income',
    label: 'Доходы населения',
    description: 'Пока покрытие отражает главным образом заработную плату, а не все доходы населения.',
  },
  {
    key: 'budget',
    label: 'Местный бюджет',
    description: 'Исполнение муниципальных программ — не полная сопоставимая бюджетная панель.',
  },
  {
    key: 'migration',
    label: 'Миграция',
    description: 'Числа прибывших, выбывших и миграционный прирост.',
  },
  {
    key: 'investment',
    label: 'Инвестиции',
    description: 'Инвестиции в основной капитал, включая исторический ряд без добычи за 2022–2023 годы и инвестиции за счёт местного бюджета; определения и периоды не следует смешивать без проверки.',
  },
];

function classifyIndicator(item) {
  const code = String(item?.indicator_code || '').toLocaleLowerCase('ru-RU');
  const name = String(item?.indicator_name || '').toLocaleLowerCase('ru-RU');
  const text = code + ' ' + name;

  if (/migration|migrat|arrival|departure|миграц|прибывш|выбывш/.test(text)) return 'migration';
  if (/investment|инвестици/.test(text)) return 'investment';
  if (/budget|revenue|expenditure|исполнени[ея].{0,30}программ|бюджет|расходы бюджета|доходы бюджета/.test(text)) return 'budget';
  // Salary labels often also contain the word "работников"; classify income before employment.
  if (/salary|wage|income|заработн|оплат[аы] труда|доход населения/.test(text)) return 'income';
  if (/employee|employment|employees|unemploy|unemployment|job|jobs|работник|занятост|безработ|рабоч(?:ее|их) мест/.test(text)) return 'employment';
  return null;
}

const isMunicipalVerified = (item) => item
  && item.verification_status === 'verified'
  && item.geographic_level === 'municipality'
  && item.municipality_id != null
  && String(item.municipality_id).trim() !== '';

export function buildForecastCoverage(indicators = [], programExecution = [], municipalityCount = 22) {
  const rowsByCategory = new Map(CATEGORY_DEFINITIONS.map(({ key }) => [key, []]));
  for (const item of Array.isArray(indicators) ? indicators : []) {
    if (!isMunicipalVerified(item)) continue;
    const category = classifyIndicator(item);
    if (category && rowsByCategory.has(category)) rowsByCategory.get(category).push(item);
  }

  const verifiedPrograms = (Array.isArray(programExecution) ? programExecution : [])
    .filter((item) => item && item.verification_status === 'verified' && item.municipality_id != null);
  const programMunicipalities = new Set(verifiedPrograms.map((item) => String(item.municipality_id)));

  return CATEGORY_DEFINITIONS.map((definition) => {
    const rows = rowsByCategory.get(definition.key);
    const municipalities = new Set(rows.map((item) => String(item.municipality_id)));
    let observationCount = rows.length;
    let latestYear = rows.reduce((latest, item) => {
      const year = Number(item.reference_year);
      return Number.isInteger(year) ? Math.max(latest, year) : latest;
    }, null);

    if (definition.key === 'budget') {
      for (const item of verifiedPrograms) {
        const datePrefix = String(item.report_date || '').slice(0, 4);
        if (!/^\d{4}$/.test(datePrefix)) continue;
        const year = Number(datePrefix);
        latestYear = latestYear == null ? year : Math.max(latestYear, year);
      }
      for (const id of programMunicipalities) municipalities.add(id);
      observationCount += verifiedPrograms.length;
    }

    return {
      ...definition,
      municipalityCount: municipalities.size,
      municipalityTotal: municipalityCount,
      observationCount,
      latestYear,
      available: observationCount > 0,
    };
  });
}
