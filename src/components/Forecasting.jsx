import React, { useEffect, useMemo, useState } from 'react';

const FALLBACK_SCENARIOS = [
  { id: null, key: 'cautious', title: 'Осторожный', summary: 'Сдержанная динамика и повышенная неопределённость.', investment_growth_rate: 1, sme_growth_rate: 1, score_growth_rate: 0.5, uncertainty_rate: 10, display_order: 1 },
  { id: null, key: 'base', title: 'Инерционный', summary: 'Умеренное продолжение заданных тенденций без резкого ускорения.', investment_growth_rate: 4, sme_growth_rate: 3, score_growth_rate: 1.5, uncertainty_rate: 7, display_order: 2 },
  { id: null, key: 'ambitious', title: 'Ускоренное развитие', summary: 'Более высокие темпы при условии реализации инициатив и доступности ресурсов.', investment_growth_rate: 8, sme_growth_rate: 6, score_growth_rate: 3, uncertainty_rate: 12, display_order: 3 },
];

const n = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const fmt = (value, digits) => value == null || value === '' ? '—' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits == null ? 1 : digits, minimumFractionDigits: 0 }).format(value);
const pct = (value) => (value > 0 ? '+' : '') + fmt(value, 1) + '%';

function buildForecasts(municipalities, params, horizon) {
  const uncertainty = Math.max(0, n(params.uncertainty_rate)) * Math.sqrt(horizon);
  const rows = municipalities.map((m) => {
    const investmentRaw = m.investments && m.investments.volumeBillion;
    const hasInvestment = investmentRaw != null && Number.isFinite(Number(investmentRaw));
    const hasSme = m.smeCount != null && Number.isFinite(Number(m.smeCount));
    const hasScore = m.score != null && Number.isFinite(Number(m.score));
    const investment = hasInvestment ? n(investmentRaw) : null;
    const sme = hasSme ? n(m.smeCount) : null;
    const score = hasScore ? n(m.score) : null;
    const investRate = n(params.investment_growth_rate) / 100;
    const smeRate = n(params.sme_growth_rate) / 100;
    const scoreRate = n(params.score_growth_rate) / 100;
    const projectedInvestments = hasInvestment ? investment * Math.pow(1 + investRate, horizon) : null;
    const projectedSme = hasSme ? Math.round(sme * Math.pow(1 + smeRate, horizon)) : null;
    const projectedScore = hasScore ? Math.max(0, score * Math.pow(1 + scoreRate, horizon)) : null;
    return {
      id: m.id,
      name: m.name,
      group: m.group2024,
      investment,
      projectedInvestments,
      investmentsLow: projectedInvestments == null ? null : projectedInvestments * Math.max(0, 1 - uncertainty / 100),
      investmentsHigh: projectedInvestments == null ? null : projectedInvestments * (1 + uncertainty / 100),
      sme,
      projectedSme,
      smeLow: hasSme ? Math.round(sme * Math.pow(Math.max(0, 1 + smeRate - uncertainty / 100), horizon)) : null,
      smeHigh: hasSme ? Math.round(sme * Math.pow(Math.max(0, 1 + smeRate + uncertainty / 100), horizon)) : null,
      score,
      projectedScore,
      hasInvestment,
      hasSme,
      hasScore,
    };
  });
  const ordered = rows.filter((row) => row.projectedScore != null).slice().sort((a, b) => b.projectedScore - a.projectedScore);
  const rank = new Map(ordered.map((row, index) => [row.id, index + 1]));
  return rows.map((row) => Object.assign({}, row, { projectedRank: rank.get(row.id) || null }))
    .sort((a, b) => {
      if (a.projectedInvestments == null && b.projectedInvestments == null) return a.name.localeCompare(b.name, 'ru-RU');
      if (a.projectedInvestments == null) return 1;
      if (b.projectedInvestments == null) return -1;
      return b.projectedInvestments - a.projectedInvestments;
    });
}

export default function Forecasting({ municipalities, supabase, isSupabaseConfigured }) {
  const [scenarios, setScenarios] = useState(FALLBACK_SCENARIOS);
  const [scenarioKey, setScenarioKey] = useState('base');
  const [horizon, setHorizon] = useState(3);
  const [params, setParams] = useState({
    investment_growth_rate: 4,
    sme_growth_rate: 3,
    score_growth_rate: 1.5,
    uncertainty_rate: 7,
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
  const filtered = useMemo(() => {
    const searchText = search.trim().toLocaleLowerCase('ru-RU');
    return forecasts.filter((row) => (selectedId === 'ALL' || row.id === selectedId)
      && (!searchText || row.name.toLocaleLowerCase('ru-RU').includes(searchText)));
  }, [forecasts, selectedId, search]);
  const totalInvestment = useMemo(() => forecasts.reduce((sum, row) => sum + (row.projectedInvestments ?? 0), 0), [forecasts]);
  const baselineInvestment = useMemo(() => forecasts.reduce((sum, row) => sum + (row.investment ?? 0), 0), [forecasts]);
  const totalSme = useMemo(() => forecasts.reduce((sum, row) => sum + (row.projectedSme ?? 0), 0), [forecasts]);
  const baselineSme = useMemo(() => forecasts.reduce((sum, row) => sum + (row.sme ?? 0), 0), [forecasts]);
  const avgScore = useMemo(() => {
    const validScores = forecasts.filter((row) => row.projectedScore != null);
    return validScores.reduce((sum, row) => sum + row.projectedScore, 0) / Math.max(1, validScores.length);
  }, [forecasts]);
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
    });
  };
  const setParam = (key, value) => {
    setParams((current) => Object.assign({}, current, { [key]: value }));
  };


  const exportCsv = () => {
    const headers = ['Муниципалитет', 'Группа', 'Инвестиции: база, млрд ₽', 'Инвестиции: прогноз, млрд ₽', 'Нижняя граница модели, млрд ₽', 'Верхняя граница модели, млрд ₽', 'МСП: база', 'МСП: прогноз', 'Прогнозный балл', 'Модельное место'];
    const rows = filtered.map((row) => [
      row.name, row.group || '', row.investment, row.projectedInvestments, row.investmentsLow, row.investmentsHigh,
      row.sme, row.projectedSme, row.projectedScore, row.projectedRank,
    ]);
    const escaped = (value) => '"' + String(value == null ? '' : value).replaceAll('"', '""') + '"';
    const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(escaped).join(';')).join('\r\n');
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

      <div className="forecast-warning"><strong>Концептуальная модель, не официальный прогноз.</strong><span>Проверенных временных рядов и официальных прогнозных входов здесь нет. Значения ниже — результат заданных пользователем допущений на основе текущего среза; это сценарный эксперимент, а не статистически обученная модель.</span></div>

      <div className="forecast-controls-grid">
        <div className="forecast-control-card">
          <label className="forecast-field"><span>Сценарий</span><select value={scenarioKey} onChange={(e) => selectScenario(e.target.value)}>{scenarios.map((scenario) => <option key={scenario.key} value={scenario.key}>{scenario.title}</option>)}</select></label>
          <p className="forecast-scenario-description">{activeScenario.summary}</p>
          <div className="forecast-field"><span>Горизонт модели</span><div className="forecast-horizons">{[1, 3, 5].map((years) => <button key={years} className={horizon === years ? 'selected' : ''} onClick={() => { setHorizon(years); }}>{years} {years === 1 ? 'год' : 'лет'}</button>)}</div></div>
          <div className="forecast-parameter-list">
            <label><span>Годовой рост инвестиций, %</span><strong>{fmt(n(params.investment_growth_rate), 1)}%</strong><input aria-label="Годовой рост инвестиций" type="range" min="-10" max="20" step="0.5" value={params.investment_growth_rate} onChange={(e) => setParam('investment_growth_rate', Number(e.target.value))}/></label>
            <label><span>Годовой рост субъектов МСП, %</span><strong>{fmt(n(params.sme_growth_rate), 1)}%</strong><input aria-label="Годовой рост субъектов МСП" type="range" min="-10" max="20" step="0.5" value={params.sme_growth_rate} onChange={(e) => setParam('sme_growth_rate', Number(e.target.value))}/></label>
            <label><span>Годовое изменение балла, %</span><strong>{fmt(n(params.score_growth_rate), 1)}%</strong><input aria-label="Годовое изменение балла" type="range" min="-10" max="10" step="0.5" value={params.score_growth_rate} onChange={(e) => setParam('score_growth_rate', Number(e.target.value))}/></label>
            <label><span>Условная неопределённость, %/год</span><strong>±{fmt(n(params.uncertainty_rate), 1)}%</strong><input aria-label="Допущение неопределённости" type="range" min="0" max="25" step="0.5" value={params.uncertainty_rate} onChange={(e) => setParam('uncertainty_rate', Number(e.target.value))}/></label>
          </div>
          <div className="forecast-control-actions">
            <button className="primary-button" onClick={exportCsv}><span className="forecast-action-symbol" aria-hidden="true">↓</span>Экспортировать результат CSV</button>
            <button className="outline-button" onClick={() => {
              setParams({
                investment_growth_rate: activeScenario.investment_growth_rate,
                sme_growth_rate: activeScenario.sme_growth_rate,
                score_growth_rate: activeScenario.score_growth_rate,
                uncertainty_rate: activeScenario.uncertainty_rate,
              });
            }}><span className="forecast-action-symbol" aria-hidden="true">↻</span>Вернуть настройки сценария</button>
          </div>
        </div>

        <div className="forecast-results">
          <div className="forecast-results-heading"><div><span className="micro-label">MODEL OUTPUT</span><h3>Итог сценария</h3></div><span className="forecast-horizon-tag">Горизонт: {horizon} {horizon === 1 ? 'год' : 'лет'}</span></div>
          <div className="forecast-kpi-grid">
            <article><span>Инвестиции, модельный итог</span><strong>{fmt(totalInvestment, 1)} <small>млрд ₽</small></strong><em>{pct(baselineInvestment ? (totalInvestment / baselineInvestment - 1) * 100 : 0)} к базе</em></article>
            <article><span>Субъекты МСП, модельный итог</span><strong>{fmt(totalSme, 0)}</strong><em>{pct(baselineSme ? (totalSme / baselineSme - 1) * 100 : 0)} к базе</em></article>
            <article><span>Средний модельный балл</span><strong>{fmt(avgScore, 1)}</strong><em>по {forecasts.length} территориям</em></article>
          </div>
          <div className="forecast-chart-head"><div><h4>Инвестиции по территориям</h4><p>Модельные значения, млрд ₽</p></div><span>Показано {chartRows.length} территорий с данными</span></div>
          <div className="forecast-bars">{chartRows.map((row) => <div className="forecast-bar-row" key={row.id}><span title={row.name}>{row.name}</span><div className="forecast-bar-track"><i style={{ width: Math.max(1, row.projectedInvestments / maxInvestments * 100) + '%' }} /></div><strong>{fmt(row.projectedInvestments, 1)}</strong></div>)}</div>
        </div>
      </div>

      <div className="forecast-table-panel">
        <div className="forecast-table-toolbar"><div><h3>Результаты по муниципалитетам</h3><p>Рейтинг рассчитан заново по модельному баллу; он не является официальным рейтингом.</p></div><div className="forecast-table-filters"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск территории…" aria-label="Поиск территории в прогнозе"/><select aria-label="Выбрать муниципалитет" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}><option value="ALL">Все территории</option>{municipalities.map((m) => <option value={m.id} key={m.id}>{m.name}</option>)}</select></div></div>
        <div className="table-scroll"><table className="ranking-table forecast-table"><thead><tr><th>Территория</th><th>Инвестиции: база</th><th>Прогноз, млрд ₽</th><th>Модельный диапазон, млрд ₽</th><th>МСП: база → прогноз</th><th>Прогнозный балл</th><th>Модельное место</th></tr></thead>
          <tbody>{filtered.map((row) => <tr key={row.id}><td>{row.name}</td><td>{fmt(row.investment, 1)}</td><td className="score-cell">{fmt(row.projectedInvestments, 1)}</td><td>{row.projectedInvestments == null ? '—' : `${fmt(row.investmentsLow, 1)}–${fmt(row.investmentsHigh, 1)}`}</td><td>{row.sme == null ? '—' : `${fmt(row.sme, 0)} → ${fmt(row.projectedSme, 0)}`}</td><td>{fmt(row.projectedScore, 1)}</td><td>{row.projectedRank == null ? '—' : `№ ${row.projectedRank}`}</td></tr>)}</tbody>
        </table>{filtered.length === 0 && <div className="empty-state"><span>Территории не найдены</span><p>Измените поиск или фильтр.</p></div>}</div>
      </div>

      <div className="forecast-methodology">
        <h3>Как считается прогноз</h3>
        <div className="forecast-method-grid"><p><strong>1. Базовый срез.</strong> Для каждой территории берётся доступное значение инвестиций, МСП и балла. При отсутствии поля соответствующий исходный показатель может отображаться как ноль — перед интерпретацией проверьте заполненность базы.</p><p><strong>2. Сценарная траектория.</strong> Показатель через N лет = базовое значение × (1 + заданный годовой темп)<sup>N</sup>. Темпы задаются ползунками, а не оцениваются по официальной истории.</p><p><strong>3. Диапазон чувствительности.</strong> В таблице инвестиционный интервал строится от заданной пользователем неопределённости с масштабированием на √N. Это стресс-диапазон допущений, не доверительный интервал и не измеренная вероятность.</p><p><strong>4. Ранжирование.</strong> Модельное место сортируется по прогнозному баллу. Такая перестановка демонстрирует сценарий, но не прогнозирует официальные рейтинговые баллы без воспроизводимой методики рейтинга.</p></div>
        <p className="forecast-footnote">Все параметры демонстрационные и редактируемые. До принятия решений их следует заменить экспертно согласованными допущениями, проверить исходные данные и сравнить модель с фактическими наблюдениями. Название сценария само по себе не означает вероятность его реализации.</p>
      </div>
    </section>
  );
}
