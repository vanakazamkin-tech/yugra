import React, { useEffect, useMemo, useState } from 'react';
import { isEligibleAnnualForecastSeries } from '../lib/forecastCoverage.js';
import { assessRiskSignals, backtestAnnualSeries, buildRiskModel, DEFAULT_RISK_THRESHOLDS, deriveMunicipalIndicators, MODEL_PILLARS, parseRiskPeriod, RISK_CHAINS } from '../lib/riskModel.js';
import './UnifiedRiskForecast.css';
import { PILLARS } from '../lib/indicatorClassification.js';
import { buildRiskSeries } from '../lib/riskSeries.js';


const number = (v) => v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
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
const periodLabel = (row) => safeText(row?.reference_period) || String(row?.reference_year || '—');
const directionText = (s) => s.direction === 'higher' ? 'снижение — негативный сигнал' : s.direction === 'lower' ? 'рост — негативный сигнал' : 'изменение требует контекста';
const sourceUrlsFor = (row) => [...new Set((Array.isArray(row?.source_urls) ? row.source_urls : row?.source_url ? [row.source_url] : []).filter((url) => typeof url === 'string' && url.trim()))];
const sourceIdsFor = (row) => [...new Set((Array.isArray(row?.source_ids) ? row.source_ids : row?.source_id ? [row.source_id] : []).filter((id) => typeof id === 'string' && id.trim()))];

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
  const [riskThresholds, setRiskThresholds] = useState(DEFAULT_RISK_THRESHOLDS);

  useEffect(() => {
    let cancelled = false;
    async function loadScenarios() {
      if (!supabase || !isSupabaseConfigured) return;
      try {
        const { data, error } = await supabase.from('forecast_scenarios').select('key,title,summary,investment_growth_rate,sme_growth_rate,uncertainty_rate,display_order').eq('is_active', true).order('display_order', { ascending: true });
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
  const series = useMemo(() => buildRiskSeries(rows, riskThresholds), [rows, riskThresholds]);
  const riskModel = useMemo(() => buildRiskModel(municipalities, series), [municipalities, series]);
  const municipalityNames = useMemo(() => new Map(municipalities.map((m) => [m.id, m.name])), [municipalities]);
  const visibleSeries = useMemo(() => series.filter((s) =>
    (municipalityId === 'ALL' || s.municipalityId === municipalityId)
    && (!search || (s.name + ' ' + s.code + ' ' + (municipalityNames.get(s.municipalityId) || '')).toLowerCase().includes(search.toLowerCase()))
  ), [series, municipalityId, search, municipalityNames]);
  const municipalityAnalysis = useMemo(() => municipalities.map((m) => {
    const own = series.filter((s) => s.municipalityId === m.id);
    const assessment = assessRiskSignals(own, riskThresholds);
    const pillars = PILLARS.map((p) => ({ ...p, series: own.filter((s) => s.pillar.key === p.key) })).filter((p) => p.series.length);
    return { ...m, own, pillars, ...assessment, coverage: own.length, model: riskModel.byMunicipality[m.id] || null };
  }).sort((a, b) => {
    const priority = { critical: 0, watch: 1, stable: 2, insufficient: 3 };
    return priority[a.level] - priority[b.level] || b.bad.length - a.bad.length || String(a.name || a.id).localeCompare(String(b.name || b.id), 'ru-RU');
  }), [municipalities, series, riskModel, riskThresholds]);
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
  const forecastOptions = useMemo(() => series.filter((s) => parseRiskPeriod(s.latest)?.frequency === 'annual' && isEligibleAnnualForecastSeries(s)), [series]);
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
    <div className="unified-warning"><strong>Статус концепта.</strong> Расчёты используют подтверждённые муниципальные наблюдения и производные коэффициенты. Интегральный индекс рассчитывается отдельно по методологии направления №1; этот риск-модуль его не пересчитывает. Сценарный прогноз — отдельный контур направления №2. Рисковые сигналы основаны на наблюдаемой динамике и не являются вероятностью кризиса. Для управленческого применения необходимы экспертная калибровка и историческая валидация.</div>
    <nav className="unified-tabs" role="group" aria-label="Разделы аналитики">
      <button type="button" className={tab === 'concept' ? 'active' : ''} aria-pressed={tab === 'concept'} onClick={() => setTab('concept')}>Концепция модели</button>
      <button type="button" className={tab === 'overview' ? 'active' : ''} aria-pressed={tab === 'overview'} onClick={() => setTab('overview')}>Панель модели</button>
      <button type="button" className={tab === 'municipality' ? 'active' : ''} aria-pressed={tab === 'municipality'} onClick={() => setTab('municipality')}>Разбор муниципалитета</button>
      <button type="button" className={tab === 'forecast' ? 'active' : ''} aria-pressed={tab === 'forecast'} onClick={() => setTab('forecast')}>Сценарный прогноз</button>
      <button type="button" className={tab === 'model' ? 'active' : ''} aria-pressed={tab === 'model'} onClick={() => setTab('model')}>Профиль рисков</button>
      <button type="button" className={tab === 'chains' ? 'active' : ''} aria-pressed={tab === 'chains'} onClick={() => setTab('chains')}>Каналы санкционного давления и риски</button>
      <button type="button" className={tab === 'indicators' ? 'active' : ''} aria-pressed={tab === 'indicators'} onClick={() => setTab('indicators')}>Показатели и данные</button>
    </nav>
    <div className="unified-filters">
      <label>Территория<select value={municipalityId} onChange={(e) => { setMunicipalityId(e.target.value); setSelectedMunicipality(e.target.value === 'ALL' ? '' : e.target.value); }}><option value="ALL">Все муниципалитеты</option>{municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      <label className="unified-search">Поиск<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Показатель или муниципалитет" aria-label="Поиск показателя или муниципалитета"/></label>
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
      <section className="unified-section">
        <div className="unified-section-head"><div><h2>Настройка порогов светофора</h2><p>Изменения сразу пересчитывают статусы муниципалитетов. Пороги являются настраиваемыми правилами прототипа, а не статистически откалиброванными нормативами.</p></div><button type="button" className="outline-button" onClick={() => setRiskThresholds(DEFAULT_RISK_THRESHOLDS)}>Сбросить пороги</button></div>
        <div className="unified-forecast-controls risk-threshold-controls" role="group" aria-label="Настройка порогов классификации рисков">
          <label>Минимум рядов с понятным направлением: {riskThresholds.minimumUsable}<input type="range" min="1" max="5" step="1" value={riskThresholds.minimumUsable} onChange={(e) => setRiskThresholds((current) => ({ ...current, minimumUsable: Number(e.target.value) }))}/></label>
          <label>Негативных сигналов для красной зоны: {riskThresholds.criticalSignals}<input type="range" min="2" max="10" step="1" value={riskThresholds.criticalSignals} onChange={(e) => setRiskThresholds((current) => ({ ...current, criticalSignals: Number(e.target.value), criticalPillars: Math.min(current.criticalPillars, Number(e.target.value)) }))}/></label>
          <label>Направлений для красной зоны: {riskThresholds.criticalPillars}<input type="range" min="1" max={Math.min(6, riskThresholds.criticalSignals)} step="1" value={riskThresholds.criticalPillars} onChange={(e) => setRiskThresholds((current) => ({ ...current, criticalPillars: Number(e.target.value) }))}/></label>
          <label>Резкое ухудшение от: {riskThresholds.sharpChangePercent}%<input type="range" min="1" max="50" step="1" value={riskThresholds.sharpChangePercent} onChange={(e) => setRiskThresholds((current) => ({ ...current, sharpChangePercent: Number(e.target.value) }))}/></label>
        </div>
        <p className="unified-muted">Жёлтая зона — есть хотя бы один негативный сигнал после достижения минимального покрытия. Зелёная зона — негативных сигналов нет при достаточном числе оцениваемых рядов. При недостатке данных статус остаётся неопределённым.</p>
      </section>
      <div className="unified-kpis">
        <article className="risk-kpi risk-kpi-red"><div><small>НЕСКОЛЬКО УХУДШЕНИЙ</small><strong>{counts.critical}</strong><span>муниципалитетов с {riskThresholds.criticalSignals}+ негативными сигналами по {riskThresholds.criticalPillars}+ направлениям</span></div></article>
        <article className="risk-kpi risk-kpi-yellow"><div><small>ЕСТЬ УХУДШЕНИЯ</small><strong>{counts.watch}</strong><span>хотя бы один негативный сигнал</span></div></article>
        <article className="risk-kpi risk-kpi-green"><div><small>БЕЗ НЕГАТИВНЫХ СИГНАЛОВ</small><strong>{counts.stable}</strong><span>не менее {riskThresholds.minimumUsable} оцениваемых рядов</span></div></article>
        <article className="risk-kpi risk-kpi-neutral"><div><small>НЕДОСТАТОЧНО ДАННЫХ</small><strong>{counts.insufficient}</strong><span>нельзя надёжно оценить динамику</span></div></article>
      </div>
      <section className="unified-section">
        <div className="unified-section-head"><div><h2>Где ситуация требует внимания</h2><p>Список отсортирован по числу негативных сигналов; пороги красной зоны учитывают также число затронутых направлений. Нажмите на территорию для подробного разбора.</p></div><button type="button" className="outline-button" onClick={() => exportCsv([['Муниципалитет','Статус','Оцениваемых рядов','Негативных сигналов','Показатели'], ...filteredMunicipalities.map((m) => [m.name,RISK[m.level].label,m.usable.length,m.bad.length,m.bad.map((s) => s.name).join(', ')])], 'yugra-risk-overview.csv')}>Экспорт CSV</button></div>
        <div className="table-scroll" role="region" tabIndex={0} aria-label="Таблица данных. Используйте горизонтальную прокрутку для просмотра всех столбцов."><table className="ranking-table risk-table"><thead><tr><th scope="col">Муниципалитет</th><th scope="col">Сигнал системы</th><th scope="col">Рядов с направлением</th><th scope="col">Ухудшений</th><th scope="col">Что ухудшается</th><th scope="col"></th></tr></thead><tbody>
          {filteredMunicipalities.map((m) => <tr key={m.id}><td><strong>{m.name}</strong></td><td><span className={'risk-zone-badge risk-zone-' + (m.level === 'critical' ? 'red' : m.level === 'watch' ? 'yellow' : m.level === 'stable' ? 'green' : 'unknown')}>{RISK[m.level].label}</span></td><td>{m.usable.length}</td><td>{m.bad.length}</td><td>{m.bad.slice(0,3).map((s) => s.name).join('; ') || 'Нет подтверждённого ухудшения по оцениваемым рядам'}</td><td><button type="button" className="outline-button" onClick={() => { setSelectedMunicipality(m.id); setTab('municipality'); }}>Разобрать</button></td></tr>)}
        </tbody></table></div>
      </section>
      <section className="unified-section">
        <div className="unified-section-head"><div><h2>Покрытие ключевых направлений</h2><p>Показывает, где есть подтверждённые ряды, а где выводы пока ограничены отсутствием данных.</p></div><span>{rows.filter((r) => r.verification_status === 'verified' && r.geographic_level === 'municipality').length.toLocaleString('ru-RU')} подтверждённых наблюдений</span></div>
        <div className="unified-pillar-grid">{pillarSummary.filter((p) => ['employment','income','budget','migration','investment'].includes(p.key)).map((p) => <article className="unified-pillar" key={p.key}><strong>{p.title}</strong><div className="unified-track"><i style={{width: Math.min(100,p.territories / Math.max(1,municipalities.length) * 100) + '%'}}/></div><p><b>{p.territories}/{municipalities.length}</b> территорий · {p.count} временных рядов</p><small>{p.deteriorating} негативных сигналов · {p.note}</small></article>)}</div>
      </section>
      <section className="unified-section">
        <div className="unified-section-head"><div><h2>Покрытие ключевых направлений по территориям</h2><p>Показывает реальное наличие подтверждённых рядов, а не оценку благополучия. Нажмите на направление, чтобы отфильтровать реестр.</p></div><span>{municipalities.length} муниципалитетов в справочнике</span></div>
        <div className="table-scroll" role="region" tabIndex={0} aria-label="Таблица данных. Используйте горизонтальную прокрутку для просмотра всех столбцов."><table className="ranking-table"><thead><tr><th scope="col">Направление</th><th scope="col">Территорий с данными</th><th scope="col">Временных рядов</th><th scope="col">Где пока нет данных</th></tr></thead><tbody>{coreCoverage.map((p) => <tr key={p.key}><td><strong>{p.title}</strong></td><td>{p.territories}/{municipalities.length}</td><td>{p.rows}</td><td>{p.missing.length ? p.missing.join(', ') : 'Покрытие по всем территориям'}</td></tr>)}</tbody></table></div>
        <p className="unified-muted">Наличие хотя бы одного ряда не означает наличие полной временной истории или сопоставимости всех муниципалитетов. Перед сравнением учитывайте единицы, период и методику.</p>
      </section>
      <section className="unified-section">
        <div className="unified-section-head"><div><h2>Сигналы, требующие проверки</h2><p>Показываем изменение только там, где направление показателя можно интерпретировать. Для контекстных рядов изменение не окрашивается как «хорошее» или «плохое».</p></div><span>{visibleSeries.filter((s) => s.adverse === true).length} негативных сигналов</span></div>
        <div className="table-scroll" role="region" tabIndex={0} aria-label="Таблица данных. Используйте горизонтальную прокрутку для просмотра всех столбцов."><table className="ranking-table"><thead><tr><th scope="col">Муниципалитет</th><th scope="col">Направление</th><th scope="col">Показатель</th><th scope="col">Было</th><th scope="col">Стало</th><th scope="col">Изменение</th><th scope="col">Период</th></tr></thead><tbody>{visibleSeries.filter((s) => s.adverse !== null).sort((a,b) => Number(b.adverse)-Number(a.adverse) || Math.abs(b.changePercent || 0)-Math.abs(a.changePercent || 0)).slice(0,60).map((s) => <tr key={s.key}><td>{municipalityNames.get(s.municipalityId) || s.municipalityId}</td><td>{s.pillar.title}</td><td>{s.name}</td><td>{fmt(s.previous?.numericValue,2)} {s.unit}</td><td>{fmt(s.latest.numericValue,2)} {s.unit}</td><td className={s.adverse ? 'trend-negative' : 'trend-positive'}>{pct(s.changePercent)}</td><td>{periodLabel(s.previous)} → {periodLabel(s.latest)}</td></tr>)}</tbody></table>{visibleSeries.every((s) => s.adverse === null) && <p className="empty-state">Для выбранных фильтров пока нет рядов с однозначным направлением.</p>}</div>
      </section>
    </>}

    {tab === 'municipality' && <section className="unified-section">
      <div className="unified-section-head"><div><h2>Паспорт рисков территории</h2><p>Конкретные изменения, контекст показателей и ограничения данных.</p></div><select value={selected?.id || ''} onChange={(e) => setSelectedMunicipality(e.target.value)}>{municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
      {selected && <>
        <div className="municipality-risk-summary"><div><span>Сигнал системы</span><strong>{RISK[selected.level].label}</strong></div><div><span>Рядов с понятным направлением</span><strong>{selected.usable.length}</strong></div><div><span>Негативных изменений</span><strong>{selected.bad.length}</strong></div><div><span>Резких ухудшений</span><strong>{selected.sharpChangeCount}</strong></div><div><span>Всего подтверждённых рядов</span><strong>{selected.coverage}</strong></div></div>
        <div className="unified-model-result"><span>Покрытие риск-мониторинга</span><strong>{selected.model?.availablePillars ?? 0} / 6 направлений</strong><small>{selected.model?.usableIndicators ?? 0} рядов с однозначным направлением и сопоставимой динамикой · всего рядов: {selected.model?.totalSeries ?? selected.coverage}</small></div>
        <div className="unified-explanation"><h3>Что это означает</h3><p>{selected.explanation}</p><ul>{selected.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>{selected.earlyWarning && <><p className="trend-negative"><strong>Раннее предупреждение:</strong> негативная динамика повторяется не менее двух последовательных сопоставимых интервалов. Это индикатор для проверки, а не самостоятельное основание для красной зоны.</p><div className="unified-signal-list">{selected.repeatedDeterioration.map((signal) => { const start = signal.points[Math.max(0, signal.points.length - signal.adverseStreak - 1)]; return <article key={signal.key}><div><strong>{signal.name}</strong><span>{signal.pillar.title}</span></div><b>{signal.adverseStreak} интервала подряд</b><p>{periodLabel(start)} → {periodLabel(signal.latest)} · {signal.unit}</p><small>Повторяющееся ухудшение требует проверки определения показателя, методики, источника и возможных причин.</small></article>; })}</div></>}</div>
        <h3>Негативные сигналы</h3>
        {selected.bad.length ? <div className="unified-signal-list">{selected.bad.map((s) => <article key={s.key}><div><strong>{s.name}</strong><span>{s.pillar.title}</span></div><b>{pct(s.changePercent)}</b><p>{fmt(s.previous?.numericValue,2)} → {fmt(s.latest.numericValue,2)} {s.unit} · {periodLabel(s.previous)} → {periodLabel(s.latest)}</p><small>Интерпретация: {directionText(s)}. Достоверность: {s.confidenceLabel}. {s.confidenceReason} Резкое ухудшение: {s.sharpChange ? 'да' : 'нет'} (порог {s.sharpChangeThreshold}%). Источники: {sourceIdsFor(s.latest).join(', ') || 'не указаны'}. Проверьте методику и первоисточник перед управленческим решением.</small>{sourceUrlsFor(s.latest).map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">Открыть источник {index + 1} ↗</a>)}</article>)}</div> : <p className="empty-state">По текущим подтверждённым рядам негативные сигналы не выявлены либо данных недостаточно.</p>}
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
        <div className="unified-scenario-grid">{forecastRows.map((r) => <article key={r.key} className={'unified-scenario scenario-' + scenarioTone(r.key)}><span>{r.title}</span><strong>{fmt(r.value,2)} <small>{forecastSeries.unit}</small></strong><p>{pct(r.rate)} в год · диапазон {fmt(r.low,2)}–{fmt(r.high,2)} · через {horizon} г.</p><div className="unified-track"><i style={{width: Math.max(2,Math.min(100,Math.abs(r.value)/(Math.max(1,...forecastRows.map((x) => Math.abs(x.value))))*100)) + '%'}}/></div><small>{r.summary || ''}</small></article>)}</div>
        <div className="unified-backtest"><div><span>Проверка на исторических периодах</span><strong>{forecastBacktest.count ? fmt(forecastBacktest.mape,1)+'%' : 'Недостаточно истории'}</strong><small>Средняя абсолютная процентная ошибка · тестовых точек: {forecastBacktest.count}</small></div><div><span>Смещение прогноза</span><strong>{forecastBacktest.bias == null ? '—' : pct(forecastBacktest.bias)}</strong><small>Положительное значение — модель завышала фактические значения</small></div><div><span>Статус проверки</span><strong>{forecastBacktest.status === 'pilot' ? 'Пилотная проверка' : forecastBacktest.status === 'very_small_sample' ? 'Малая выборка' : 'Не рассчитана'}</strong><small>Walk-forward: каждый следующий год прогнозируется только по предыдущим наблюдениям</small></div></div>
        {history.length < 3 && <div className="unified-warning"><strong>Ограниченная история.</strong> В ряду только два наблюдения. Темп между ними нестабилен и не позволяет проверить качество прогноза на прошлых периодах. Используйте сценарии как ориентир чувствительности.</div>}
        <div className="table-scroll" role="region" tabIndex={0} aria-label="Таблица данных. Используйте горизонтальную прокрутку для просмотра всех столбцов."><table className="ranking-table"><thead><tr><th scope="col">Фактический год</th><th scope="col">Фактическое значение</th><th scope="col">Изменение к предыдущему году</th></tr></thead><tbody>{history.map((p,i) => <tr key={i}><td>{p.reference_year || periodLabel(p)}</td><td>{fmt(p.numericValue,2)} {forecastSeries.unit}</td><td>{i ? pct((p.numericValue/history[i-1].numericValue-1)*100) : 'Базовое наблюдение'}</td></tr>)}</tbody></table></div>
      </> : <div className="empty-state"><strong>Пока нет подходящего ряда для прогноза</strong><p>Для сценарного расчёта нужны минимум два подтверждённых годовых наблюдения одного показателя в одном муниципалитете и одной единице измерения. Квартальные, полугодовые и городские данные не смешиваются с годовыми муниципальными рядами.</p></div>}
      {scenarioError && <p className="unified-muted">Не удалось загрузить параметры сценариев из базы: {scenarioError}. Используются встроенные шаблоны.</p>}
    </section>}


    {tab === 'model' && <section className="unified-section">
      <div className="unified-section-head"><div><h2>Профиль риск-мониторинга</h2><p>Раздел показывает покрытие показателями, наблюдаемые ухудшения и активные гипотезы риск-цепочек. Интегральный индекс устойчивости здесь не рассчитывается.</p></div><span>Диагностика, не рейтинг</span></div>
      <div className="unified-warning"><strong>Разделение методик.</strong> Интегральный индекс и его веса принадлежат направлению №1. Сценарный прогноз относится к направлению №2. Здесь используются только подтверждённые временные ряды, их направление, сопоставимость и фактические негативные изменения.</div>
      <div className="table-scroll" role="region" tabIndex={0} aria-label="Таблица данных. Используйте горизонтальную прокрутку для просмотра всех столбцов."><table className="ranking-table"><thead><tr><th scope="col">Муниципалитет</th><th scope="col">Оцениваемых рядов</th><th scope="col">Направлений с данными</th><th scope="col">Негативных сигналов</th><th scope="col">Резких ухудшений</th><th scope="col">Затронуто направлений</th><th scope="col">Активных цепочек</th><th scope="col">Уровень риска</th></tr></thead><tbody>
        {municipalityAnalysis.map((m) => <tr key={m.id}><td><strong>{m.name}</strong></td><td>{m.model?.usableIndicators ?? 0}</td><td>{m.model?.availablePillars ?? 0}/6</td><td>{m.model?.adverseCount ?? 0}</td><td>{m.sharpChangeCount ?? 0}</td><td>{m.model?.affectedPillars ?? 0}</td><td>{m.model?.chains?.filter((chain) => chain.active).length ?? 0}</td><td>{RISK[m.level].label}</td></tr>)}
      </tbody></table></div>
      {selected && <><div className="unified-section-head"><div><h3>Покрытие направлений: {selected.name}</h3><p>Количество временных рядов с однозначным направлением и сопоставимой последней динамикой.</p></div><span>{selected.model?.usableIndicators ?? 0} из {selected.coverage} подтверждённых рядов</span></div>
        <div className="unified-model-pillar-grid">{(selected.model?.pillars || MODEL_PILLARS.map((p) => ({ ...p, indicators: 0, adverse: 0, totalSeries: 0 }))).map((p) => <article className="unified-pillar" key={p.key}><div><strong>{p.title}</strong><span>{p.indicators}</span></div><p>{p.adverse} негативных сигналов · {p.totalSeries} всего рядов</p><small>Неизвестное направление и несопоставимые периоды не учитываются как благополучие.</small></article>)}</div>
      </>}
      <div className="unified-method-note"><strong>Ограничение.</strong> Число негативных сигналов и охват направлений — диагностические счётчики. Они не складываются в интегральный индекс, не заменяют экспертную оценку и не означают вероятность кризиса.</div>
    </section>}

    {tab === 'chains' && <section className="unified-section">
      <div className="unified-section-head"><div><h2>Каналы санкционного давления и цепочки рисков</h2><p>Санкционное воздействие рассматривается через каналы передачи внешнего шока в экономику муниципалитета. Наблюдаемые показатели подтверждают отдельные звенья, но не доказывают причинность сами по себе.</p></div><span>{RISK_CHAINS.length} причинных гипотез</span></div>
      <div className="unified-warning"><strong>Методологическая рамка.</strong> Внешние ограничения анализируются через доступность технологий и оборудования, импортные и логистические издержки, экспортный спрос и сырьевую конъюнктуру, инвестиционную активность, занятость и доходы, а также бюджетные последствия. Прямые муниципальные измерения санкционного воздействия пока ограничены; где показателей нет, система показывает пробел, а не придумывает уровень экспозиции.</div>
      <div className="unified-chain-grid">{RISK_CHAINS.map((chain) => { const hits = (selected?.model?.chains || []).find((item) => item.id === chain.id); return <article className={'unified-chain-card '+(hits?.active ? 'is-active' : '')} key={chain.id}><div><span>{hits?.active ? 'СОВПАДЕНИЕ СИГНАЛОВ' : hits?.matched ? 'ЧАСТИЧНОЕ СОВПАДЕНИЕ' : 'НЕТ ПОДТВЕРЖДЁННЫХ СИГНАЛОВ'}</span><b>{hits?.matched || 0}/{chain.stages.length}</b></div><h3>{chain.title}</h3><p>{chain.description}</p><div className="unified-chain-stages">{chain.stages.map((stage,i) => <React.Fragment key={stage}><span className={(hits?.hits || []).includes(stage) ? 'hit' : ''}>{PILLARS.find((p) => p.key === stage)?.title || stage}</span>{i < chain.stages.length-1 && <i>→</i>}</React.Fragment>)}</div></article>; })}</div>
      <div className="unified-section-head"><div><h3>Сигналы по муниципалитетам</h3><p>Количество ухудшений и найденных цепочек по доступным подтверждённым рядам.</p></div></div>
      <div className="table-scroll" role="region" tabIndex={0} aria-label="Таблица данных. Используйте горизонтальную прокрутку для просмотра всех столбцов."><table className="ranking-table"><thead><tr><th scope="col">Муниципалитет</th><th scope="col">Ухудшений</th><th scope="col">Затронуто направлений</th><th scope="col">Активных цепочек</th><th scope="col">Уровень риска</th></tr></thead><tbody>{municipalityAnalysis.map((m) => <tr key={m.id}><td><strong>{m.name}</strong></td><td>{m.model?.adverseCount ?? 0}</td><td>{m.model?.affectedPillars ?? 0}</td><td>{m.model?.chains?.filter((c) => c.active).length ?? 0}</td><td>{RISK[m.level].label}</td></tr>)}</tbody></table></div>
      <div className="unified-method-note"><strong>Логика раннего предупреждения.</strong> Система фиксирует ухудшение только у показателей с явно заданным направлением. Сигнал подтверждается ссылкой на первоисточник и временной парой значений. Приоритет внимания — эвристический показатель концентрации негативных сигналов; он не трактуется как вероятность кризиса.</div>
    </section>}

    {tab === 'indicators' && <section className="unified-section">
      <div className="unified-section-head"><div><h2>Реестр показателей и качество данных</h2><p>Здесь видно, на каких фактах основан анализ и почему по некоторым направлениям вывод невозможен.</p></div><button type="button" className="outline-button" onClick={() => exportCsv([['Муниципалитет','Группа','Показатель','Код','Последнее значение','Единица','Период','Изменение','Достоверность','ID источника','Ссылка на источник'], ...visibleSeries.map((s) => [municipalityNames.get(s.municipalityId) || s.municipalityId,s.pillar.title,s.name,s.code,s.latest.numericValue,s.unit,periodLabel(s.latest),pct(s.changePercent),s.confidenceLabel,sourceIdsFor(s.latest).join(', '),sourceUrlsFor(s.latest).join(' | ')])], 'yugra-indicators.csv')}>Экспорт CSV</button></div>
      <div className="table-scroll" role="region" tabIndex={0} aria-label="Таблица данных. Используйте горизонтальную прокрутку для просмотра всех столбцов."><table className="ranking-table"><thead><tr><th scope="col">Муниципалитет</th><th scope="col">Группа</th><th scope="col">Показатель</th><th scope="col">Последнее значение</th><th scope="col">Период</th><th scope="col">Изменение</th><th scope="col">Направление</th><th scope="col">Достоверность</th><th scope="col">ID источника</th><th scope="col">Ссылка на источник</th></tr></thead><tbody>{visibleSeries.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())).map((s) => <tr key={s.key}><td>{municipalityNames.get(s.municipalityId) || s.municipalityId}</td><td>{s.pillar.title}</td><td>{s.name}<small>{s.code}</small></td><td>{fmt(s.latest.numericValue,2)} {s.unit}</td><td>{periodLabel(s.latest)}</td><td>{pct(s.changePercent)}</td><td>{directionText(s)}</td><td title={s.confidenceReason}>{s.confidenceLabel}</td><td>{sourceIdsFor(s.latest).join(', ') || 'Не указан'}</td><td>{sourceUrlsFor(s.latest).length ? sourceUrlsFor(s.latest).map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">Источник {index + 1} ↗</a>) : 'Не указан'}</td></tr>)}</tbody></table></div>
      <div className="unified-warning"><strong>Правило качества.</strong> Отсутствие данных не считается нулём и не даёт положительную оценку. Рейтинги и агрегированные оценки не подменяют исходные муниципальные показатели. Сравнивать можно только одинаковые коды, единицы, периоды и уровень географии.</div>
    </section>}
    <footer className="unified-footer"><span>В анализе: {series.length} подтверждённых временных рядов · {rows.filter((r) => r.verification_status === 'verified' && (r.geographic_level || 'municipality') === 'municipality').length} наблюдений</span><span>{syncLabel ? 'Обновлено ' + syncLabel : officialDataStatus === 'connected' ? 'Данные из Supabase' : 'Синхронизация не подтверждена'}</span><span>Демонстрационный аналитический контур. Сценарии иллюстрируют подход и не являются официальным прогнозом.</span></footer>
  </section>;
}
