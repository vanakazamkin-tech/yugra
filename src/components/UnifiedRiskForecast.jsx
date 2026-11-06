import React, { useEffect, useMemo, useState } from 'react';
import { isEligibleAnnualForecastSeries } from '../lib/forecastCoverage.js';
import { backtestAnnualSeries, buildRiskModel, deriveMunicipalIndicators, MODEL_PILLARS, RISK_CHAINS } from '../lib/riskModel.js';
import './UnifiedRiskForecast.css';

const PILLARS = [
  { key: 'employment', title: 'Занятость', match: /(employ|employee|unemploy|работник|занят|безработ|кадр)/i, note: 'Рабочие места и занятость' },
  { key: 'income', title: 'Доходы населения', match: /(salary|wage|income|зарплат|заработ|доход насел|среднедушев)/i, note: 'Заработная плата и денежные доходы' },
  { key: 'budget', title: 'Местный бюджет', match: /(budget|revenue|expenditure|debt|deficit|бюджет|доходы бюджета|расходы бюджета|исполнени.*программ)/i, note: 'Доходы, расходы и исполнение программ' },
  { key: 'migration', title: 'Миграция', match: /(migration|migrat|arrival|departure|миграц|прибывш|выбывш)/i, note: 'Прибытие, выбытие и миграционное сальдо' },
  { key: 'investment', title: 'Инвестиции', match: /(investment|capital_investment|инвестици|капиталовлож)/i, note: 'Инвестиции в основной капитал' },
  { key: 'business', title: 'Предпринимательство', match: /(sme|small_business|entrepreneur|business|предприним|мсп)/i, note: 'Число субъектов МСП и занятость в МСП' },
  { key: 'production', title: 'Производство и рынок', match: /(production|shipment|turnover|retail|goods|продукц|отгруж|оборот|торговл|ярмарк)/i, note: 'Производство, торговля и услуги' },
  { key: 'demography', title: 'Демография', match: /(population|birth|death|населен|рождаем|смертн)/i, note: 'Численность и структура населения' },
  { key: 'infrastructure', title: 'Инфраструктура', match: /(facility|school|preschool|road|housing|network|учрежден|школ|дорог|жиль|сет)/i, note: 'Инфраструктурные объекты и среда' },
];
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const number = (v) => v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
const fmt = (v, digits = 1) => v == null || !Number.isFinite(Number(v)) ? '—' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(Number(v));
const pct = (v) => v == null ? '—' : (v > 0 ? '+' : '') + fmt(v, 1) + '%';
const safeText = (v) => String(v ?? '').trim();
const classify = (row) => {
  const text = safeText(row.indicator_code) + ' ' + safeText(row.indicator_name);
  if (/(sme_employment_share|доля.*работников.*малых и средних)/i.test(text)) return PILLARS.find((p) => p.key === 'employment');
  if (/(sme|small_business|entrepreneur|мсп|предприним)/i.test(text)) return PILLARS.find((p) => p.key === 'business');
  return PILLARS.find((p) => p.match.test(text)) || { key: 'other', title: 'Прочие показатели', note: 'Дополнительные показатели проекта' };
};
const directionFor = (row) => {
  const code = safeText(row.indicator_code).toLowerCase();
  const s = (code + ' ' + safeText(row.indicator_name)).toLowerCase();
  // Направление задаётся только для показателей, где знак изменения можно объяснить без скрытых допущений.
  if (/(unemploy|registered_unemployed|poverty|below_poverty|death_rate|mortality|noncompliant_roads|arrears|deficit|debt|budget_transfer_dependency|derived_budget_transfer_dependency|аварийн|износ|смертн|бедност|безработ|не отвечающ.*норматив)/i.test(s)) return 'lower';
  if (/(employment_share|sme_per_10k|real_disposable_income|real_income|industrial_production_index|physical_index|productivity|budget_own_revenue_share|budget_balance_ratio|population_growth_rate|investment_per_capita|derived_population_growth_rate|положительн.*миграц|уровень занятости|доля занятых|индекс физического объём|индекс физического объем|реальн.*доход)/i.test(s)) return 'higher';
  // Абсолютные номинальные суммы, зарплаты без дефлятора, численность, миграция и обороты требуют контекста.
  return 'context';
};
const signature = (row) => {
  const p = safeText(row.reference_period);
  const q = p.match(/-Q([1-4])/i), h = p.match(/-H([12])/i);
  if (q) return 'Q' + q[1];
  if (h) return 'H' + h[1];
  if (/annual|год|^\d{4}$/.test(p.toLowerCase())) return 'annual';
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return 'date';
  return p || 'annual';
};
const periodOrder = (row) => {
  const p = safeText(row.reference_period || row.reference_year);
  const year = Number(row.reference_year) || Number(p.slice(0, 4)) || 0;
  const q = p.match(/Q([1-4])/i), h = p.match(/H([12])/i);
  if (q) return year * 10 + Number(q[1]);
  if (h) return year * 10 + Number(h[1]) * 5;
  const d = p.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (d) return Number(d[1]) * 10000 + Number(d[2]) * 100 + Number(d[3]);
  return year;
};
function buildSeries(rows) {
  const groups = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    // Риск-оценка строится только на явно подтверждённых муниципальных наблюдениях.
    // Отсутствующий статус или геоуровень не считаются подтверждением.
    if (!row || row.verification_status !== 'verified') return;
    if (row.geographic_level !== 'municipality') return;
    const value = number(row.value);
    if (value == null || !safeText(row.municipality_id) || !safeText(row.indicator_code)) return;
    const key = [row.municipality_id, row.indicator_code, row.unit || '', signature(row)].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...row, numericValue: value, order: periodOrder(row) });
  });
  const result = [];
  groups.forEach((items, key) => {
    const unique = new Map();
    items.forEach((item) => {
      // Один временной срез не должен превращаться в несколько точек из-за разных источников.
      const natural = [item.reference_year, signature(item)].join('|');
      if (!unique.has(natural) || new Date(item.retrieved_at || 0) > new Date(unique.get(natural).retrieved_at || 0)) unique.set(natural, item);
    });
    const points = [...unique.values()].sort((a, b) => a.order - b.order);
    if (!points.length) return;
    const latest = points[points.length - 1];
    const previous = points.length > 1 ? points[points.length - 2] : null;
    const change = previous ? latest.numericValue - previous.numericValue : null;
    const changePercent = previous && previous.numericValue !== 0 ? change / Math.abs(previous.numericValue) * 100 : null;
    const direction = directionFor(latest);
    const adverse = change == null || direction === 'context' ? null : direction === 'lower' ? change > 0 : change < 0;
    result.push({ key, municipalityId: latest.municipality_id, code: latest.indicator_code, name: safeText(latest.indicator_name) || latest.indicator_code, unit: latest.unit || '—', pillar: classify(latest), direction, points, latest, previous, change, changePercent, adverse });
  });
  return result;
}
const RISK = {
  critical: { label: 'Несколько ухудшений', short: 'Высокое внимание', color: 'red' },
  watch: { label: 'Есть ухудшения', short: 'Наблюдение', color: 'yellow' },
  stable: { label: 'Негативных сигналов нет', short: 'Без сигналов', color: 'green' },
  insufficient: { label: 'Недостаточно данных', short: 'Нет оценки', color: 'neutral' },
};
function assess(signals) {
  const usable = signals.filter((s) => s.adverse !== null);
  const bad = usable.filter((s) => s.adverse);
  if (usable.length < 2) return { level: 'insufficient', usable, bad };
  if (bad.length >= 3 && new Set(bad.map((s) => s.pillar.key)).size >= 2) return { level: 'critical', usable, bad };
  if (bad.length > 0) return { level: 'watch', usable, bad };
  return { level: 'stable', usable, bad };
}
const DEFAULT_SCENARIOS = [
  { key: 'cautious', title: 'Стрессовый', summary: 'Неблагоприятные внешние условия и рост издержек.', investment_growth_rate: -8, sme_growth_rate: -4, score_growth_rate: -3, uncertainty_rate: 18 },
  { key: 'base', title: 'Базовый', summary: 'Продолжение наблюдаемых тенденций при текущих условиях.', investment_growth_rate: 4, sme_growth_rate: 3, score_growth_rate: 1.5, uncertainty_rate: 7 },
  { key: 'ambitious', title: 'Благоприятный', summary: 'Улучшение инвестиционной активности и деловой среды.', investment_growth_rate: 8, sme_growth_rate: 6, score_growth_rate: 3, uncertainty_rate: 12 },
];
const periodLabel = (row) => safeText(row?.reference_period) || String(row?.reference_year || '—');
const directionText = (s) => s.direction === 'higher' ? 'снижение — негативный сигнал' : s.direction === 'lower' ? 'рост — негативный сигнал' : 'изменение требует контекста';

export default function UnifiedRiskForecast({ municipalities = [], officialIndicators = [], programExecution = [], supabase, isSupabaseConfigured, officialDataStatus = 'offline', officialDataSyncedAt = null }) {
  const [tab, setTab] = useState('overview');
  const [municipalityId, setMunicipalityId] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState('');
  const [selectedSeriesKey, setSelectedSeriesKey] = useState('');
  const [horizon, setHorizon] = useState(3);
  const [extraShock, setExtraShock] = useState(0);
  const [scenarios, setScenarios] = useState(DEFAULT_SCENARIOS);
  const [scenarioSource, setScenarioSource] = useState('встроенные шаблоны');
  const [scenarioError, setScenarioError] = useState('');
  const [modelShocks, setModelShocks] = useState({ economy: 0, labour: 0, demography: 0, finance: 0, social: 0, infrastructure: 0 });

  useEffect(() => {
    let cancelled = false;
    async function loadScenarios() {
      if (!supabase || !isSupabaseConfigured) return;
      try {
        const { data, error } = await supabase.from('forecast_scenarios').select('key,title,summary,investment_growth_rate,sme_growth_rate,score_growth_rate,uncertainty_rate,display_order').eq('is_active', true).order('display_order', { ascending: true });
        if (cancelled) return;
        if (error) throw error;
        if (Array.isArray(data) && data.length) {
          setScenarios(data);
          setScenarioSource('Supabase');
        }
      } catch (error) {
        if (!cancelled) setScenarioError(error?.message || 'Не удалось загрузить параметры сценариев');
      }
    }
    loadScenarios();
    return () => { cancelled = true; };
  }, [supabase, isSupabaseConfigured]);

  const rows = useMemo(() => {
    const base = [
    ...(Array.isArray(officialIndicators) ? officialIndicators : []),
    ...(Array.isArray(programExecution) ? programExecution : []).map((item) => ({
      municipality_id: item.municipality_id, indicator_code: 'municipal_program_execution_rate',
      indicator_name: 'Исполнение муниципальных программ', reference_year: Number(String(item.report_date || '').slice(0, 4)) || null,
      reference_period: item.report_date || '', value: item.execution_percent, unit: '%',
      source_url: item.source_url, source_id: item.source_id, verification_status: item.verification_status, geographic_level: 'municipality',
    })),
    ];
    return [...base, ...deriveMunicipalIndicators(base)];
  }, [officialIndicators, programExecution]);
  const series = useMemo(() => buildSeries(rows), [rows]);
  const riskModel = useMemo(() => buildRiskModel(municipalities, series), [municipalities, series]);
  const municipalityNames = useMemo(() => new Map(municipalities.map((m) => [m.id, m.name])), [municipalities]);
  const visibleSeries = useMemo(() => series.filter((s) =>
    (municipalityId === 'ALL' || s.municipalityId === municipalityId)
    && (!search || (s.name + ' ' + s.code + ' ' + (municipalityNames.get(s.municipalityId) || '')).toLowerCase().includes(search.toLowerCase()))
  ), [series, municipalityId, search, municipalityNames]);
  const municipalityAnalysis = useMemo(() => municipalities.map((m) => {
    const own = series.filter((s) => s.municipalityId === m.id);
    const assessment = assess(own);
    const pillars = PILLARS.map((p) => ({ ...p, series: own.filter((s) => s.pillar.key === p.key) })).filter((p) => p.series.length);
    return { ...m, own, pillars, ...assessment, coverage: own.length, model: riskModel.byMunicipality[m.id] || null };
  }).sort((a, b) => {
    const priority = { critical: 0, watch: 1, stable: 2, insufficient: 3 };
    return priority[a.level] - priority[b.level] || b.bad.length - a.bad.length || String(a.name || a.id).localeCompare(String(b.name || b.id), 'ru-RU');
  }), [municipalities, series, riskModel]);
  const filteredMunicipalities = municipalityAnalysis.filter((m) => municipalityId === 'ALL' || m.id === municipalityId);
  const counts = {
    critical: filteredMunicipalities.filter((m) => m.level === 'critical').length,
    watch: filteredMunicipalities.filter((m) => m.level === 'watch').length,
    stable: filteredMunicipalities.filter((m) => m.level === 'stable').length,
    insufficient: filteredMunicipalities.filter((m) => m.level === 'insufficient').length,
  };
  const pillarSummary = PILLARS.map((p) => {
    const group = series.filter((s) => s.pillar.key === p.key);
    return { ...p, count: group.length, territories: new Set(group.map((s) => s.municipalityId)).size, deteriorating: group.filter((s) => s.adverse === true).length };
  });
  const coreCoverage = useMemo(() => {
    const core = ['employment','income','budget','migration','investment'];
    return core.map((key) => {
      const pillar = PILLARS.find((p) => p.key === key);
      const items = series.filter((s) => s.pillar.key === key);
      const territories = new Set(items.map((s) => s.municipalityId));
      return { ...pillar, territories: territories.size, rows: items.length, missing: municipalities.filter((m) => !territories.has(m.id)).map((m) => m.name) };
    });
  }, [series, municipalities]);
  const selected = municipalityAnalysis.find((m) => m.id === (selectedMunicipality || municipalityId)) || municipalityAnalysis[0];
  const forecastOptions = useMemo(() => series.filter((s) => signature(s.latest) === 'annual' && isEligibleAnnualForecastSeries(s)), [series]);
  const forecastSeries = forecastOptions.find((s) => s.key === selectedSeriesKey) || forecastOptions.find((s) => s.municipalityId === (municipalityId === 'ALL' ? selected?.id : municipalityId)) || forecastOptions[0] || null;
  const forecastMunicipality = forecastSeries ? municipalityNames.get(forecastSeries.municipalityId) || forecastSeries.municipalityId : '—';
  const history = forecastSeries?.points || [];
  const forecastBacktest = useMemo(() => backtestAnnualSeries(forecastSeries), [forecastSeries]);
  const annualRates = history.slice(1).map((p, i) => {
    const previous = history[i];
    const gap = (Number(p.reference_year) || p.order) - (Number(previous.reference_year) || previous.order);
    return gap > 0 && previous.numericValue !== 0 ? (Math.pow(Math.abs(p.numericValue / previous.numericValue), 1 / gap) * Math.sign(p.numericValue / previous.numericValue) - 1) * 100 : null;
  }).filter((v) => Number.isFinite(v));
  const observedRate = annualRates.length ? annualRates[annualRates.length - 1] : 0;
  const stableRate = annualRates.length ? annualRates.reduce((a, b) => a + b, 0) / annualRates.length : 0;
  const baseRate = annualRates.length > 1 ? stableRate * 0.5 + observedRate * 0.5 : observedRate;
  const scenarioField = forecastSeries?.pillar.key === 'investment' ? 'investment_growth_rate' : forecastSeries?.pillar.key === 'business' ? 'sme_growth_rate' : null;
  const forecastRows = forecastSeries ? scenarios.map((s) => {
    const assumption = scenarioField ? Number(s[scenarioField] ?? 0) : 0;
    const rate = baseRate + assumption + extraShock;
    const value = forecastSeries.latest.numericValue * Math.pow(Math.max(0.01, 1 + rate / 100), horizon);
    const uncertainty = Math.max(0, Number(s.uncertainty_rate ?? 0));
    return { ...s, rate, value, low: forecastSeries.latest.numericValue * Math.pow(Math.max(0.01, 1 + (rate - uncertainty) / 100), horizon), high: forecastSeries.latest.numericValue * Math.pow(Math.max(0.01, 1 + (rate + uncertainty) / 100), horizon) };
  }) : [];
  const lastYear = forecastSeries?.latest?.reference_year || '—';
  const syncLabel = officialDataSyncedAt ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(officialDataSyncedAt)) : null;

  const exportCsv = (data, name) => {
    const escape = (v) => {
      let x = String(v ?? '');
      const first = x.trimStart()[0];
      if (typeof v === 'string' && (['=', '+', '-', '@'].includes(first) || first === String.fromCharCode(9) || first === String.fromCharCode(13))) x = "'" + x;
      return '"' + x.replaceAll('"', '""') + '"';
    };
    const csv = '\uFEFF' + data.map((r) => r.map(escape).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  return <section className="panel full-panel unified-system">
    <header className="unified-hero">
      <div><span className="eyebrow">АНАЛИТИЧЕСКАЯ СИСТЕМА · ХАНТЫ-МАНСИЙСКИЙ АВТОНОМНЫЙ ОКРУГ — ЮГРА</span><h1>Модель прогнозирования социально-экономической устойчивости муниципалитетов Югры в условиях санкционного давления</h1><p>Оценка устойчивости территорий, анализ каналов внешнего санкционного воздействия, раннее выявление взаимосвязанных рисков и сценарная проверка возможных траекторий развития.</p></div>
      <span className="concept-corner">КОНЦЕПТ МОДЕЛИ · ВЕРСИЯ 1.1</span>
    </header>
    <div className="unified-warning"><strong>Статус концепта.</strong> Расчёты используют подтверждённые муниципальные наблюдения и производные коэффициенты. Интегральный индекс, веса и сценарные воздействия — исследовательская методика концепта. Они не являются официальным рейтингом или вероятностью кризиса; выводы требуют проверки первоисточников и экспертной калибровки. Для управленческого применения необходимы экспертная калибровка и историческая валидация.</div>
    <nav className="unified-tabs" aria-label="Разделы аналитики">
      <button className={tab === 'concept' ? 'active' : ''} onClick={() => setTab('concept')}>Концепция модели</button>
      <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Панель модели</button>
      <button className={tab === 'municipality' ? 'active' : ''} onClick={() => setTab('municipality')}>Разбор муниципалитета</button>
      <button className={tab === 'forecast' ? 'active' : ''} onClick={() => setTab('forecast')}>Сценарный прогноз</button>
      <button className={tab === 'model' ? 'active' : ''} onClick={() => setTab('model')}>Индекс устойчивости</button>
      <button className={tab === 'chains' ? 'active' : ''} onClick={() => setTab('chains')}>Каналы санкционного давления и риски</button>
      <button className={tab === 'indicators' ? 'active' : ''} onClick={() => setTab('indicators')}>Показатели и данные</button>
    </nav>
    <div className="unified-filters">
      <label>Территория<select value={municipalityId} onChange={(e) => { setMunicipalityId(e.target.value); setSelectedMunicipality(e.target.value === 'ALL' ? '' : e.target.value); }}><option value="ALL">Все муниципалитеты</option>{municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      <label className="unified-search">Поиск<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Показатель или муниципалитет"/></label>
    </div>


    {tab === 'concept' && <section className="unified-section unified-concept">
      <div className="unified-section-head"><div><h2>Архитектура модели прогнозирования</h2><p>Логика системы: от внешнего санкционного шока до оценки последствий для социально-экономической устойчивости муниципалитета.</p></div><span>Концептуальная схема</span></div>
      <div className="unified-concept-flow">
        <article><small>01 · ВНЕШНЯЯ СРЕДА</small><strong>Санкционное давление</strong><p>Ограничения торговли, технологий, оборудования, финансовых операций и логистики; изменение сырьевой конъюнктуры и внешнего спроса.</p></article>
        <div className="unified-concept-arrow">↓</div>
        <article><small>02 · КАНАЛЫ ПЕРЕДАЧИ</small><strong>Воздействие на экономику</strong><p>Импортозамещение и технологическая доступность · инвестиции и издержки · экспортный спрос · бюджетные доходы · рынок труда · малый бизнес.</p></article>
        <div className="unified-concept-arrow">↓</div>
        <article><small>03 · УЯЗВИМОСТИ ТЕРРИТОРИЙ</small><strong>Структура муниципальной экономики</strong><p>Отраслевая концентрация, зависимость от крупных работодателей, бюджетная самостоятельность, кадровая база, демографическая ситуация и доступность инфраструктуры.</p></article>
        <div className="unified-concept-arrow">↓</div>
        <article><small>04 · АНАЛИТИЧЕСКОЕ ЯДРО</small><strong>Индикаторы и индекс устойчивости</strong><p>Сопоставление подтверждённых показателей, оценка динамики, выявление негативных сигналов и расчёт компонентов устойчивости с контролем полноты данных.</p></article>
        <div className="unified-concept-arrow">↓</div>
        <article><small>05 · ПРОГНОЗ И РИСКИ</small><strong>Сценарии и раннее предупреждение</strong><p>Базовый, стрессовый и адаптационный сценарии; проверка чувствительности; выявление цепочек взаимосвязанных рисков и горизонтов их проявления.</p></article>
        <div className="unified-concept-arrow">↓</div>
        <article><small>06 · РЕЗУЛЬТАТ ДЛЯ УПРАВЛЕНИЯ</small><strong>Профиль устойчивости и меры реагирования</strong><p>Паспорт муниципалитета, карта уязвимостей, приоритеты мониторинга, перечень требуемых данных и варианты адресных управленческих мер.</p></article>
      </div>
      <div className="unified-section-head"><div><h3>Шесть компонентов устойчивости</h3><p>Каждый компонент объединяет группу индикаторов. Веса являются стартовыми экспертными допущениями и должны пройти калибровку.</p></div></div>
      <div className="unified-model-weight-grid">{MODEL_PILLARS.map((p) => <article className="unified-model-weight" key={p.key}><strong>{p.title}</strong><b>{Math.round(p.weight*100)}%</b><small>{p.series.join(' · ')}</small></article>)}</div>
      <div className="unified-section-head"><div><h3>Принципы моделирования</h3></div></div>
      <div className="unified-principles-grid">
        <article><strong>Доказательность</strong><p>В расчёт попадают подтверждённые муниципальные наблюдения. Концептуальные сценарные параметры отделены от официальной статистики.</p></article>
        <article><strong>Сопоставимость</strong><p>Сравнение выполняется по одному показателю, единице измерения, периоду и году. Несопоставимые ряды не объединяются.</p></article>
        <article><strong>Объяснимость</strong><p>Каждый сигнал должен быть связан с конкретным индикатором, периодом, направлением изменения и источником.</p></article>
        <article><strong>Неопределённость</strong><p>Система показывает полноту покрытия и ограничения. Недостающие значения не заменяются нулями и не считаются отсутствием риска.</p></article>
      </div>
      <div className="unified-warning"><strong>Граница текущего прототипа.</strong> Прямой индекс санкционной экспозиции пока не рассчитывается: для него нужны сопоставимые сведения об отраслевой структуре, импортной зависимости, критическом оборудовании, экспортных рынках и цепочках поставок. Пока система анализирует наблюдаемые муниципальные последствия и позволяет проверять гипотезы о каналах воздействия.</div>
    </section>}

    {tab === 'overview' && <>
      <div className="unified-kpis">
        <article className="risk-kpi risk-kpi-red"><div><small>НЕСКОЛЬКО УХУДШЕНИЙ</small><strong>{counts.critical}</strong><span>муниципалитетов с 3+ негативными сигналами</span></div></article>
        <article className="risk-kpi risk-kpi-yellow"><div><small>ЕСТЬ УХУДШЕНИЯ</small><strong>{counts.watch}</strong><span>хотя бы один негативный сигнал</span></div></article>
        <article className="risk-kpi risk-kpi-green"><div><small>БЕЗ НЕГАТИВНЫХ СИГНАЛОВ</small><strong>{counts.stable}</strong><span>не менее двух оцениваемых рядов</span></div></article>
        <article className="risk-kpi risk-kpi-neutral"><div><small>НЕДОСТАТОЧНО ДАННЫХ</small><strong>{counts.insufficient}</strong><span>нельзя надёжно оценить динамику</span></div></article>
      </div>
      <section className="unified-section">
        <div className="unified-section-head"><div><h2>Где ситуация требует внимания</h2><p>Список отсортирован по числу одновременно ухудшающихся направлений. Нажмите на территорию для подробного разбора.</p></div><button className="outline-button" onClick={() => exportCsv([['Муниципалитет','Статус','Оцениваемых рядов','Негативных сигналов','Показатели'], ...filteredMunicipalities.map((m) => [m.name,RISK[m.level].label,m.usable.length,m.bad.length,m.bad.map((s) => s.name).join(', ')])], 'yugra-risk-overview.csv')}>Экспорт CSV</button></div>
        <div className="table-scroll"><table className="ranking-table risk-table"><thead><tr><th>Муниципалитет</th><th>Сигнал системы</th><th>Рядов с направлением</th><th>Ухудшений</th><th>Что ухудшается</th><th></th></tr></thead><tbody>
          {filteredMunicipalities.map((m) => <tr key={m.id}><td><strong>{m.name}</strong></td><td><span className={'risk-zone-badge risk-zone-' + (m.level === 'critical' ? 'red' : m.level === 'watch' ? 'yellow' : m.level === 'stable' ? 'green' : 'unknown')}>{RISK[m.level].label}</span></td><td>{m.usable.length}</td><td>{m.bad.length}</td><td>{m.bad.slice(0,3).map((s) => s.name).join('; ') || 'Нет подтверждённого ухудшения по оцениваемым рядам'}</td><td><button className="outline-button" onClick={() => { setSelectedMunicipality(m.id); setTab('municipality'); }}>Разобрать</button></td></tr>)}
        </tbody></table></div>
      </section>
      <section className="unified-section">
        <div className="unified-section-head"><div><h2>Покрытие ключевых направлений</h2><p>Показывает, где есть подтверждённые ряды, а где выводы пока ограничены отсутствием данных.</p></div><span>{rows.filter((r) => r.verification_status === 'verified' && (r.geographic_level || 'municipality') === 'municipality').length.toLocaleString('ru-RU')} подтверждённых наблюдений</span></div>
        <div className="unified-pillar-grid">{pillarSummary.filter((p) => ['employment','income','budget','migration','investment'].includes(p.key)).map((p) => <article className="unified-pillar" key={p.key}><strong>{p.title}</strong><div className="unified-track"><i style={{width: Math.min(100,p.territories / Math.max(1,municipalities.length) * 100) + '%'}}/></div><p><b>{p.territories}/{municipalities.length}</b> территорий · {p.count} временных рядов</p><small>{p.deteriorating} негативных сигналов · {p.note}</small></article>)}</div>
      </section>
      <section className="unified-section">
        <div className="unified-section-head"><div><h2>Покрытие ключевых направлений по территориям</h2><p>Показывает реальное наличие подтверждённых рядов, а не оценку благополучия. Нажмите на направление, чтобы отфильтровать реестр.</p></div><span>{municipalities.length} муниципалитетов в справочнике</span></div>
        <div className="table-scroll"><table className="ranking-table"><thead><tr><th>Направление</th><th>Территорий с данными</th><th>Временных рядов</th><th>Где пока нет данных</th></tr></thead><tbody>{coreCoverage.map((p) => <tr key={p.key}><td><strong>{p.title}</strong></td><td>{p.territories}/{municipalities.length}</td><td>{p.rows}</td><td>{p.missing.length ? p.missing.join(', ') : 'Покрытие по всем территориям'}</td></tr>)}</tbody></table></div>
        <p className="unified-muted">Наличие хотя бы одного ряда не означает наличие полной временной истории или сопоставимости всех муниципалитетов. Перед сравнением учитывайте единицы, период и методику.</p>
      </section>
      <section className="unified-section">
        <div className="unified-section-head"><div><h2>Сигналы, требующие проверки</h2><p>Показываем изменение только там, где направление показателя можно интерпретировать. Для контекстных рядов изменение не окрашивается как «хорошее» или «плохое».</p></div><span>{visibleSeries.filter((s) => s.adverse === true).length} негативных сигналов</span></div>
        <div className="table-scroll"><table className="ranking-table"><thead><tr><th>Муниципалитет</th><th>Направление</th><th>Показатель</th><th>Было</th><th>Стало</th><th>Изменение</th><th>Период</th></tr></thead><tbody>{visibleSeries.filter((s) => s.adverse !== null).sort((a,b) => Number(b.adverse)-Number(a.adverse) || Math.abs(b.changePercent || 0)-Math.abs(a.changePercent || 0)).slice(0,60).map((s) => <tr key={s.key}><td>{municipalityNames.get(s.municipalityId) || s.municipalityId}</td><td>{s.pillar.title}</td><td>{s.name}</td><td>{fmt(s.previous?.numericValue,2)} {s.unit}</td><td>{fmt(s.latest.numericValue,2)} {s.unit}</td><td className={s.adverse ? 'trend-negative' : 'trend-positive'}>{pct(s.changePercent)}</td><td>{periodLabel(s.previous)} → {periodLabel(s.latest)}</td></tr>)}</tbody></table>{visibleSeries.every((s) => s.adverse === null) && <p className="empty-state">Для выбранных фильтров пока нет рядов с однозначным направлением.</p>}</div>
      </section>
    </>}

    {tab === 'municipality' && <section className="unified-section">
      <div className="unified-section-head"><div><h2>Паспорт рисков территории</h2><p>Конкретные изменения, контекст показателей и ограничения данных.</p></div><select value={selected?.id || ''} onChange={(e) => setSelectedMunicipality(e.target.value)}>{municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
      {selected && <>
        <div className="municipality-risk-summary"><div><span>Сигнал системы</span><strong>{RISK[selected.level].label}</strong></div><div><span>Рядов с понятным направлением</span><strong>{selected.usable.length}</strong></div><div><span>Негативных изменений</span><strong>{selected.bad.length}</strong></div><div><span>Всего подтверждённых рядов</span><strong>{selected.coverage}</strong></div></div>
        <div className="unified-model-result"><span>Индекс устойчивости · пилотная оценка</span><strong>{selected.model?.score == null ? 'Недостаточно данных' : fmt(selected.model.score,1) + ' / 100' + (selected.model.assessmentStatus === 'partial' ? ' · частично' : '')}</strong><small>Покрытие весов: {selected.model?.availableWeight ?? 0}% · полнота: {selected.model?.score == null ? 'не оценивается' : selected.model.confidence + '%'}</small></div>
        <div className="unified-explanation"><h3>Что это означает</h3><p>{selected.level === 'critical' ? 'Одновременно ухудшаются несколько показателей. Это основание для предметной проверки причин и подготовки мер реагирования, но не доказательство кризиса.' : selected.level === 'watch' ? 'Есть отдельные негативные изменения. Нужно проверить источник, устойчивость тенденции и связь с другими показателями.' : selected.level === 'stable' ? 'Среди показателей с однозначным направлением негативных изменений не выявлено. Это не означает отсутствие проблем: часть показателей контекстная, а полнота данных ограничена.' : 'Подтверждённых сопоставимых рядов с однозначным направлением недостаточно. Системе нельзя присваивать территории благополучный статус; приоритет — сбор и проверка данных.'}</p></div>
        <h3>Негативные сигналы</h3>
        {selected.bad.length ? <div className="unified-signal-list">{selected.bad.map((s) => <article key={s.key}><div><strong>{s.name}</strong><span>{s.pillar.title}</span></div><b>{pct(s.changePercent)}</b><p>{fmt(s.previous?.numericValue,2)} → {fmt(s.latest.numericValue,2)} {s.unit} · {periodLabel(s.previous)} → {periodLabel(s.latest)}</p><small>Интерпретация: {directionText(s)}. Проверьте методику и первоисточник перед управленческим решением.</small>{s.latest.source_url && <a href={s.latest.source_url} target="_blank" rel="noreferrer">Открыть первоисточник ↗</a>}</article>)}</div> : <p className="empty-state">По текущим подтверждённым рядам негативные сигналы не выявлены либо данных недостаточно.</p>}
        <h3>Все направления и ограничения</h3>
        <div className="unified-pillar-grid">{PILLARS.map((p) => { const items = selected.own.filter((s) => s.pillar.key === p.key); return <article className="unified-pillar" key={p.key}><strong>{p.title}</strong><p>{items.length ? items.length + ' временных рядов' : 'Нет подтверждённых рядов'}</p><small>{items.filter((s) => s.adverse === true).length} ухудшений · {items.filter((s) => s.direction === 'context').length} контекстных показателей</small></article>; })}</div>
      </>}
    </section>}

    {tab === 'forecast' && <section className="unified-section unified-forecast">
      <div className="unified-section-head"><div><h2>Сценарное прогнозирование</h2><p>Траектория рассчитывается отдельно по выбранному годовому ряду. Выберите территорию и показатель.</p></div><span>Параметры: {scenarioSource}</span></div>
      <div className="unified-forecast-controls">
        <label>Муниципалитет<select value={forecastSeries?.municipalityId || ''} onChange={(e) => { const found = forecastOptions.find((s) => s.municipalityId === e.target.value && s.key === forecastSeries?.key); setSelectedSeriesKey(found?.key || forecastOptions.find((s) => s.municipalityId === e.target.value)?.key || ''); }}><option value="">Выберите территорию</option>{municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <label>Показатель<select value={forecastSeries?.key || ''} onChange={(e) => setSelectedSeriesKey(e.target.value)}>{forecastOptions.map((s) => <option key={s.key} value={s.key}>{s.name} · {s.unit} ({municipalityNames.get(s.municipalityId) || s.municipalityId})</option>)}</select></label>
        <label>Горизонт: {horizon} года<input type="range" min="1" max="3" step="1" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}/></label>
        <label>Дополнительный шок: {extraShock > 0 ? '+' : ''}{fmt(extraShock,1)} п.п.<input type="range" min="-15" max="15" step="0.5" value={extraShock} onChange={(e) => setExtraShock(Number(e.target.value))}/></label>
      </div>
      {forecastSeries ? <>
        <div className="unified-base-card"><div><span>Последнее фактическое значение</span><strong>{fmt(forecastSeries.latest.numericValue,2)} {forecastSeries.unit}</strong></div><div><span>Последний год</span><strong>{lastYear}</strong></div><div><span>Наблюдений в ряду</span><strong>{history.length}</strong></div><div><span>Средний исторический темп</span><strong>{pct(stableRate)}</strong></div></div>
        <div className="unified-explanation"><h3>Как читать прогноз</h3><p>Базовая динамика оценивается по среднему годовому темпу доступных фактических наблюдений. Сценарные параметры из {scenarioSource} задают дополнительное отклонение только для инвестиций и показателей МСП. Для остальных показателей используется только наблюдаемая динамика и пользовательский шок, чтобы не переносить неподходящие допущения на другие экономические величины. Это анализ чувствительности, не обученная модель и не вероятность наступления сценария.</p></div>
        <div className="unified-scenario-grid">{forecastRows.map((r) => <article key={r.key} className={'unified-scenario scenario-' + r.key}><span>{r.title}</span><strong>{fmt(r.value,2)} <small>{forecastSeries.unit}</small></strong><p>{pct(r.rate)} в год · диапазон {fmt(r.low,2)}–{fmt(r.high,2)} · через {horizon} г.</p><div className="unified-track"><i style={{width: Math.max(2,Math.min(100,Math.abs(r.value)/(Math.max(1,...forecastRows.map((x) => Math.abs(x.value))))*100)) + '%'}}/></div><small>{r.summary || ''}</small></article>)}</div>
        <div className="unified-backtest"><div><span>Проверка на исторических периодах</span><strong>{forecastBacktest.count ? fmt(forecastBacktest.mape,1)+'%' : 'Недостаточно истории'}</strong><small>Средняя абсолютная процентная ошибка · тестовых точек: {forecastBacktest.count}</small></div><div><span>Смещение прогноза</span><strong>{forecastBacktest.bias == null ? '—' : pct(forecastBacktest.bias)}</strong><small>Положительное значение — модель завышала фактические значения</small></div><div><span>Статус проверки</span><strong>{forecastBacktest.status === 'pilot' ? 'Пилотная проверка' : forecastBacktest.status === 'very_small_sample' ? 'Малая выборка' : 'Не рассчитана'}</strong><small>Walk-forward: каждый следующий год прогнозируется только по предыдущим наблюдениям</small></div></div>
        {history.length < 3 && <div className="unified-warning"><strong>Ограниченная история.</strong> В ряду только два наблюдения. Темп между ними нестабилен и не позволяет проверить качество прогноза на прошлых периодах. Используйте сценарии как ориентир чувствительности.</div>}
        <div className="table-scroll"><table className="ranking-table"><thead><tr><th>Фактический год</th><th>Фактическое значение</th><th>Изменение к предыдущему году</th></tr></thead><tbody>{history.map((p,i) => <tr key={i}><td>{p.reference_year || periodLabel(p)}</td><td>{fmt(p.numericValue,2)} {forecastSeries.unit}</td><td>{i ? pct((p.numericValue/history[i-1].numericValue-1)*100) : 'Базовое наблюдение'}</td></tr>)}</tbody></table></div>
      </> : <div className="empty-state"><strong>Пока нет подходящего ряда для прогноза</strong><p>Для сценарного расчёта нужны минимум два подтверждённых годовых наблюдения одного показателя в одном муниципалитете и одной единице измерения. Квартальные, полугодовые и городские данные не смешиваются с годовыми муниципальными рядами.</p></div>}
      {scenarioError && <p className="unified-muted">Не удалось загрузить параметры сценариев из базы: {scenarioError}. Используются встроенные шаблоны.</p>}
    </section>}


    {tab === 'model' && <section className="unified-section">
      <div className="unified-section-head"><div><h2>Интегральная оценка устойчивости</h2><p>Интегральная сравнительная оценка шести компонентов устойчивости. Система рассчитывает доступные компоненты и отдельно показывает полноту покрытия, чтобы неполные данные не маскировались под точный рейтинг.</p></div><span>Пилотная методика · версия 1.0</span></div>
      <div className="unified-warning"><strong>Методическое ограничение.</strong> Это сравнительная пилотная оценка, а не утверждённый официальный индекс. Индекс рассчитывается при наличии минимум двух сопоставимых компонентов и не менее 35% исходного весового покрытия. Частичная оценка обязательно маркируется; при недостаточном покрытии значение не подменяется нулём. Недостающие данные не заменяются нулями и не получают условно положительную оценку.</div>
      <div className="unified-model-weight-grid">{MODEL_PILLARS.map((p) => <article className="unified-model-weight" key={p.key}><strong>{p.title}</strong><b>{Math.round(p.weight * 100)}%</b><small>{p.series.join(' · ')}</small></article>)}</div>
      <div className="unified-section-head"><div><h3>Сравнение территорий</h3><p>Шкала 0–100 показывает относительное положение среди муниципалитетов по сопоставимым рядам, а не абсолютный уровень благополучия.</p></div><span>{municipalityAnalysis.filter((m) => m.model?.score !== null).length} из {municipalities.length} с достаточным покрытием</span></div>
      <div className="table-scroll"><table className="ranking-table"><thead><tr><th>Муниципалитет</th><th>Индекс</th><th>Покрытие весов</th><th>Полнота данных</th><th>Направлений</th><th>Негативных сигналов</th></tr></thead><tbody>
        {[...municipalityAnalysis].sort((a,b) => (b.model?.score ?? -1) - (a.model?.score ?? -1)).map((m) => <tr key={m.id}><td><strong>{m.name}</strong></td><td>{m.model?.score == null ? 'Недостаточно данных' : <b>{fmt(m.model.score,1)} / 100{m.model.assessmentStatus === 'partial' ? ' · частично' : ''}</b>}</td><td>{m.model?.availableWeight ?? 0}%</td><td>{m.model?.score == null ? 'Не оценивается' : (m.model.confidence + '% · ориентировочно')}</td><td>{m.model?.availablePillars ?? 0}/6</td><td>{m.model?.adverseCount ?? 0}</td></tr>)}
      </tbody></table></div>
      {selected && <><div className="unified-section-head"><div><h3>Структура оценки: {selected.name}</h3><p>Показатели, входящие в расчёт по каждому направлению.</p></div><span>{selected.model?.scoredIndicators ?? 0} индикаторов в расчёте</span></div>
        <div className="unified-model-pillar-grid">{(selected.model?.pillars || MODEL_PILLARS.map((p) => ({...p,score:null,indicators:0,adverse:0}))).map((p) => <article className="unified-pillar" key={p.key}><div><strong>{p.title}</strong><span>{p.score == null ? '—' : fmt(p.score,0)}</span></div><div className="unified-track"><i style={{width:(p.score == null ? 0 : p.score)+'%'}}/></div><p>{p.indicators} сопоставимых рядов · {p.adverse} ухудшений</p><small>Вес направления: {Math.round(p.weight*100)}%</small></article>)}</div>
      </>}
      <div className="unified-section-head"><div><h3>Проверка чувствительности индекса</h3><p>Измените условные баллы направлений и посмотрите, как меняется интегральная оценка. Это стресс-тест, не прогноз вероятности.</p></div></div>
      {selected?.model?.score != null ? <>
        <div className="unified-shock-grid">{MODEL_PILLARS.map((p) => <label key={p.key}><span>{p.title}: <b>{modelShocks[p.key] > 0 ? '+' : ''}{modelShocks[p.key]} баллов</b></span><input type="range" min="-20" max="20" step="1" value={modelShocks[p.key]} onChange={(e) => setModelShocks((old) => ({...old,[p.key]:Number(e.target.value)}))}/></label>)}</div>
        <div className="unified-model-result"><span>Индекс после условного воздействия</span><strong>{fmt(clamp(selected.model.pillars.filter((p) => p.score != null).reduce((sum,p) => sum + (p.score + modelShocks[p.key]) * p.weight,0) / Math.max(.0001,selected.model.pillars.filter((p) => p.score != null).reduce((sum,p) => sum+p.weight,0)),0,100),1)} / 100</strong><button className="outline-button" onClick={() => setModelShocks({economy:0,labour:0,demography:0,finance:0,social:0,infrastructure:0})}>Сбросить воздействия</button></div>
      </> : <p className="empty-state">Для выбранной территории недостаточно сопоставимых данных, чтобы рассчитывать интегральный индекс и проводить стресс-тест.</p>}
      <div className="unified-method-note"><strong>Методика версии 1.0.</strong> Внутри сопоставимой группы «код показателя × единица × период × год» значения переводятся в процентильную шкалу. Для показателей, где большее значение благоприятно, используется прямой процентиль; для показателей с обратной направленностью — инвертированный. Итог индикатора: 80% относительного уровня и 20% сигнала динамики. Баллы направлений агрегируются с предварительными экспертными весами 20/20/15/15/15/15 с перераспределением только между реально доступными направлениями. Весовая структура и коэффициенты подлежат экспертной калибровке и проверке на истории.</div>
    </section>}

    {tab === 'chains' && <section className="unified-section">
      <div className="unified-section-head"><div><h2>Каналы санкционного давления и цепочки рисков</h2><p>Санкционное воздействие рассматривается через каналы передачи внешнего шока в экономику муниципалитета. Наблюдаемые показатели подтверждают отдельные звенья, но не доказывают причинность сами по себе.</p></div><span>{RISK_CHAINS.length} причинных гипотез</span></div>
      <div className="unified-warning"><strong>Методологическая рамка.</strong> Внешние ограничения анализируются через доступность технологий и оборудования, импортные и логистические издержки, экспортный спрос и сырьевую конъюнктуру, инвестиционную активность, занятость и доходы, а также бюджетные последствия. Прямые муниципальные измерения санкционного воздействия пока ограничены; где показателей нет, система показывает пробел, а не придумывает уровень экспозиции.</div>
      <div className="unified-chain-grid">{RISK_CHAINS.map((chain) => { const hits = (selected?.model?.chains || []).find((item) => item.id === chain.id); return <article className={'unified-chain-card '+(hits?.active ? 'is-active' : '')} key={chain.id}><div><span>{hits?.active ? 'СОВПАДЕНИЕ СИГНАЛОВ' : hits?.matched ? 'ЧАСТИЧНОЕ СОВПАДЕНИЕ' : 'НЕТ ПОДТВЕРЖДЁННЫХ СИГНАЛОВ'}</span><b>{hits?.matched || 0}/{chain.stages.length}</b></div><h3>{chain.title}</h3><p>{chain.description}</p><div className="unified-chain-stages">{chain.stages.map((stage,i) => <React.Fragment key={stage}><span className={(hits?.hits || []).includes(stage) ? 'hit' : ''}>{PILLARS.find((p) => p.key === stage)?.title || stage}</span>{i < chain.stages.length-1 && <i>→</i>}</React.Fragment>)}</div></article>; })}</div>
      <div className="unified-section-head"><div><h3>Сигналы по муниципалитетам</h3><p>Количество ухудшений и найденных цепочек по доступным подтверждённым рядам.</p></div></div>
      <div className="table-scroll"><table className="ranking-table"><thead><tr><th>Муниципалитет</th><th>Ухудшений</th><th>Затронуто направлений</th><th>Активных цепочек</th><th>Приоритет внимания</th></tr></thead><tbody>{municipalityAnalysis.map((m) => <tr key={m.id}><td><strong>{m.name}</strong></td><td>{m.model?.adverseCount ?? 0}</td><td>{m.model?.affectedPillars ?? 0}</td><td>{m.model?.chains?.filter((c) => c.active).length ?? 0}</td><td>{m.model?.priority == null ? 'Недостаточно данных' : m.model.priority + ' / 100'}</td></tr>)}</tbody></table></div>
      <div className="unified-method-note"><strong>Логика раннего предупреждения.</strong> Система фиксирует ухудшение только у показателей с явно заданным направлением. Сигнал подтверждается ссылкой на первоисточник и временной парой значений. Приоритет внимания — эвристический показатель концентрации негативных сигналов; он не трактуется как вероятность кризиса.</div>
    </section>}

    {tab === 'indicators' && <section className="unified-section">
      <div className="unified-section-head"><div><h2>Реестр показателей и качество данных</h2><p>Здесь видно, на каких фактах основан анализ и почему по некоторым направлениям вывод невозможен.</p></div><button className="outline-button" onClick={() => exportCsv([['Муниципалитет','Группа','Показатель','Код','Последнее значение','Единица','Период','Изменение','Источник'], ...visibleSeries.map((s) => [municipalityNames.get(s.municipalityId) || s.municipalityId,s.pillar.title,s.name,s.code,s.latest.numericValue,s.unit,periodLabel(s.latest),pct(s.changePercent),s.latest.source_url])], 'yugra-indicators.csv')}>Экспорт CSV</button></div>
      <div className="table-scroll"><table className="ranking-table"><thead><tr><th>Муниципалитет</th><th>Группа</th><th>Показатель</th><th>Последнее значение</th><th>Период</th><th>Изменение</th><th>Направление</th><th>Источник</th></tr></thead><tbody>{visibleSeries.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())).map((s) => <tr key={s.key}><td>{municipalityNames.get(s.municipalityId) || s.municipalityId}</td><td>{s.pillar.title}</td><td>{s.name}<small>{s.code}</small></td><td>{fmt(s.latest.numericValue,2)} {s.unit}</td><td>{periodLabel(s.latest)}</td><td>{pct(s.changePercent)}</td><td>{directionText(s)}</td><td>{s.latest.source_url ? <a href={s.latest.source_url} target="_blank" rel="noreferrer">Первоисточник ↗</a> : 'Не указан'}</td></tr>)}</tbody></table></div>
      <div className="unified-warning"><strong>Правило качества.</strong> Отсутствие данных не считается нулём и не даёт положительную оценку. Рейтинги и агрегированные оценки не подменяют исходные муниципальные показатели. Сравнивать можно только одинаковые коды, единицы, периоды и уровень географии.</div>
    </section>}
    <footer className="unified-footer"><span>В анализе: {series.length} подтверждённых временных рядов · {rows.filter((r) => r.verification_status === 'verified' && (r.geographic_level || 'municipality') === 'municipality').length} наблюдений</span><span>{syncLabel ? 'Обновлено ' + syncLabel : officialDataStatus === 'connected' ? 'Данные из Supabase' : 'Синхронизация не подтверждена'}</span><span>Демонстрационный аналитический контур. Сценарии иллюстрируют подход и не являются официальным прогнозом.</span></footer>
  </section>;
}
