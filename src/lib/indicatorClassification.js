const safeText = (value) => String(value ?? '').trim();

export const PILLARS = [
  { key: 'employment', title: 'Занятость', match: /(employ|employee|unemploy|job|jobs|работник|рабоч.*мест|занят|безработ|кадр)/i, note: 'Рабочие места и занятость' },
  { key: 'income', title: 'Доходы населения', match: /(salary|wage|income|зарплат|заработ|доход насел|среднедушев)/i, note: 'Заработная плата и денежные доходы' },
  { key: 'budget', title: 'Местный бюджет', match: /(budget|revenue|expenditure|debt|deficit|tax|taxable|бюджет|налог|доходы бюджета|расходы бюджета|исполнени.*программ)/i, note: 'Доходы, расходы и исполнение программ' },
  { key: 'migration', title: 'Миграция', match: /(migration|migrat|arrival|departure|миграц|прибывш|выбывш)/i, note: 'Прибытие, выбытие и миграционное сальдо' },
  { key: 'investment', title: 'Инвестиции', match: /(investment|capital_investment|инвестици|капиталовлож)/i, note: 'Инвестиции в основной капитал' },
  { key: 'business', title: 'Предпринимательство', match: /(sme|small_business|entrepreneur|business|registered|corporate|предприним|хозяйственн.*обществ|мсп)/i, note: 'Число субъектов МСП и занятость в МСП' },
  { key: 'production', title: 'Производство и рынок', match: /(production|shipment|turnover|retail|goods|hospitality|hotel|restaurant|construction|building|industrial|industry|manufacturing|agri|agriculture|consumer_market|consumer|paid_services|oil|extraction|mining|fairs|fair|гостиниц|общепит|общественн.*питан|продукц|производств|промышлен|строительств|сельскохозяй|сельхоз|потребительск.*рын|платн.*услуг|добыч|нефт|рынок|отгруж|оборот|торговл|ярмар)/i, note: 'Производство, торговля и услуги' },
  { key: 'health', title: 'Здравоохранение', match: /(health|hospital(?!ity)|clinic|medical|doctor|physician|morbidity|здрав|медицин|больниц|поликлиник|врач|фельдшер|заболеваем)/i, note: 'Доступность медицинской помощи и показатели здоровья' },
  { key: 'education', title: 'Образование', match: /(education|school|preschool|kindergarten|student|teacher|образован|школ|дошколь|детсад|учител|учащ|студент)/i, note: 'Образовательная инфраструктура и охват' },
  { key: 'social', title: 'Социальная сфера', match: /(social|poverty|benefit|welfare|социал|малоимущ|пособ|соцзащит|пенси)/i, note: 'Социальная поддержка и уязвимость населения' },
  { key: 'demography', title: 'Демография', match: /(population|birth|death|mortality|населен|рождаем|смертн)/i, note: 'Численность и структура населения' },
  { key: 'infrastructure', title: 'Инфраструктура', match: /(facility|road|housing|network|коммунал|учрежден|дорог|жиль|сет|инфраструктур)/i, note: 'Инфраструктурные объекты и среда' },
];

export const classify = (row) => {
  // "Муниципального образования" describes the territory, not the education sector.
  const text = (safeText(row.indicator_code) + ' ' + safeText(row.indicator_name))
    .replace(/муниципального\\s+образования/gi, '');
  if (/(sme_employment_share|доля.*работников.*малых и средних)/i.test(text)) return PILLARS.find((p) => p.key === 'employment');
  if (/(sme|small_business|entrepreneur|мсп|предприним)/i.test(text)) return PILLARS.find((p) => p.key === 'business');
  return PILLARS.find((p) => p.match.test(text)) || { key: 'other', title: 'Прочие показатели', note: 'Дополнительные показатели проекта' };
};
