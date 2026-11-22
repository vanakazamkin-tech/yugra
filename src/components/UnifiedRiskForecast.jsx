import { useEffect, useMemo, useState } from 'react';
import { isEligibleAnnualForecastSeries } from '../lib/forecastCoverage.js';
import { assessRiskSignals, backtestAnnualSeries, buildRiskAuditRows, buildRiskModel, DEFAULT_RISK_THRESHOLDS, deriveMunicipalIndicators, MODEL_PILLARS, parseRiskPeriod, RISK_CHAINS } from '../lib/riskModel.js';
import './UnifiedRiskForecast.css';
import { PILLARS } from '../lib/indicatorClassification.js';
import { buildRiskSeries } from '../lib/riskSeries.js';


const fmt = (v, digits = 1) => v == null || !Number.isFinite(Number(v)) ? '—' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(Number(v));
const pct = (v) => v == null ? '—' : (v > 0 ? '+' : '') + fmt(v, 1) + '%';
const safeText = (v) => String(v ?? '').trim();

const RISK = {
  critical: { label: 'Несколько ухудшений', short: 'Высокое внимание', color: 'red' },
  watch: { label: 'Есть ухудшения', short: 'Наблюдение', color: 'yellow' },
  stable: { label: 'Негативных сигналов нет', short: 'Без сигналов', color: 'green' },
  insufficient: { label: 'Недостаточно данных', short: 'Нет оценки', color: 'neutral' },
};
const DEFAULT_SCENARIOS = [
  { key: 'cautious', title: 'Стрессовый', summary: 'Неблагоприятные внешние условия и рост издержек.', investment_growth_rate: -8, sme_growth_rate: -4, uncertainty_rate: 18 },
  { key: 'base', title: 'Базовый', summary: 'Продолжение наблюдаемых тенденций при текущих условиях.', investment_growth_rate: 4, sme_growth_rate: 3, uncertainty_rate: 7 },
  { key: 'ambitious', title: 'Благоприятный', summary: 'Улучшение инвестиционной активности и деловой среды.', investment_growth_rate: 8, sme_growth_rate: 6, uncertainty_rate: 12 },
];

// Map scenario identifiers to the visual variants defined in UnifiedRiskForecast.css.
// Database-provided scenarios may use arbitrary keys, so always return a safe variant.
const scenarioTone = (key) => ({
  cautious: 'pessimistic',
  stress: 'pessimistic',
  pessimistic: 'pessimistic',
  base: 'base',
  ambitious: 'optimistic',
  optimistic: 'optimistic',
}[String(key ?? '').toLowerCase()] || 'base');
const periodLabel = (row) => safeText(row?.reference_period) || String(row?.reference_year || '—');
const directionText = (s) => s.direction === 'higher' ? 'снижение — негативный сигнал' : s.direction === 'lower' ? 'рост — негативный сигнал' : 'изменение требует контекста';
const sourceUrlsFor = (row) => [...new Set((Array.isArray(row?.source_urls) ? row.source_urls : row?.source_url ? [row.source_url] : []).filter((url) => typeof url === 'string' && url.trim()))];
const sourceIdsFor = (row) => [...new Set((Array.isArray(row?.source_ids) ? row.source_ids : row?.source_id ? [row.source_id] : []).filter((id) => typeof id === 'string' && id.trim()))];

export default function UnifiedRiskForecast({ municipalities = [], forecastScenarios = [], officialIndicators = [], programExecution = [], officialDataStatus = 'offline', officialDataSyncedAt = null }) {
  const [tab, setTab] = useState('overview');
  const [municipalityId, setMunicipalityId] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState('');
  const [selectedSeriesKey, setSelectedSeriesKey] = useState('');
  const [riskLevelFilter, setRiskLevelFilter] = useState('ALL');
  const [pillarFilter, setPillarFilter] = useState('ALL');
  const [signalFilter, setSignalFilter] = useState('ALL');
  const [sortMode, setSortMode] = useState('priority');
  const [horizon, setHorizon] = useState(3);
  const [extraShock, setExtraShock] = useState(0);
  const [scenarios, setScenarios] = useState(DEFAULT_SCENARIOS);
  const [scenarioSource, setScenarioSource] = useState('встроенные шаблоны');
  const [scenarioError, setScenarioError] = useState('');
  const [riskThresholds, setRiskThresholds] = useState(DEFAULT_RISK_THRESHOLDS);

  useEffect(() => {
    const rows = Array.isArray(forecastScenarios) ? forecastScenarios : [];
    if (rows.length) {
      setScenarios(rows.map((row) => ({
        key: row.key,
        title: row.title,
        summary: row.summary,
        investment_growth_rate: row.investment_growth_rate,
        sme_growth_rate: row.sme_growth_rate,
        uncertainty_rate: row.uncertainty_rate,
        display_order: row.display_order,
      })));
      setScenarioSource('общий снимок');
      setScenarioError('');
    } else {
      setScenarios(DEFAULT_SCENARIOS);
      setScenarioSource('встроенные шаблоны');
    }
  }, [forecastScenarios]);

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
  const series = useMemo(() => buildRiskSeries(rows, riskThresholds), [rows, riskThresholds]);
  const riskModel = useMemo(() => buildRiskModel(municipalities, series), [municipalities, series]);
  const municipalityNames = useMemo(() => new Map(municipalities.map((m) => [m.id, m.name])), [municipalities]);
  const visibleSeries = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('ru-RU');
    return series.filter((s) => {
      const text = (s.name + ' ' + s.code + ' ' + (municipalityNames.get(s.municipalityId) || '')).toLocaleLowerCase('ru-RU');
      const matchesSignal = signalFilter === 'ALL'
        || (signalFilter === 'negative' && s.adverse === true)
        || (signalFilter === 'improving' && s.adverse === false)
        || (signalFilter === 'context' && s.direction === 'context')
        || (signalFilter === 'unavailable' && s.adverse === null);
      return (municipalityId === 'ALL' || s.municipalityId === municipalityId)
        && (pillarFilter === 'ALL' || s.pillar.key === pillarFilter)
        && matchesSignal
        && (!needle || text.includes(needle));
    });
  }, [series, municipalityId, search, municipalityNames, pillarFilter, signalFilter]);
  const municipalityAnalysis = useMemo(() => municipalities.map((m) => {
    const own = series.filter((s) => s.municipalityId === m.id);
    const assessment = assessRiskSignals(own, riskThresholds);
    const pillars = PILLARS.map((p) => ({ ...p, series: own.filter((s) => s.pillar.key === p.key) })).filter((p) => p.series.length);
    return {
      ...m, own, pillars, ...assessment,
      coverage: own.length,
      confirmedObservations: rows.filter((row) => String(row.municipality_id) === String(m.id)
        && row.verification_status === 'verified' && row.geographic_level === 'municipality').length,
      comparableSeries: own.filter((signal) => signal.adverse !== null).length,
      model: riskModel.byMunicipality[m.id] || null,
    };
  }).sort((a, b) => {
    const priority = { critical: 0, watch: 1, stable: 2, insufficient: 3 };
    return priority[a.level] - priority[b.level] || b.bad.length - a.bad.length || String(a.name || a.id).localeCompare(String(b.name || b.id), 'ru-RU');
  }), [municipalities, series, riskModel, riskThresholds]);
  const riskAuditRows = useMemo(() => buildRiskAuditRows(municipalityAnalysis), [municipalityAnalysis]);
  const territoryMunicipalities = municipalityAnalysis.filter((m) => municipalityId === 'ALL' || m.id === municipalityId);
  const counts = {
    critical: territoryMunicipalities.filter((m) => m.level === 'critical').length,
    watch: territoryMunicipalities.filter((m) => m.level === 'watch').length,
    stable: territoryMunicipalities.filter((m) => m.level === 'stable').length,
    insufficient: territoryMunicipalities.filter((m) => m.level === 'insufficient').length,
  };
  const needle = search.trim().toLocaleLowerCase('ru-RU');
  const filteredMunicipalities = territoryMunicipalities
    .filter((m) => (riskLevelFilter === 'ALL' || m.level === riskLevelFilter)
      && (!needle || (String(m.name || '') + ' ' + m.bad.map((signal) => signal.name).join(' ')).toLocaleLowerCase('ru-RU').includes(needle)))
    .sort((a, b) => {
      if (sortMode === 'name') return String(a.name || a.id).localeCompare(String(b.name || b.id), 'ru-RU');
      if (sortMode === 'signals') return b.bad.length - a.bad.length || b.sharpChangeCount - a.sharpChangeCount || String(a.name || a.id).localeCompare(String(b.name || b.id), 'ru-RU');
      if (sortMode === 'coverage') return b.availablePillars - a.availablePillars || b.usable.length - a.usable.length || String(a.name || a.id).localeCompare(String(b.name || b.id), 'ru-RU');
      const priority = { critical: 0, watch: 1, stable: 2, insufficient: 3 };
      return priority[a.level] - priority[b.level] || b.bad.length - a.bad.length || String(a.name || a.id).localeCompare(String(b.name || b.id), 'ru-RU');
    });
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
  const selectedId = selectedMunicipality || (municipalityId !== 'ALL' ? municipalityId : '');
  const selected = municipalityAnalysis.find((m) => String(m.id) === String(selectedId)) || municipalityAnalysis[0];
  const forecastOptions = useMemo(() => series.filter((s) => parseRiskPeriod(s.latest)?.frequency === 'annual' && isEligibleAnnualForecastSeries(s)), [series]);
  const forecastSeries = forecastOptions.find((s) => s.key === selectedSeriesKey) || forecastOptions.find((s) => s.municipalityId === (municipalityId === 'ALL' ? selected?.id : municipalityId)) || forecastOptions[0] || null;
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
  const verifiedObservationCount = rows.filter((row) => row.verification_status === 'verified' && row.geographic_level === 'municipality' && row.source_id !== 'derived_from_verified_municipal_indicators').length;
  const sourceCoveredSeries = series.filter((item) => item.latestSourcePresent).length;
  const sourceCoveragePercent = series.length ? Math.round(sourceCoveredSeries / series.length * 100) : 0;
  const averagePillarCoverage = territoryMunicipalities.length
    ? Math.round(territoryMunicipalities.reduce((sum, item) => sum + item.availablePillars, 0) / (territoryMunicipalities.length * MODEL_PILLARS.length) * 100)
    : 0;
  const riskCoverageSummary = MODEL_PILLARS.map((pillar) => {
    const items = series.filter((item) => pillar.series.includes(item.pillar.key));
    return {
      ...pillar,
      rows: items.length,
      territories: new Set(items.map((item) => item.municipalityId)).size,
      deteriorating: items.filter((item) => item.adverse === true).length,
      comparable: items.filter((item) => item.adverse !== null).length,
    };
  });
  const prioritySignals = visibleSeries
    .filter((item) => item.adverse === true)
    .sort((a, b) => Number(b.sharpChange) - Number(a.sharpChange)
      || Number(b.adverseStreak || 0) - Number(a.adverseStreak || 0)
      || Math.abs(Number(b.changePercent) || 0) - Math.abs(Number(a.changePercent) || 0))
    .slice(0, 6);
  const clearRiskFilters = () => {
    setSearch('');
    setRiskLevelFilter('ALL');
    setPillarFilter('ALL');
    setSignalFilter('ALL');
    setSortMode('priority');
  };

  const exportCsv = (data, name) => {
    const escape = (v) => {
      let x = String(v ?? '');
      const first = x.trimStart()[0];
      if (typeof v === 'string' && (['=', '+', '-', '@'].includes(first) || first === String.fromCharCode(9) || first === String.fromCharCode(13))) x = "'" + x;
      return '"' + x.replaceAll('"', '""') + '"';
    };
    const csv = '\uFEFF' + data.map((r) => r.map(escape).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportRiskAudit = () => exportCsv([
    ['Муниципалитет','Статус учёта','Показатель','Код','Семейство сигналов','Членов семейства','Направление','Сфера','Значение до','Период до','Значение после','Период после','Изменение','Единица','Исходные коды','Общие исходные компоненты','Связанные показатели','Для Critical','Причина недопуска в Critical','Причина исключения','Ограничения качества','Качество основания','Обоснование качества','ID источников','URL источников'],
    ...riskAuditRows.map((item) => [
      item.municipality,item.inclusionStatus,item.name,item.code,item.family,item.familyMembers,item.direction,item.pillar,
      item.previousValue,item.previousPeriod,item.currentValue,item.currentPeriod,item.change,item.unit,
      item.inputIndicatorCodes.join(', '),item.sharedInputCodes.join(', '),item.sharedWith.join('; '),
      item.criticalEligible ? 'Да' : 'Нет',item.criticalEligibilityReason,
      item.exclusionReason,item.qualityNotes.join('; '),item.confidenceLabel,item.confidenceReason,
      item.sourceIds.join(', '),item.sourceUrls.join(' | '),
    ]),
  ], 'yugra-risk-audit.csv');

  return <section className="panel full-panel unified-system">
    <header className="unified-hero">
      <div><span className="eyebrow">АНАЛИТИЧЕСКАЯ СИСТЕМА · ХАНТЫ-МАНСИЙСКИЙ АВТОНОМНЫЙ ОКРУГ — ЮГРА</span><h1>Мониторинг рисков муниципалитетов Югры</h1><p>Раннее выявление негативных изменений, оценка достаточности данных, разбор уязвимых направлений и проверка взаимосвязанных цепочек рисков.</p></div>
      <span className="concept-corner">КОНЦЕПТ АНАЛИТИКИ · ВЕРСИЯ 1.2</span>
    </header>
    <div className="unified-warning"><strong>Статус концепта.</strong> Расчёты используют подтверждённые муниципальные наблюдения и производные коэффициенты. Интегральный индекс рассчитывается отдельно по методологии направления №1; этот риск-модуль его не пересчитывает. Сценарный прогноз — отдельный контур направления №2. Рисковые сигналы основаны на наблюдаемой динамике и не являются вероятностью кризиса. Для управленческого применения необходимы экспертная калибровка и историческая валидация.</div>
    <nav className="unified-tabs" role="group" aria-label="Разделы аналитики">
      <button type="button" className={tab === 'overview' ? 'active' : ''} aria-pressed={tab === 'overview'} onClick={() => setTab('overview')}>Обзор</button>
      <button type="button" className={tab === 'municipality' ? 'active' : ''} aria-pressed={tab === 'municipality'} onClick={() => setTab('municipality')}>Паспорта территорий</button>
      <button type="button" className={tab === 'chains' ? 'active' : ''} aria-pressed={tab === 'chains'} onClick={() => setTab('chains')}>Цепочки рисков</button>
      <button type="button" className={tab === 'model' ? 'active' : ''} aria-pressed={tab === 'model'} onClick={() => setTab('model')}>Профиль модели</button>
      <button type="button" className={tab === 'indicators' ? 'active' : ''} aria-pressed={tab === 'indicators'} onClick={() => setTab('indicators')}>Реестр данных</button>
      <button type="button" className={tab === 'forecast' ? 'active' : ''} aria-pressed={tab === 'forecast'} onClick={() => setTab('forecast')}>Сценарии</button>
      <button type="button" className={tab === 'concept' ? 'active' : ''} aria-pressed={tab === 'concept'} onClick={() => setTab('concept')}>Методика</button>
    </nav>
    <div className="unified-filters risk-filter-bar">
      <label>Территория<select aria-label="Выбрать муниципалитет для анализа рисков" value={municipalityId} onChange={(e) => { setMunicipalityId(e.target.value); setSelectedMunicipality(e.target.value === 'ALL' ? '' : e.target.value); }}><option value="ALL">Все муниципалитеты</option>{municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      <label className="unified-search">Поиск<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Муниципалитет, показатель или код" aria-label="Поиск показателя или муниципалитета"/></label>
      <label>Направление<select value={pillarFilter} onChange={(e) => setPillarFilter(e.target.value)} aria-label="Фильтр по направлению риск-мониторинга"><option value="ALL">Все направления</option>{PILLARS.map((pillar) => <option key={pillar.key} value={pillar.key}>{pillar.title}</option>)}</select></label>
      <label>Тип сигнала<select value={signalFilter} onChange={(e) => setSignalFilter(e.target.value)} aria-label="Фильтр по типу сигнала"><option value="ALL">Все сигналы</option><option value="negative">Негативная динамика</option><option value="improving">Без ухудшения</option><option value="context">Требует контекста</option><option value="unavailable">Нет сопоставимой пары</option></select></label>
      <label>Статус территории<select value={riskLevelFilter} onChange={(e) => setRiskLevelFilter(e.target.value)} aria-label="Фильтр по статусу территории"><option value="ALL">Все статусы</option><option value="critical">Повышенное внимание</option><option value="watch">Наблюдение</option><option value="stable">Без сигналов</option><option value="insufficient">Недостаточно данных</option></select></label>
      <label>Сортировка<select value={sortMode} onChange={(e) => setSortMode(e.target.value)} aria-label="Сортировка списка муниципалитетов"><option value="priority">По приоритету</option><option value="signals">По числу ухудшений</option><option value="coverage">По покрытию данных</option><option value="name">По названию</option></select></label>
      <button type="button" className="outline-button risk-clear-filters" onClick={clearRiskFilters}>Сбросить фильтры</button>
    </div>
    <p className="unified-muted risk-result-count" role="status" aria-live="polite" aria-atomic="true">В выборке: {visibleSeries.length} временных рядов · {filteredMunicipalities.length} из {territoryMunicipalities.length} муниципалитетов</p>

    {tab === 'concept' && <section className="unified-section unified-concept">
      <div className="unified-section-head"><div><h2>Архитектура модели прогнозирования</h2><p>Логика системы: от внешнего санкционного шока до оценки последствий для социально-экономической устойчивости муниципалитета.</p></div><span>Концептуальная схема</span></div>
      <div className="unified-concept-flow">
        <article><small>01 · ВНЕШНЯЯ СРЕДА</small><strong>Санкционное давление</strong><p>Ограничения торговли, технологий, оборудования, финансовых операций и логистики; изменение сырьевой конъюнктуры и внешнего спроса.</p></article>
        <div className="unified-concept-arrow">↓</div>
        <article><small>02 · КАНАЛЫ ПЕРЕДАЧИ</small><strong>Воздействие на экономику</strong><p>Импортозамещение и технологическая доступность · инвестиции и издержки · экспортный спрос · бюджетные доходы · рынок труда · малый бизнес.</p></article>
        <div className="unified-concept-arrow">↓</div>
        <article><small>03 · УЯЗВИМОСТИ ТЕРРИТОРИЙ</small><strong>Структура муниципальной экономики</strong><p>Отраслевая концентрация, зависимость от крупных работодателей, бюджетная самостоятельность, кадровая база, демографическая ситуация и доступность инфраструктуры.</p></article>
        <div className="unified-concept-arrow">↓</div>
        <article><small>04 · АНАЛИТИЧЕСКОЕ ЯДРО</small><strong>Индикаторы и риск-диагностика</strong><p>Сопоставление подтверждённых показателей, оценка динамики, выявление негативных сигналов и контроль полноты данных. Интегральный индекс рассчитывается в отдельном методологическом контуре.</p></article>
        <div className="unified-concept-arrow">↓</div>
        <article><small>05 · ПРОГНОЗ И РИСКИ</small><strong>Сценарии и раннее предупреждение</strong><p>Базовый, стрессовый и адаптационный сценарии; проверка чувствительности; выявление цепочек взаимосвязанных рисков и горизонтов их проявления.</p></article>
        <div className="unified-concept-arrow">↓</div>
        <article><small>06 · РЕЗУЛЬТАТ ДЛЯ УПРАВЛЕНИЯ</small><strong>Профиль устойчивости и меры реагирования</strong><p>Паспорт муниципалитета, карта уязвимостей, приоритеты мониторинга, перечень требуемых данных и варианты адресных управленческих мер.</p></article>
      </div>
      <div className="unified-section-head"><div><h3>Шесть направлений риск-мониторинга</h3><p>Каждое направление объединяет группу показателей. Веса интегрального индекса здесь не рассчитываются.</p></div></div>
      <div className="unified-model-weight-grid">{MODEL_PILLARS.map((p) => <article className="unified-model-weight" key={p.key}><strong>{p.title}</strong><small>{p.series.join(' · ')}</small></article>)}</div>
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
      <section className="unified-section risk-settings-section">
        <details className="risk-settings-details">
          <summary><strong>Настроить правила классификации</strong><span>Пороги прототипа · сейчас: {riskThresholds.criticalSignals} негативных сигналов и {riskThresholds.criticalPillars} направлений для повышенного внимания</span></summary>
          <div className="unified-section-head"><div><h2>Параметры светофора</h2><p>Изменения сразу пересчитывают статусы. Это настраиваемые правила прототипа, а не статистически откалиброванные нормативы.</p></div><button type="button" className="outline-button" onClick={() => setRiskThresholds(DEFAULT_RISK_THRESHOLDS)}>Сбросить пороги</button></div>
          <div className="unified-forecast-controls risk-threshold-controls" role="group" aria-label="Настройка порогов классификации рисков">
            <label>Минимум рядов с понятным направлением: {riskThresholds.minimumUsable}<input type="range" min="1" max="5" step="1" value={riskThresholds.minimumUsable} onChange={(e) => setRiskThresholds((current) => ({ ...current, minimumUsable: Number(e.target.value) }))}/></label>
            <label>Негативных сигналов для повышенного внимания: {riskThresholds.criticalSignals}<input type="range" min="2" max="10" step="1" value={riskThresholds.criticalSignals} onChange={(e) => setRiskThresholds((current) => ({ ...current, criticalSignals: Number(e.target.value), criticalPillars: Math.min(current.criticalPillars, Number(e.target.value)) }))}/></label>
            <label>Направлений для повышенного внимания: {riskThresholds.criticalPillars}<input type="range" min="1" max={Math.min(6, riskThresholds.criticalSignals)} step="1" value={riskThresholds.criticalPillars} onChange={(e) => setRiskThresholds((current) => ({ ...current, criticalPillars: Number(e.target.value) }))}/></label>
            <label>Резкое ухудшение от: {riskThresholds.sharpChangePercent}%<input type="range" min="1" max="50" step="1" value={riskThresholds.sharpChangePercent} onChange={(e) => setRiskThresholds((current) => ({ ...current, sharpChangePercent: Number(e.target.value) }))}/></label>
          </div>
          <p className="unified-muted">Зелёный статус присваивается только при наличии сопоставимых рядов с однозначным направлением по всем шести направлениям. Отсутствие данных не трактуется как отсутствие риска.</p>
        </details>
      </section>

      <section className="risk-overview-strip">
        <div><span className="eyebrow">СВОДКА ПО ТЕКУЩЕЙ ВЫБОРКЕ</span><h2>Куда направить внимание</h2><p>Статусы отражают обнаруженную динамику и достаточность покрытия. Нажмите на карточку, чтобы отобрать соответствующие территории.</p></div>
        <div className="risk-overview-meta">
          <div><span>Среднее покрытие направлений</span><strong>{averagePillarCoverage}%</strong></div>
          <div><span>Рядов с источником у последнего наблюдения</span><strong>{sourceCoveragePercent}%</strong></div>
          <div><span>Подтверждённых исходных наблюдений</span><strong>{fmt(verifiedObservationCount,0)}</strong></div>
        </div>
      </section>

      <div className="unified-kpis risk-kpi-grid">
        <button type="button" className={'risk-kpi risk-kpi-red ' + (riskLevelFilter === 'critical' ? 'is-selected' : '')} aria-pressed={riskLevelFilter === 'critical'} onClick={() => setRiskLevelFilter((current) => current === 'critical' ? 'ALL' : 'critical')}><div><small>ПОВЫШЕННОЕ ВНИМАНИЕ</small><strong>{counts.critical}</strong><span>территорий достигли обоих критериев красной зоны</span><em>{riskLevelFilter === 'critical' ? 'Фильтр включён' : 'Показать территории'}</em></div></button>
        <button type="button" className={'risk-kpi risk-kpi-yellow ' + (riskLevelFilter === 'watch' ? 'is-selected' : '')} aria-pressed={riskLevelFilter === 'watch'} onClick={() => setRiskLevelFilter((current) => current === 'watch' ? 'ALL' : 'watch')}><div><small>ЕСТЬ НЕГАТИВНЫЕ СИГНАЛЫ</small><strong>{counts.watch}</strong><span>территорий с наблюдаемыми ухудшениями</span><em>{riskLevelFilter === 'watch' ? 'Фильтр включён' : 'Показать территории'}</em></div></button>
        <button type="button" className={'risk-kpi risk-kpi-green ' + (riskLevelFilter === 'stable' ? 'is-selected' : '')} aria-pressed={riskLevelFilter === 'stable'} onClick={() => setRiskLevelFilter((current) => current === 'stable' ? 'ALL' : 'stable')}><div><small>БЕЗ НЕГАТИВНЫХ СИГНАЛОВ</small><strong>{counts.stable}</strong><span>покрыты все 6 направлений; это не гарантия отсутствия рисков</span><em>{riskLevelFilter === 'stable' ? 'Фильтр включён' : 'Показать территории'}</em></div></button>
        <button type="button" className={'risk-kpi risk-kpi-neutral ' + (riskLevelFilter === 'insufficient' ? 'is-selected' : '')} aria-pressed={riskLevelFilter === 'insufficient'} onClick={() => setRiskLevelFilter((current) => current === 'insufficient' ? 'ALL' : 'insufficient')}><div><small>НЕДОСТАТОЧНО ДАННЫХ</small><strong>{counts.insufficient}</strong><span>территорий нельзя оценить по всем направлениям</span><em>{riskLevelFilter === 'insufficient' ? 'Фильтр включён' : 'Показать территории'}</em></div></button>
      </div>

      <section className="risk-distribution" aria-label="Распределение статусов муниципалитетов">
        <div className="risk-distribution-track">
          <i className="is-critical" style={{width: (municipalityAnalysis.length ? counts.critical / municipalityAnalysis.length * 100 : 0) + '%'}}/>
          <i className="is-watch" style={{width: (municipalityAnalysis.length ? counts.watch / municipalityAnalysis.length * 100 : 0) + '%'}}/>
          <i className="is-stable" style={{width: (municipalityAnalysis.length ? counts.stable / municipalityAnalysis.length * 100 : 0) + '%'}}/>
          <i className="is-insufficient" style={{width: (municipalityAnalysis.length ? counts.insufficient / municipalityAnalysis.length * 100 : 0) + '%'}}/>
        </div>
        <div><span><i className="dot is-critical"/> Повышенное внимание · {counts.critical}</span><span><i className="dot is-watch"/> Наблюдение · {counts.watch}</span><span><i className="dot is-stable"/> Без сигналов · {counts.stable}</span><span><i className="dot is-insufficient"/> Нет оценки · {counts.insufficient}</span></div>
      </section>

      <section className="unified-section risk-priority-section">
        <div className="unified-section-head"><div><h2>Сигналы для первоочередной проверки</h2><p>Вверху — резкие и повторяющиеся ухудшения. Это аналитические поводы для проверки, а не рейтинг вероятности кризиса.</p></div><span>{prioritySignals.length} приоритетных сигналов</span></div>
        {prioritySignals.length ? <div className="risk-priority-grid">{prioritySignals.map((signal) => <article className="risk-priority-card" key={signal.key}>
          <div className="risk-priority-card-top"><span>{municipalityNames.get(signal.municipalityId) || signal.municipalityId}</span><span className={signal.sharpChange ? 'risk-priority-tag is-sharp' : 'risk-priority-tag'}>{signal.sharpChange ? 'Резкое изменение' : signal.adverseStreak >= 2 ? 'Повторяется' : 'Негативная динамика'}</span></div>
          <h3>{signal.name}</h3>
          <div className="risk-priority-value"><strong>{pct(signal.changePercent)}</strong><span>{signal.pillar.title} · {periodLabel(signal.previous)} → {periodLabel(signal.latest)}</span></div>
          <p>{directionText(signal)}. Качество основания: {signal.confidenceLabel.toLocaleLowerCase('ru-RU')}.</p>
          <div className="risk-priority-actions">{sourceUrlsFor(signal.latest).slice(0,1).map((url) => <a key={url} href={url} target="_blank" rel="noreferrer">Первоисточник ↗</a>)}<button type="button" className="outline-button" onClick={() => { setSelectedMunicipality(signal.municipalityId); setMunicipalityId(signal.municipalityId); setTab('municipality'); }}>Открыть паспорт</button></div>
        </article>)}</div> : <p className="empty-state" role="status">По выбранным фильтрам нет негативных сигналов с сопоставимым направлением. Проверьте полноту данных и ограничения выборки.</p>}
      </section>

      <section className="unified-section risk-coverage-section">
        <div className="unified-section-head"><div><h2>Покрытие шести направлений</h2><p>Показывает наличие временных рядов по территориям. Наличие данных само по себе не является положительной оценкой.</p></div><span>{MODEL_PILLARS.length} направлений модели</span></div>
        <div className="risk-coverage-grid">{riskCoverageSummary.map((pillar) => <article className="risk-coverage-card" key={pillar.key}>
          <div><strong>{pillar.title}</strong><b>{pillar.territories}/{municipalities.length}</b></div>
          <div className="unified-track"><i style={{width: (municipalities.length ? pillar.territories / municipalities.length * 100 : 0) + '%'}}/></div>
          <small>{pillar.rows} рядов · {pillar.comparable} сопоставимых · {pillar.deteriorating} негативных</small>
        </article>)}</div>
      </section>

      <section className="unified-section">
        <div className="unified-section-head"><div><h2>Где ситуация требует внимания</h2><p>Список реагирует на фильтры и сортировку выше. Статус учитывает не только ухудшения, но и полноту покрытия. Нажмите на территорию для подробного разбора.</p></div><button type="button" className="outline-button" onClick={() => exportCsv([['Муниципалитет','Статус','Покрыто направлений','Оцениваемых рядов','Негативных сигналов','Показатели'], ...filteredMunicipalities.map((m) => [m.name,RISK[m.level].label,String(m.availablePillars) + '/6',m.usable.length,m.bad.length,m.bad.map((signal) => signal.name).join(', ')])], 'yugra-risk-overview.csv')}>Экспорт CSV</button></div>
        <div className="table-scroll" role="region" tabIndex={0} aria-label="Таблица муниципалитетов с рисковыми сигналами"><table className="ranking-table risk-table"><thead><tr><th scope="col">Муниципалитет</th><th scope="col">Сигнал системы</th><th scope="col">Покрыто направлений</th><th scope="col">Рядов с направлением</th><th scope="col">Ухудшений</th><th scope="col">Что ухудшается</th><th scope="col"></th></tr></thead><tbody>
          {filteredMunicipalities.map((m) => <tr key={m.id}><td><strong>{m.name}</strong></td><td><span className={'risk-zone-badge risk-zone-' + (m.level === 'critical' ? 'red' : m.level === 'watch' ? 'yellow' : m.level === 'stable' ? 'green' : 'unknown')}>{RISK[m.level].label}</span></td><td>{m.availablePillars}/6</td><td>{m.usable.length}</td><td>{m.bad.length}</td><td>{m.bad.slice(0,3).map((signal) => signal.name).join('; ') || 'Нет подтверждённого ухудшения по оцениваемым рядам'}</td><td><button type="button" className="outline-button" onClick={() => { setSelectedMunicipality(m.id); setTab('municipality'); }}>Разобрать</button></td></tr>)}
        </tbody></table>{!filteredMunicipalities.length && <p className="empty-state" role="status">По текущим фильтрам муниципалитеты не найдены. Измените критерии или сбросьте фильтры.</p>}</div>
      </section>

      <section className="unified-section risk-matrix-section">
        <div className="unified-section-head"><div><h2>Матрица мониторинга муниципалитетов</h2><p>По каждой территории отдельно показано наличие рядов и найденные ухудшения в шести направлениях. «Есть ряды» не означает, что риск отсутствует.</p></div><span>{filteredMunicipalities.length} территорий в текущем срезе</span></div>
        <div className="table-scroll" role="region" tabIndex={0} aria-label="Матрица наличия данных и рисковых сигналов по муниципалитетам"><table className="ranking-table risk-matrix-table"><thead><tr><th scope="col">Муниципалитет</th>{MODEL_PILLARS.map((pillar) => <th scope="col" key={pillar.key}>{pillar.title}</th>)}<th scope="col">Статус</th></tr></thead><tbody>{filteredMunicipalities.map((municipality) => <tr key={municipality.id}>
          <td><strong>{municipality.name}</strong></td>
          {MODEL_PILLARS.map((pillar) => {
            const item = municipality.model?.pillars?.find((entry) => entry.key === pillar.key);
            const state = !item || !item.totalSeries ? 'empty' : item.adverse > 0 ? 'warning' : item.indicators > 0 ? 'covered' : 'limited';
            const label = state === 'empty' ? 'Нет рядов' : state === 'warning' ? 'Есть ухудшение' : state === 'covered' ? 'Есть ряды' : 'Нет пары';
            return <td key={pillar.key}><span className={'risk-matrix-status is-' + state}>{label}</span><small>{item?.totalSeries || 0} рядов</small></td>;
          })}
          <td><span className={'risk-zone-badge risk-zone-' + (municipality.level === 'critical' ? 'red' : municipality.level === 'watch' ? 'yellow' : municipality.level === 'stable' ? 'green' : 'unknown')}>{RISK[municipality.level].short}</span></td>
        </tr>)}</tbody></table>{!filteredMunicipalities.length && <p className="empty-state" role="status">Нет территорий для отображения.</p>}</div>
        <p className="unified-muted">Ячейка «Есть ряды» означает наличие направления для наблюдения, но не подтверждает отсутствие ухудшения. «Нет пары» указывает, что ряд есть, но сопоставимый интервал пока не сформирован.</p>
      </section>

      <section className="unified-section">
        <div className="unified-section-head"><div><h2>Сигналы, требующие проверки</h2><p>Показываем изменение только там, где направление показателя можно интерпретировать. Для контекстных рядов изменение не окрашивается как «хорошее» или «плохое».</p></div><span>{visibleSeries.filter((s) => s.adverse === true).length} негативных сигналов</span></div>
        <div className="table-scroll" role="region" tabIndex={0} aria-label="Таблица сопоставимых изменений показателей"><table className="ranking-table"><thead><tr><th scope="col">Муниципалитет</th><th scope="col">Направление</th><th scope="col">Показатель</th><th scope="col">Было</th><th scope="col">Стало</th><th scope="col">Изменение</th><th scope="col">Период</th></tr></thead><tbody>{visibleSeries.filter((s) => s.adverse !== null).sort((a,b) => Number(b.adverse)-Number(a.adverse) || Math.abs(b.changePercent || 0)-Math.abs(a.changePercent || 0)).slice(0,60).map((s) => <tr key={s.key}><td>{municipalityNames.get(s.municipalityId) || s.municipalityId}</td><td>{s.pillar.title}</td><td>{s.name}</td><td>{fmt(s.previous?.numericValue,2)} {s.unit}</td><td>{fmt(s.latest.numericValue,2)} {s.unit}</td><td className={s.adverse ? 'trend-negative' : 'trend-positive'}>{pct(s.changePercent)}</td><td>{periodLabel(s.previous)} → {periodLabel(s.latest)}</td></tr>)}</tbody></table>{visibleSeries.every((s) => s.adverse === null) && <p className="empty-state" role="status">Для выбранных фильтров пока нет рядов с однозначным направлением.</p>}</div>
      </section>
    </>}

    {tab === 'municipality' && <section className="unified-section">
      <div className="unified-section-head"><div><h2>Паспорт рисков территории</h2><p>Конкретные изменения, контекст показателей и ограничения данных.</p></div><select aria-label="Выбрать муниципалитет для паспорта рисков" value={selected?.id || ''} onChange={(e) => setSelectedMunicipality(e.target.value)}>{municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
      {selected && <>
        <div className="municipality-risk-summary"><div><span>Сигнал системы</span><strong>{RISK[selected.level].label}</strong></div><div><span>Рядов с понятным направлением</span><strong>{selected.usable.length}</strong></div><div><span>Негативных изменений</span><strong>{selected.bad.length}</strong></div><div><span>Резких ухудшений</span><strong>{selected.sharpChangeCount}</strong></div><div><span>Всего подтверждённых рядов</span><strong>{selected.coverage}</strong></div></div>
        <div className="unified-model-result"><span>Покрытие риск-мониторинга</span><strong>{selected.model?.availablePillars ?? 0} / 6 направлений</strong><small>{selected.model?.usableIndicators ?? 0} рядов с однозначным направлением и сопоставимой динамикой · всего рядов: {selected.model?.totalSeries ?? selected.coverage}</small></div>
        <div className="unified-explanation"><h3>Что это означает</h3><p>{selected.explanation}</p><ul>{selected.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>{selected.earlyWarning && <><p className="trend-negative"><strong>Раннее предупреждение:</strong> негативная динамика повторяется не менее двух последовательных сопоставимых интервалов. Это индикатор для проверки, а не самостоятельное основание для красной зоны.</p><div className="unified-signal-list">{selected.repeatedDeterioration.map((signal) => { const start = signal.points[Math.max(0, signal.points.length - signal.adverseStreak - 1)]; return <article key={signal.key}><div><strong>{signal.name}</strong><span>{signal.pillar.title}</span></div><b>{signal.adverseStreak} интервала подряд</b><p>{periodLabel(start)} → {periodLabel(signal.latest)} · {signal.unit}</p><small>Повторяющееся ухудшение требует проверки определения показателя, методики, источника и возможных причин.</small></article>; })}</div></>}</div>
        <section className="risk-review-panel">
          <div><span className="eyebrow">РАБОЧИЙ ЧЕК-ЛИСТ</span><h3>План проверки сигналов</h3><p>Порядок проверки перед тем, как переносить наблюдения в аналитический вывод или отчёт.</p></div>
          <ol>
            <li><strong>Сверить первоисточник и период.</strong><span>Проверить публикацию, единицу измерения, территориальную границу, методику и статус данных — предварительные они или итоговые.</span></li>
            <li><strong>Проверить повторяемость динамики.</strong><span>{selected.earlyWarning ? 'Есть сигналы с повторением на последовательных сопоставимых интервалах; отдельно проверить каждый из них.' : 'Не делать вывод о тренде по одной паре значений; открыть историю ряда и проверить соседние интервалы.'}</span></li>
            <li><strong>Найти независимое подтверждение.</strong><span>Сопоставить показатель с другими рядами того же направления. Производные показатели с общими исходными компонентами не следует считать независимыми подтверждениями.</span></li>
            <li><strong>Зафиксировать пробелы данных.</strong><span>{selected.missingPillars?.length ? 'Не покрыты направления: ' + selected.missingPillars.join(', ') + '.' : 'Зафиксировать ограничения источников, территориального охвата и сопоставимости временных рядов.'}</span></li>
          </ol>
        </section>
        <h3>Негативные сигналы</h3>
        {selected.bad.length ? <div className="unified-signal-list">{selected.bad.map((s) => <article key={s.key}><div><strong>{s.name}</strong><span>{s.pillar.title}</span></div><b>{pct(s.changePercent)}</b><p>{fmt(s.previous?.numericValue,2)} → {fmt(s.latest.numericValue,2)} {s.unit} · {periodLabel(s.previous)} → {periodLabel(s.latest)}</p><small>Интерпретация: {directionText(s)}. Качество основания: {s.confidenceLabel}. {s.confidenceReason} Резкое ухудшение: {s.sharpChange ? 'да' : 'нет'} (порог {s.sharpChangeThreshold}%). Источники: {sourceIdsFor(s.latest).join(', ') || 'не указаны'}. Проверьте методику и первоисточник перед управленческим решением.</small>{sourceUrlsFor(s.latest).map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">Открыть источник {index + 1} ↗</a>)}</article>)}</div> : <p className="empty-state" role="status">По текущим подтверждённым рядам негативные сигналы не выявлены либо данных недостаточно.</p>}
        <h3>Все направления и ограничения</h3>
        <div className="unified-pillar-grid">{PILLARS.map((p) => { const items = selected.own.filter((s) => s.pillar.key === p.key); return <article className="unified-pillar" key={p.key}><strong>{p.title}</strong><p>{items.length ? items.length + ' временных рядов' : 'Нет подтверждённых рядов'}</p><small>{items.filter((s) => s.adverse === true).length} ухудшений · {items.filter((s) => s.direction === 'context').length} контекстных показателей</small></article>; })}</div>
      </>}
    </section>}

    {tab === 'forecast' && <section className="unified-section unified-forecast">
      <div className="unified-section-head"><div><h2>Сценарное прогнозирование</h2><p>Траектория рассчитывается отдельно по выбранному годовому ряду. Выберите территорию и показатель.</p></div><span>Параметры: {scenarioSource}</span></div>
      <div className="unified-forecast-controls">
        <label>Муниципалитет<select aria-label="Выбрать муниципалитет для сценарного прогноза" value={forecastSeries?.municipalityId || ''} onChange={(e) => { const found = forecastOptions.find((s) => s.municipalityId === e.target.value && s.key === forecastSeries?.key); setSelectedSeriesKey(found?.key || forecastOptions.find((s) => s.municipalityId === e.target.value)?.key || ''); }}><option value="">Выберите территорию</option>{municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <label>Показатель<select aria-label="Выбрать показатель для сценарного прогноза" value={forecastSeries?.key || ''} onChange={(e) => setSelectedSeriesKey(e.target.value)}>{forecastOptions.map((s) => <option key={s.key} value={s.key}>{s.name} · {s.unit} ({municipalityNames.get(s.municipalityId) || s.municipalityId})</option>)}</select></label>
        <label>Горизонт: {horizon} года<input type="range" min="1" max="3" step="1" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}/></label>
        <label>Дополнительный шок: {extraShock > 0 ? '+' : ''}{fmt(extraShock,1)} п.п.<input type="range" min="-15" max="15" step="0.5" value={extraShock} onChange={(e) => setExtraShock(Number(e.target.value))}/></label>
      </div>
      {forecastSeries ? <>
        <div className="unified-base-card"><div><span>Последнее фактическое значение</span><strong>{fmt(forecastSeries.latest.numericValue,2)} {forecastSeries.unit}</strong></div><div><span>Последний год</span><strong>{lastYear}</strong></div><div><span>Наблюдений в ряду</span><strong>{history.length}</strong></div><div><span>Средний исторический темп</span><strong>{pct(stableRate)}</strong></div></div>
        <div className="unified-explanation"><h3>Как читать прогноз</h3><p>Базовая динамика оценивается по среднему годовому темпу доступных фактических наблюдений. Сценарные параметры из {scenarioSource} задают дополнительное отклонение только для инвестиций и показателей МСП. Для остальных показателей используется только наблюдаемая динамика и пользовательский шок, чтобы не переносить неподходящие допущения на другие экономические величины. Это анализ чувствительности, не обученная модель и не вероятность наступления сценария.</p></div>
        <div className="unified-scenario-grid">{forecastRows.map((r) => <article key={r.key} className={'unified-scenario scenario-' + scenarioTone(r.key)}><span>{r.title}</span><strong>{fmt(r.value,2)} <small>{forecastSeries.unit}</small></strong><p>{pct(r.rate)} в год · диапазон {fmt(r.low,2)}–{fmt(r.high,2)} · через {horizon} г.</p><div className="unified-track"><i style={{width: Math.max(2,Math.min(100,Math.abs(r.value)/(Math.max(1,...forecastRows.map((x) => Math.abs(x.value))))*100)) + '%'}}/></div><small>{r.summary || ''}</small></article>)}</div>
        <div className="unified-backtest"><div><span>Проверка на исторических периодах</span><strong>{forecastBacktest.count ? fmt(forecastBacktest.mape,1)+'%' : 'Недостаточно истории'}</strong><small>Средняя абсолютная процентная ошибка · тестовых точек: {forecastBacktest.count}</small></div><div><span>Смещение прогноза</span><strong>{forecastBacktest.bias == null ? '—' : pct(forecastBacktest.bias)}</strong><small>Положительное значение — модель завышала фактические значения</small></div><div><span>Статус проверки</span><strong>{forecastBacktest.status === 'pilot' ? 'Пилотная проверка' : forecastBacktest.status === 'very_small_sample' ? 'Малая выборка' : 'Не рассчитана'}</strong><small>Walk-forward: каждый следующий год прогнозируется только по предыдущим наблюдениям</small></div></div>
        {history.length < 3 && <div className="unified-warning"><strong>Ограниченная история.</strong> В ряду только два наблюдения. Темп между ними нестабилен и не позволяет проверить качество прогноза на прошлых периодах. Используйте сценарии как ориентир чувствительности.</div>}
        <div className="table-scroll" role="region" tabIndex={0} aria-label="Таблица данных. Используйте горизонтальную прокрутку для просмотра всех столбцов."><table className="ranking-table"><thead><tr><th scope="col">Фактический год</th><th scope="col">Фактическое значение</th><th scope="col">Изменение к предыдущему году</th></tr></thead><tbody>{history.map((p,i) => <tr key={i}><td>{p.reference_year || periodLabel(p)}</td><td>{fmt(p.numericValue,2)} {forecastSeries.unit}</td><td>{i ? pct((p.numericValue/history[i-1].numericValue-1)*100) : 'Базовое наблюдение'}</td></tr>)}</tbody></table></div>
      </> : <div className="empty-state" role="status"><strong>Пока нет подходящего ряда для прогноза</strong><p>Для сценарного расчёта нужны минимум два подтверждённых годовых наблюдения одного показателя в одном муниципалитете и одной единице измерения. Квартальные, полугодовые и городские данные не смешиваются с годовыми муниципальными рядами.</p></div>}
      {scenarioError && <p className="unified-muted" role="status" aria-live="polite">Не удалось загрузить параметры сценариев из базы: {scenarioError}. Используются встроенные шаблоны.</p>}
    </section>}


    {tab === 'model' && <section className="unified-section">
      <div className="unified-section-head"><div><h2>Профиль риск-мониторинга</h2><p>Раздел показывает покрытие показателями, наблюдаемые ухудшения и активные гипотезы риск-цепочек. Интегральный индекс устойчивости здесь не рассчитывается.</p></div><span>Диагностика, не рейтинг</span></div>
      <div className="unified-warning"><strong>Разделение методик.</strong> Интегральный индекс и его веса принадлежат направлению №1. Сценарный прогноз относится к направлению №2. Здесь используются только подтверждённые временные ряды, их направление, сопоставимость и фактические негативные изменения.</div>
      <div className="unified-section-head"><div><h3>Полная матрица покрытия и сигналов</h3><p>Подтверждённые исходные наблюдения, сопоставимые ряды и независимые семейства сигналов после исключения контекстных и конфликтующих определений.</p></div><button type="button" className="outline-button" onClick={exportRiskAudit}>Экспорт детального аудита CSV</button></div>
      <div className="table-scroll" role="region" tabIndex={0} aria-label="Матрица покрытия муниципалитетов и риск-сигналов. Используйте горизонтальную прокрутку для просмотра всех столбцов."><table className="ranking-table"><thead><tr><th scope="col">Муниципалитет</th><th scope="col">Подтверждённых наблюдений</th><th scope="col">Всего рядов</th><th scope="col">Сопоставимых рядов</th><th scope="col">Независимых сигналов</th><th scope="col">Покрытие направлений</th><th scope="col">Негативных сигналов</th><th scope="col">Затронуто направлений</th><th scope="col">Итоговый статус</th></tr></thead><tbody>
        {municipalityAnalysis.map((m) => <tr key={m.id}><td><strong>{m.name}</strong></td><td>{m.confirmedObservations}</td><td>{m.coverage}</td><td>{m.comparableSeries}</td><td>{m.usable.length}</td><td>{m.availablePillars}/6</td><td>{m.bad.length}</td><td>{m.affectedPillars}</td><td>{RISK[m.level].label}</td></tr>)}
      </tbody></table></div>
      {selected && <><div className="unified-section-head"><div><h3>Покрытие направлений: {selected.name}</h3><p>Количество временных рядов с однозначным направлением и сопоставимой последней динамикой.</p></div><span>{selected.model?.usableIndicators ?? 0} из {selected.coverage} подтверждённых рядов</span></div>
        <div className="unified-model-pillar-grid">{(selected.model?.pillars || MODEL_PILLARS.map((p) => ({ ...p, indicators: 0, adverse: 0, totalSeries: 0 }))).map((p) => <article className="unified-pillar" key={p.key}><div><strong>{p.title}</strong><span>{p.indicators}</span></div><p>{p.adverse} негативных сигналов · {p.totalSeries} всего рядов</p><small>Неизвестное направление и несопоставимые периоды не учитываются как благополучие.</small></article>)}</div>
      </>}
      <div className="unified-method-note"><strong>Ограничение.</strong> По умолчанию красный статус требует не менее трёх негативных семейств с непредварительными последними наблюдениями и указанными источниками в трёх разных направлениях. Предварительные и не имеющие источника сигналы остаются в предупреждениях, но не могут самостоятельно создавать Critical. Это настраиваемое диагностическое правило, а не статистически откалиброванный порог. Общие исходные компоненты двух производных показателей отмечаются в аудите отдельно: пересечение входных данных само по себе не доказывает математическую тождественность сигналов. Статусы не складываются в интегральный индекс, не заменяют экспертную оценку и не означают вероятность кризиса.</div>
    </section>}

    {tab === 'chains' && <section className="unified-section">
      <div className="unified-section-head"><div><h2>Каналы санкционного давления и цепочки рисков</h2><p>Санкционное воздействие рассматривается через каналы передачи внешнего шока в экономику муниципалитета. Наблюдаемые показатели подтверждают отдельные звенья, но не доказывают причинность сами по себе.</p></div><span>{RISK_CHAINS.length} причинных гипотез</span></div>
      <div className="unified-warning"><strong>Методологическая рамка.</strong> Внешние ограничения анализируются через доступность технологий и оборудования, импортные и логистические издержки, экспортный спрос и сырьевую конъюнктуру, инвестиционную активность, занятость и доходы, а также бюджетные последствия. Прямые муниципальные измерения санкционного воздействия пока ограничены; где показателей нет, система показывает пробел, а не придумывает уровень экспозиции.</div>
      <div className="unified-chain-grid">{RISK_CHAINS.map((chain) => { const hits = (selected?.model?.chains || []).find((item) => item.id === chain.id); return <article className={'unified-chain-card '+(hits?.active ? 'is-active' : '')} key={chain.id}><div><span>{hits?.active ? 'СОВПАДЕНИЕ СИГНАЛОВ' : hits?.matched ? 'ЧАСТИЧНОЕ СОВПАДЕНИЕ' : 'НЕТ ПОДТВЕРЖДЁННЫХ СИГНАЛОВ'}</span><b>{hits?.matched || 0}/{chain.stages.length}</b></div><h3>{chain.title}</h3><p>{chain.description}</p><div className="unified-chain-stages">{chain.stages.map((stage,i) => <React.Fragment key={stage}><span className={(hits?.hits || []).includes(stage) ? 'hit' : ''}>{PILLARS.find((p) => p.key === stage)?.title || stage}</span>{i < chain.stages.length-1 && <i>→</i>}</React.Fragment>)}</div></article>; })}</div>
      <div className="unified-section-head"><div><h3>Сигналы по муниципалитетам</h3><p>Количество ухудшений и найденных цепочек по доступным подтверждённым рядам.</p></div></div>
      <div className="table-scroll" role="region" tabIndex={0} aria-label="Таблица данных. Используйте горизонтальную прокрутку для просмотра всех столбцов."><table className="ranking-table"><thead><tr><th scope="col">Муниципалитет</th><th scope="col">Ухудшений</th><th scope="col">Затронуто направлений</th><th scope="col">Активных цепочек</th><th scope="col">Уровень риска</th></tr></thead><tbody>{municipalityAnalysis.map((m) => <tr key={m.id}><td><strong>{m.name}</strong></td><td>{m.model?.adverseCount ?? 0}</td><td>{m.model?.affectedPillars ?? 0}</td><td>{m.model?.chains?.filter((c) => c.active).length ?? 0}</td><td>{RISK[m.level].label}</td></tr>)}</tbody></table></div>
      <div className="unified-method-note"><strong>Логика раннего предупреждения.</strong> Система фиксирует ухудшение только у показателей с явно заданным направлением. Сигнал подтверждается ссылкой на первоисточник и временной парой значений. Цепочки показывают возможные связи между направлениями и служат гипотезами для экспертной проверки; они не доказывают причинность и не означают вероятность кризиса.</div>
    </section>}

    {tab === 'indicators' && <section className="unified-section">
      <div className="unified-section-head"><div><h2>Реестр показателей и качество данных</h2><p>Здесь видно, на каких фактах основан анализ и почему по некоторым направлениям вывод невозможен.</p></div><button type="button" className="outline-button" onClick={() => exportCsv([['Муниципалитет','Группа','Показатель','Код','Последнее значение','Единица','Период','Изменение','Качество основания','ID источника','Ссылка на источник'], ...visibleSeries.map((s) => [municipalityNames.get(s.municipalityId) || s.municipalityId,s.pillar.title,s.name,s.code,s.latest.numericValue,s.unit,periodLabel(s.latest),pct(s.changePercent),s.confidenceLabel,sourceIdsFor(s.latest).join(', '),sourceUrlsFor(s.latest).join(' | ')])], 'yugra-indicators.csv')}>Экспорт CSV</button></div>
      <div className="table-scroll" role="region" tabIndex={0} aria-label="Таблица данных. Используйте горизонтальную прокрутку для просмотра всех столбцов."><table className="ranking-table"><thead><tr><th scope="col">Муниципалитет</th><th scope="col">Группа</th><th scope="col">Показатель</th><th scope="col">Последнее значение</th><th scope="col">Период</th><th scope="col">Изменение</th><th scope="col">Направление</th><th scope="col">Качество основания</th><th scope="col">ID источника</th><th scope="col">Ссылка на источник</th></tr></thead><tbody>{visibleSeries.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())).map((s) => <tr key={s.key}><td>{municipalityNames.get(s.municipalityId) || s.municipalityId}</td><td>{s.pillar.title}</td><td>{s.name}<small>{s.code}</small></td><td>{fmt(s.latest.numericValue,2)} {s.unit}</td><td>{periodLabel(s.latest)}</td><td>{pct(s.changePercent)}</td><td>{directionText(s)}</td><td title={s.confidenceReason}>{s.confidenceLabel}</td><td>{sourceIdsFor(s.latest).join(', ') || 'Не указан'}</td><td>{sourceUrlsFor(s.latest).length ? sourceUrlsFor(s.latest).map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">Источник {index + 1} ↗</a>) : 'Не указан'}</td></tr>)}</tbody></table></div>
      <div className="unified-warning"><strong>Правило качества.</strong> Отсутствие данных не считается нулём и не даёт положительную оценку. Рейтинги и агрегированные оценки не подменяют исходные муниципальные показатели. Сравнивать можно только одинаковые коды, единицы, периоды и уровень географии.</div>
    </section>}
    <footer className="unified-footer"><span>В анализе: {series.length} подтверждённых временных рядов · {rows.filter((r) => r.verification_status === 'verified' && r.geographic_level === 'municipality').length} наблюдений</span><span>{syncLabel ? 'Обновлено ' + syncLabel : officialDataStatus === 'connected' ? 'Данные из Supabase' : 'Синхронизация не подтверждена'}</span><span>Демонстрационный аналитический контур. Сценарии иллюстрируют подход и не являются официальным прогнозом.</span></footer>
  </section>;
}
