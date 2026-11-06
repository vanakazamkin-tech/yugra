import React, { useEffect, useMemo, useState } from 'react';
import { buildForecastCoverage } from '../lib/forecastCoverage';
import { buildForecasts, summarizeForecast } from '../lib/forecastModel';

const FALLBACK_SCENARIOS = [
  { id: null, key: 'cautious', title: 'Пессимистичный', summary: 'Неблагоприятный сценарий: снижение экспортной выручки, усиление санкционных ограничений, рост издержек предприятий и дефицит кадров.', investment_growth_rate: -8, sme_growth_rate: -4, score_growth_rate: -3, uncertainty_rate: 18, export_shock_pct: -10, cost_pressure_pct: 8, labor_shortage_pct: 6, display_order: 1 },
  { id: null, key: 'base', title: 'Базовый', summary: 'Продолжение наблюдаемых тенденций при сохранении текущих внешних и внутренних условий.', investment_growth_rate: 4, sme_growth_rate: 3, score_growth_rate: 1.5, uncertainty_rate: 7, export_shock_pct: 0, cost_pressure_pct: 0, labor_shortage_pct: 0, display_order: 2 },
  { id: null, key: 'ambitious', title: 'Оптимистичный', summary: 'Улучшение инвестиционной активности, расширение занятости и реализация мер поддержки при доступности ресурсов.', investment_growth_rate: 8, sme_growth_rate: 6, score_growth_rate: 3, uncertainty_rate: 12, export_shock_pct: 4, cost_pressure_pct: -2, labor_shortage_pct: -2, display_order: 3 },
];

const hasNumericValue = (value) => value != null && value !== '' && Number.isFinite(Number(value));
const n = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const fmt = (value, digits) => value == null || value === '' ? '—' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits == null ? 1 : digits, minimumFractionDigits: 0 }).format(value);
const pct = (value) => (value > 0 ? '+' : '') + fmt(value, 1) + '%';

export default function Forecasting({ municipalities, supabase, isSupabaseConfigured, officialIndicators = [], programExecution = [], officialDataStatus = 'offline', officialDataSyncedAt = null }) {
  const [scenarios, setScenarios] = useState(FALLBACK_SCENARIOS);
  const [scenarioKey, setScenarioKey] = useState('base');
  const [horizon, setHorizon] = useState(3);
  const [params, setParams] = useState({
    investment_growth_rate: 4,
    sme_growth_rate: 3,
    score_growth_rate: 1.5,
    uncertainty_rate: 7,
    export_shock_pct: 0,
    cost_pressure_pct: 0,
    labor_shortage_pct: 0,
  });
  const [scenarioStatus, setScenarioStatus] = useState('fallback');
  const [selectedId, setSelectedId] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadScenarios() {
      if (!isSupabaseConfigured || !supabase) return;
      try {
        const result = await supabase.from('forecast_scenarios')
          .select('id,key,title,summary,investment_growth_rate,sme_growth_rate,score_growth_rate,uncertainty_rate,display_order')
          .eq('is_active', true).order('display_order', { ascending: true });
        if (result.error) throw result.error;
        if (cancelled) return;
        if (Array.isArray(result.data) && result.data.length) {
          const normalized = result.data.map((s) => ({
            id: s.id, key: s.key, title: s.title, summary: s.summary,
            investment_growth_rate: n(s.investment_growth_rate),
            sme_growth_rate: n(s.sme_growth_rate),
            score_growth_rate: n(s.score_growth_rate),
            uncertainty_rate: n(s.uncertainty_rate),
            export_shock_pct: FALLBACK_SCENARIOS.find((item) => item.key === s.key)?.export_shock_pct ?? 0,
            cost_pressure_pct: FALLBACK_SCENARIOS.find((item) => item.key === s.key)?.cost_pressure_pct ?? 0,
            labor_shortage_pct: FALLBACK_SCENARIOS.find((item) => item.key === s.key)?.labor_shortage_pct ?? 0,
            display_order: s.display_order,
          }));
          setScenarios(normalized);
          setScenarioStatus('database');
          const initial = normalized.find((s) => s.key === 'base') || normalized[0];
          setScenarioKey(initial.key);
          setParams({
            investment_growth_rate: initial.investment_growth_rate,
            sme_growth_rate: initial.sme_growth_rate,
            score_growth_rate: initial.score_growth_rate,
            uncertainty_rate: initial.uncertainty_rate,
            export_shock_pct: initial.export_shock_pct,
            cost_pressure_pct: initial.cost_pressure_pct,
            labor_shortage_pct: initial.labor_shortage_pct,
          });
        }
      } catch {
        if (!cancelled) setScenarioStatus('fallback');
      }
    }
    loadScenarios();
    return () => { cancelled = true; };
  }, [isSupabaseConfigured, supabase]);

  const activeScenario = scenarios.find((item) => item.key === scenarioKey) || scenarios[0];
  const forecasts = useMemo(() => buildForecasts(municipalities || [], params, horizon), [municipalities, params, horizon]);
  const scenarioComparisons = useMemo(() => scenarios.map((scenario) => {
    const scenarioParams = {
      investment_growth_rate: scenario.investment_growth_rate,
      sme_growth_rate: scenario.sme_growth_rate,
      score_growth_rate: scenario.score_growth_rate,
      uncertainty_rate: scenario.uncertainty_rate,
      export_shock_pct: scenario.export_shock_pct ?? 0,
      cost_pressure_pct: scenario.cost_pressure_pct ?? 0,
      labor_shortage_pct: scenario.labor_shortage_pct ?? 0,
    };
    return { ...scenario, summary: summarizeForecast(buildForecasts(municipalities || [], scenarioParams, horizon)) };
  }), [scenarios, municipalities, horizon]);
  const factorSummary = useMemo(() => {
    const rows = forecasts.filter((row) => row.projectedScore != null);
    return ['exportShock', 'costPressure', 'laborShortage'].map((key) => {
      const items = rows.map((row) => row.factorImpacts.find((factor) => factor.key === key)?.scorePoints).filter(Number.isFinite);
      return { key, label: rows[0]?.factorImpacts.find((factor) => factor.key === key)?.label || key, average: items.length ? items.reduce((sum, value) => sum + value, 0) / items.length : null };
    });
  }, [forecasts]);
  const officialCoverage = useMemo(() => buildForecastCoverage(officialIndicators, programExecution, (municipalities || []).length || 22), [officialIndicators, programExecution, municipalities]);
  const officialCoverageLoaded = officialDataStatus === 'connected' || Boolean(officialDataSyncedAt);
  const officialCoverageStale = officialDataStatus === 'error' && Boolean(officialDataSyncedAt);
  const officialCoverageSyncedLabel = officialDataSyncedAt
    ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(officialDataSyncedAt))
    : null;
  const filtered = useMemo(() => {
    const searchText = search.trim().toLocaleLowerCase('ru-RU');
    return forecasts.filter((row) => (selectedId === 'ALL' || row.id === selectedId)
      && (!searchText || row.name.toLocaleLowerCase('ru-RU').includes(searchText)));
  }, [forecasts, selectedId, search]);
  const totalInvestment = useMemo(() => {
    const available = forecasts.filter((row) => row.projectedInvestments != null);
    return available.length ? available.reduce((sum, row) => sum + row.projectedInvestments, 0) : null;
  }, [forecasts]);
  const baselineInvestment = useMemo(() => {
    const available = forecasts.filter((row) => row.investment != null);
    return available.length ? available.reduce((sum, row) => sum + row.investment, 0) : null;
  }, [forecasts]);
  const totalSme = useMemo(() => {
    const available = forecasts.filter((row) => row.projectedSme != null);
    return available.length ? available.reduce((sum, row) => sum + row.projectedSme, 0) : null;
  }, [forecasts]);
  const baselineSme = useMemo(() => {
    const available = forecasts.filter((row) => row.sme != null);
    return available.length ? available.reduce((sum, row) => sum + row.sme, 0) : null;
  }, [forecasts]);
  const avgScore = useMemo(() => {
    const validScores = forecasts.filter((row) => row.projectedScore != null);
    return validScores.length ? validScores.reduce((sum, row) => sum + row.projectedScore, 0) / validScores.length : null;
  }, [forecasts]);
  const investmentCoverage = forecasts.filter((row) => row.hasInvestment).length;
  const smeCoverage = forecasts.filter((row) => row.hasSme).length;
  const scoreCoverage = forecasts.filter((row) => row.hasScore).length;
  const chartRows = useMemo(() => filtered.filter((row) => row.projectedInvestments != null).slice().sort((a, b) => b.projectedInvestments - a.projectedInvestments).slice(0, 8), [filtered]);
  const maxInvestments = Math.max(1, ...chartRows.map((row) => row.projectedInvestments));

  const selectScenario = (key) => {
    const selected = scenarios.find((item) => item.key === key);
    if (!selected) return;
    setScenarioKey(key);
    setParams({
      investment_growth_rate: selected.investment_growth_rate,
      sme_growth_rate: selected.sme_growth_rate,
      score_growth_rate: selected.score_growth_rate,
      uncertainty_rate: selected.uncertainty_rate,
      export_shock_pct: selected.export_shock_pct ?? 0,
      cost_pressure_pct: selected.cost_pressure_pct ?? 0,
      labor_shortage_pct: selected.labor_shortage_pct ?? 0,
    });
  };
  const setParam = (key, value) => {
    setParams((current) => Object.assign({}, current, { [key]: value }));
  };


  const exportCsv = () => {
    const headers = ['Муниципалитет', 'Группа', 'Инвестиции: база, млрд ₽', 'Инвестиции: прогноз, млрд ₽', 'Нижняя граница модели, млрд ₽', 'Верхняя граница модели, млрд ₽', 'МСП: база', 'МСП: прогноз', 'МСП: нижняя граница', 'МСП: верхняя граница', 'Прогнозный балл', 'Модельное место'];
    const rows = filtered.map((row) => [
      row.name, row.group || '', row.investment, row.projectedInvestments, row.investmentsLow, row.investmentsHigh,
      row.sme, row.projectedSme, row.smeLow, row.smeHigh, row.projectedScore, row.projectedRank,
    ]);
    // Prevent spreadsheet formula execution for text cells in exported CSV.
    // Numeric values remain numeric (including legitimate negative scenario outputs).
    const escaped = (value) => {
      let text = String(value == null ? '' : value);
      if (typeof value === 'string' && /^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    const metadata = [
      ['Тип результата', 'Концептуальный сценарный расчёт, не официальный прогноз'],
      ['Сценарий', activeScenario.title],
      ['Горизонт, лет', horizon],
      ['Годовой темп инвестиций, %', params.investment_growth_rate],
      ['Годовой темп МСП, %', params.sme_growth_rate],
      ['Годовое изменение балла, %', params.score_growth_rate],
      ['Условная неопределённость, %/год', params.uncertainty_rate],
      ['Шок экспортной выручки, % (допущение)', params.export_shock_pct],
      ['Рост издержек, % (допущение)', params.cost_pressure_pct],
      ['Кадровый дефицит, % (допущение)', params.labor_shortage_pct],
      ['Покрытие инвестиций', investmentCoverage + ' из ' + forecasts.length + ' территорий'],
      ['Покрытие МСП', smeCoverage + ' из ' + forecasts.length + ' территорий'],
      ['Покрытие модельного балла', scoreCoverage + ' из ' + forecasts.length + ' территорий'],
      ['Официальный каталог данных', officialCoverageLoaded ? 'Загружен из Supabase' : 'Не загружен; актуальный охват не подтверждён'],
      ['Включено ли покрытие официальных данных в расчёт', 'Нет; матрица покрытия показана отдельно от расчётного ядра'],
      ...officialCoverage.map((item) => [
        'Охват официальными данными: ' + item.label,
        officialCoverageLoaded
          ? item.municipalityCount + ' из ' + item.municipalityTotal + ' муниципалитетов; ' + item.observationCount + ' записей' + (item.latestYear ? '; последний год: ' + item.latestYear : '')
          : 'Актуальный срез не загружен',
      ]),
      ['Примечание', 'Пустые значения означают отсутствие исходных данных; квартальные/полугодовые показатели нельзя автоматически суммировать.'],
      [],
    ];
    const csv = '\uFEFF' + [...metadata, headers, ...rows].map((row) => row.map(escaped).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'yugra-conceptual-forecast-' + horizon + 'y.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="panel full-panel forecast-page">
      <div className="section-heading">
        <div className="heading-label"><span className="heading-icon"><span className="forecast-heading-mark">↗</span></span><div><h2>Режим прогнозирования</h2><p>Сценарная модель развития муниципалитетов Югры</p></div></div>
        <span className={'forecast-source-pill ' + (scenarioStatus === 'database' ? 'is-live' : '')}><i />{scenarioStatus === 'database' ? 'Сценарии из Supabase' : 'Встроенные шаблоны'}</span>
      </div>

      <div className="forecast-warning"><strong>Концептуальная модель, не официальный прогноз.</strong><span>Проверенных временных рядов по всем 22 территориям нет. Это сценарный эксперимент с заданными пользователем темпами, а не статистически обученная модель и не вероятность развития событий.</span><span className="forecast-coverage-note">Пять групп из паспорта проекта: занятость, доходы населения, местный бюджет, миграция и инвестиции. Текущий расчётный прототип использует инвестиции, число субъектов МСП и концептуальный балл; занятость, доходы, бюджет и миграция пока не входят в вычислительное ядро. Подтверждённых сопоставимых муниципальных рядов миграции сейчас нет. Пропуски не подменяются нулями.</span></div>

      <section className="forecast-coverage-panel" aria-labelledby="forecast-coverage-title">
        <div className="forecast-coverage-heading">
          <div><h3 id="forecast-coverage-title">Покрытие официальными данными</h3><p>Сколько муниципалитетов имеют хотя бы одно подтверждённое наблюдение в каждой группе. Это охват, а не полнота всех показателей и периодов.</p></div>
          <span className={'forecast-coverage-status ' + (officialCoverageStale ? 'is-stale' : officialCoverageLoaded ? 'is-connected' : '')}>{officialCoverageStale ? 'Последний успешный срез' : officialCoverageLoaded ? 'Срез Supabase' : 'Каталог не загружен'}</span>
        </div>
        <div className="forecast-coverage-grid">
          {officialCoverage.map((item) => <article className="forecast-coverage-card" key={item.key}>
            <div className="forecast-coverage-card-top"><span>{item.label}</span><strong>{officialCoverageLoaded ? `${item.municipalityCount}/${item.municipalityTotal}` : '—'}</strong></div>
            <div className="forecast-coverage-track" aria-hidden="true"><i style={{ width: (officialCoverageLoaded ? Math.min(100, item.municipalityCount / Math.max(1, item.municipalityTotal) * 100) : 0) + '%' }} /></div>
            <p>{item.description}</p>
            <small>{officialCoverageLoaded ? `${item.observationCount} записей${item.latestYear ? ` · последний год: ${item.latestYear}` : ''}` : 'Нет подтверждённого актуального среза'}</small>
          </article>)}
        </div>
        {officialCoverageSyncedLabel && <p className="forecast-coverage-footnote">Последняя успешная загрузка каталога: {officialCoverageSyncedLabel}.</p>}
        {officialCoverageStale && <p className="forecast-coverage-footnote">Повторное обновление не удалось. Показан последний успешно загруженный срез; он может быть неактуальным.</p>}
        <p className="forecast-coverage-footnote">Для местного бюджета отдельно учитываются подтверждённые записи исполнения муниципальных программ; они не заменяют полную бюджетную статистику. Городские/поселковые наблюдения и непроверенные записи исключены. Отсутствие записи не означает нулевое значение.</p>
      </section>

      <div className="forecast-controls-grid">
        <div className="forecast-control-card">
          <label className="forecast-field"><span>Сценарий</span><select value={scenarioKey} onChange={(e) => selectScenario(e.target.value)}>{scenarios.map((scenario) => <option key={scenario.key} value={scenario.key}>{scenario.title}</option>)}</select></label>
          <p className="forecast-scenario-description">{activeScenario.summary}</p>
          <div className="forecast-field"><span>Горизонт модели</span><div className="forecast-horizons">{[1, 2, 3].map((years) => <button key={years} className={horizon === years ? 'selected' : ''} onClick={() => { setHorizon(years); }}>{years} {years === 1 ? 'год' : 'лет'}</button>)}</div></div>
          <div className="forecast-parameter-list">
            <label><span>Годовой рост инвестиций, %</span><strong>{fmt(n(params.investment_growth_rate), 1)}%</strong><input aria-label="Годовой рост инвестиций" type="range" min="-10" max="20" step="0.5" value={params.investment_growth_rate} onChange={(e) => setParam('investment_growth_rate', Number(e.target.value))}/></label>
            <label><span>Годовой рост субъектов МСП, %</span><strong>{fmt(n(params.sme_growth_rate), 1)}%</strong><input aria-label="Годовой рост субъектов МСП" type="range" min="-10" max="20" step="0.5" value={params.sme_growth_rate} onChange={(e) => setParam('sme_growth_rate', Number(e.target.value))}/></label>
            <label><span>Годовое изменение балла, %</span><strong>{fmt(n(params.score_growth_rate), 1)}%</strong><input aria-label="Годовое изменение балла" type="range" min="-10" max="10" step="0.5" value={params.score_growth_rate} onChange={(e) => setParam('score_growth_rate', Number(e.target.value))}/></label>
            <label><span>Условная неопределённость, %/год</span><strong>±{fmt(n(params.uncertainty_rate), 1)}%</strong><input aria-label="Допущение неопределённости" type="range" min="0" max="25" step="0.5" value={params.uncertainty_rate} onChange={(e) => setParam('uncertainty_rate', Number(e.target.value))}/></label>
            <label><span>Шок экспортной выручки, %</span><strong>{fmt(n(params.export_shock_pct), 1)}%</strong><input aria-label="Шок экспортной выручки" type="range" min="-20" max="10" step="1" value={params.export_shock_pct} onChange={(e) => setParam('export_shock_pct', Number(e.target.value))}/></label>
            <label><span>Изменение издержек, %</span><strong>{fmt(n(params.cost_pressure_pct), 1)}%</strong><input aria-label="Изменение издержек" type="range" min="-10" max="20" step="1" value={params.cost_pressure_pct} onChange={(e) => setParam('cost_pressure_pct', Number(e.target.value))}/></label>
            <label><span>Кадровый дефицит, %</span><strong>{fmt(n(params.labor_shortage_pct), 1)}%</strong><input aria-label="Кадровый дефицит" type="range" min="-10" max="20" step="1" value={params.labor_shortage_pct} onChange={(e) => setParam('labor_shortage_pct', Number(e.target.value))}/></label>
          </div>
          <div className="forecast-control-actions">
            <button className="primary-button" onClick={exportCsv}><span className="forecast-action-symbol" aria-hidden="true">↓</span>Экспортировать результат CSV</button>
            <button className="outline-button" onClick={() => {
              setParams({
                investment_growth_rate: activeScenario.investment_growth_rate,
                sme_growth_rate: activeScenario.sme_growth_rate,
                score_growth_rate: activeScenario.score_growth_rate,
                uncertainty_rate: activeScenario.uncertainty_rate,
                export_shock_pct: activeScenario.export_shock_pct ?? 0,
                cost_pressure_pct: activeScenario.cost_pressure_pct ?? 0,
                labor_shortage_pct: activeScenario.labor_shortage_pct ?? 0,
              });
            }}><span className="forecast-action-symbol" aria-hidden="true">↻</span>Вернуть настройки сценария</button>
          </div>
        </div>

        <div className="forecast-results">
          <div className="forecast-results-heading"><div><span className="micro-label">MODEL OUTPUT</span><h3>Итог сценария</h3></div><span className="forecast-horizon-tag">Горизонт: {horizon} {horizon === 1 ? 'год' : 'лет'}</span></div>
          <div className="forecast-kpi-grid">
            <article><span>Инвестиции, модельный итог</span><strong>{fmt(totalInvestment, 1)} <small>млрд ₽</small></strong><em>{baselineInvestment > 0 ? pct((totalInvestment / baselineInvestment - 1) * 100) : '—'} к базе · данные по {investmentCoverage} из {forecasts.length} территорий</em></article>
            <article><span>Субъекты МСП, модельный итог</span><strong>{fmt(totalSme, 0)}</strong><em>{baselineSme > 0 ? pct((totalSme / baselineSme - 1) * 100) : '—'} к базе · данные по {smeCoverage} из {forecasts.length} территорий</em></article>
            <article><span>Средний модельный балл</span><strong>{fmt(avgScore, 1)}</strong><em>данные по {scoreCoverage} из {forecasts.length} территорий</em></article>
          </div>
          <div className="forecast-chart-head"><div><h4>Инвестиции по территориям</h4><p>Модельные значения, млрд ₽</p></div><span>Показано {chartRows.length} территорий с данными</span></div>
          <div className="forecast-bars">{chartRows.map((row) => <div className="forecast-bar-row" key={row.id}><span title={row.name}>{row.name}</span><div className="forecast-bar-track"><i style={{ width: Math.max(1, row.projectedInvestments / maxInvestments * 100) + '%' }} /></div><strong>{fmt(row.projectedInvestments, 1)}</strong></div>)}</div>
        </div>
      </div>

      <section className="forecast-analysis-grid">
        <div className="forecast-control-card">
          <div className="forecast-results-heading"><div><span className="micro-label">SCENARIO COMPARISON</span><h3>Сравнение сценариев</h3></div></div>
          <div className="forecast-scenario-compare">{scenarioComparisons.map((scenario) => <article key={scenario.key} className={scenario.key === scenarioKey ? 'is-active' : ''}><strong>{scenario.title}</strong><span>Средний индекс: {fmt(scenario.summary.averageScore, 1)}</span><small>Диапазон: {fmt(scenario.summary.averageScoreLow, 1)}–{fmt(scenario.summary.averageScoreHigh, 1)}</small><small>Покрытие: {scenario.summary.scoreCoverage}/{scenario.summary.municipalityCount}</small></article>)}</div>
          <p className="forecast-footnote">Сценарии рассчитаны на одном наборе исходных значений и выбранном горизонте. Сравнение не означает вероятность реализации.</p>
        </div>
        <div className="forecast-control-card">
          <div className="forecast-results-heading"><div><span className="micro-label">FACTOR CONTRIBUTION</span><h3>Влияние факторов на индекс</h3></div></div>
          <p className="forecast-scenario-description">Среднее изменение прогнозного балла относительно того же расчёта без отдельного фактора, балла на муниципалитет.</p>
          <div className="forecast-factor-list">{factorSummary.map((factor) => <div key={factor.key}><span>{factor.label}</span><strong className={factor.average < 0 ? 'is-negative' : factor.average > 0 ? 'is-positive' : ''}>{factor.average == null ? '—' : pct(factor.average)}</strong></div>)}</div>
          <p className="forecast-footnote">Коэффициенты влияния — открытые экспертные допущения прототипа (экспорт × 0,20; издержки и кадровый дефицит × −0,15), а не оценки из статистической регрессии. Их нужно согласовать и калибровать.</p>
        </div>
      </section>

      <div className="forecast-table-panel">
        <div className="forecast-table-toolbar"><div><h3>Результаты по муниципалитетам</h3><p>Рейтинг рассчитан заново по модельному баллу; он не является официальным рейтингом.</p></div><div className="forecast-table-filters"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск территории…" aria-label="Поиск территории в прогнозе"/><select aria-label="Выбрать муниципалитет" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}><option value="ALL">Все территории</option>{municipalities.map((m) => <option value={m.id} key={m.id}>{m.name}</option>)}</select></div></div>
        <div className="table-scroll"><table className="ranking-table forecast-table"><thead><tr><th>Территория</th><th>Инвестиции: база</th><th>Прогноз, млрд ₽</th><th>Модельный диапазон, млрд ₽</th><th>МСП: база → прогноз (диапазон)</th><th>Прогнозный балл</th><th>Диапазон балла</th><th>Модельное место</th></tr></thead>
          <tbody>{filtered.map((row) => <tr key={row.id}><td>{row.name}</td><td>{fmt(row.investment, 1)}</td><td className="score-cell">{fmt(row.projectedInvestments, 1)}</td><td>{row.projectedInvestments == null ? '—' : `${fmt(row.investmentsLow, 1)}–${fmt(row.investmentsHigh, 1)}`}</td><td>{row.sme == null ? '—' : `${fmt(row.sme, 0)} → ${fmt(row.projectedSme, 0)} (${fmt(row.smeLow, 0)}–${fmt(row.smeHigh, 0)})`}</td><td>{fmt(row.projectedScore, 1)}</td><td>{row.projectedScore == null ? '—' : `${fmt(row.scoreLow, 1)}–${fmt(row.scoreHigh, 1)}`}</td><td>{row.projectedRank == null ? '—' : `№ ${row.projectedRank}`}</td></tr>)}</tbody>
        </table>{filtered.length === 0 && <div className="empty-state"><span>Территории не найдены</span><p>Измените поиск или фильтр.</p></div>}</div>
      </div>

      <div className="forecast-methodology">
        <h3>Как считается прогноз</h3>
        <div className="forecast-method-grid"><p><strong>1. Базовый срез.</strong> Для каждой территории берётся доступное значение инвестиций, МСП и балла. Если исходного значения нет, показатель не рассчитывается и отображается прочерком; агрегаты учитывают только территории с доступными значениями.</p><p><strong>2. Сценарная траектория.</strong> Показатель через N лет = базовое значение × (1 + заданный годовой темп)<sup>N</sup>. Темпы задаются ползунками, а не оцениваются по официальной истории.</p><p><strong>3. Диапазон чувствительности.</strong> Для инвестиций и МСП границы рассчитываются отдельно при темпе роста ± заданная неопределённость × √N; для индекса границы дополнительно ограничиваются шкалой 0–100. Это стресс-диапазоны допущений, не доверительные интервалы и не измеренные вероятности.</p><p><strong>4. Факторы индекса.</strong> Базовое изменение балла корректируется тремя явно заданными допущениями: экспортная выручка, издержки и кадровый дефицит. Коэффициенты показаны рядом с результатом и не обучались на данных.</p><p><strong>5. Ранжирование.</strong> Модельное место сортируется по прогнозному баллу. Такая перестановка демонстрирует сценарий, но не прогнозирует официальные рейтинговые баллы без воспроизводимой методики рейтинга.</p></div>
        <p className="forecast-footnote">Все параметры демонстрационные и редактируемые. До принятия решений их следует заменить экспертно согласованными допущениями, проверить исходные данные и сравнить модель с фактическими наблюдениями. Название сценария само по себе не означает вероятность его реализации.</p>
      </div>
    </section>
  );
}
