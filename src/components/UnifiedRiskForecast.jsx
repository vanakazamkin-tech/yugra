import React, { useEffect, useMemo, useState } from 'react';
import './UnifiedRiskForecast.css';

const PILLARS = [
  { key: 'employment', title: 'Занятость', match: /(employ|employee|unemploy|работник|занятост|безработ)/i, direction: 'higher', note: 'Рабочие места, занятость, безработица и кадровая обеспеченность' },
  { key: 'income', title: 'Доходы населения', match: /(salary|wage|income|зарплат|заработ|доход насел|пенси)/i, direction: 'higher', note: 'Заработная плата и доступные показатели доходов' },
  { key: 'budget', title: 'Местный бюджет', match: /(budget|revenue|expenditure|debt|deficit|бюджет|доходы бюджета|расходы бюджета|исполнени.*программ)/i, direction: 'higher', note: 'Доходы, расходы, исполнение программ и бюджетная устойчивость' },
  { key: 'migration', title: 'Миграция', match: /(migration|migrat|arrival|departure|миграц|прибывш|выбывш)/i, direction: 'context', note: 'Прибытие, выбытие и миграционное сальдо; покрытие пока ограничено' },
  { key: 'investment', title: 'Инвестиции', match: /(investment|capital_investment|инвестици|капиталовлож)/i, direction: 'higher', note: 'Инвестиции в основной капитал и инвестиционная активность' },
  { key: 'business', title: 'Предпринимательство', match: /(sme|small_business|entrepreneur|business|организац|предприним|мсп)/i, direction: 'higher', note: 'Количество субъектов МСП, оборот и деловая активность' },
  { key: 'production', title: 'Производство и рынок', match: /(production|shipment|turnover|retail|goods|продукц|отгруж|оборот|торговл|ярмарк)/i, direction: 'higher', note: 'Отгрузка, оборот торговли, услуг и промышленная активность' },
  { key: 'demography', title: 'Демография', match: /(population|birth|death|населен|рождаем|смертн)/i, direction: 'context', note: 'Численность и структура населения; уровень географии проверяется отдельно' },
  { key: 'infrastructure', title: 'Инфраструктура', match: /(facility|school|preschool|road|housing|network|учрежден|школ|дорог|жиль|сет)/i, direction: 'context', note: 'Инфраструктурные объекты и качество среды' },
];
const number = (v) => v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
const fmt = (v, digits = 1) => v == null || !Number.isFinite(Number(v)) ? '—' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(Number(v));
const signed = (v) => v == null ? '—' : (v > 0 ? '+' : '') + fmt(v, 1) + '%';
const classify = (row) => PILLARS.find((p) => p.match.test((row.indicator_code || '') + ' ' + (row.indicator_name || ''))) || { key: 'other', title: 'Прочие показатели', direction: 'context', note: 'Дополнительные показатели проекта' };
const directionFor = (row) => {
  const s = ((row.indicator_code || '') + ' ' + (row.indicator_name || '')).toLowerCase();
  if (/(unemploy|безработ|debt|deficit|arrears|noncompliant|выбывш|смертн|аварийн|износ|просроч)/i.test(s)) return 'lower';
  if (/(migration|миграц|population|населен)/i.test(s)) return 'context';
  return classify(row).direction;
};
const comparableSignature = (row) => {
  const p = String(row.reference_period || '');
  const q = p.match(/-Q([1-4])/i);
  const h = p.match(/-H([12])/i);
  const d = p.match(/-\d{2}-\d{2}$/);
  if (q) return 'Q' + q[1];
  if (h) return 'H' + h[1];
  if (d) return p.slice(5);
  return 'annual';
};
const periodOrder = (row) => {
  const p = String(row.reference_period || row.reference_year || '');
  const q = p.match(/(\d{4}).*?Q([1-4])/i);
  const h = p.match(/(\d{4}).*?H([12])/i);
  const d = p.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (q) return Number(q[1]) * 10 + Number(q[2]);
  if (h) return Number(h[1]) * 10 + Number(h[2]);
  if (d) return Number(d[1]) * 10000 + Number(d[2]) * 100 + Number(d[3]);
  return Number(row.reference_year) || 0;
};
function buildSeries(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    if (row.verification_status && row.verification_status !== 'verified') return;
    if ((row.geographic_level || 'municipality') !== 'municipality') return;
    const value = number(row.value);
    if (value == null) return;
    const key = [row.municipality_id, row.indicator_code, row.unit, comparableSignature(row)].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...row, numericValue: value, order: periodOrder(row) });
  });
  const series = [];
  groups.forEach((items) => {
    items.sort((a, b) => a.order - b.order || String(a.reference_period).localeCompare(String(b.reference_period)));
    const latest = items[items.length - 1];
    const previous = items.length > 1 ? items[items.length - 2] : null;
    const changePercent = previous && previous.numericValue !== 0 ? (latest.numericValue / previous.numericValue - 1) * 100 : null;
    const direction = directionFor(latest);
    const adverse = changePercent == null || direction === 'context' ? null : (direction === 'lower' ? changePercent > 5 : changePercent < -5);
    series.push({ key, municipalityId: latest.municipality_id, code: latest.indicator_code, name: latest.indicator_name, unit: latest.unit, pillar: classify(latest), direction, rows: items, latest, previous, changePercent, adverse });
  });
  return series;
}
const RISK_LABEL = { red: 'Высокое внимание', yellow: 'Наблюдение', green: 'Стабильно по сигналам', unknown: 'Недостаточно данных' };
function riskLevel(signals) {
  const comparable = signals.filter((s) => s.adverse != null);
  const adverse = comparable.filter((s) => s.adverse).length;
  if (comparable.length < 2) return 'unknown';
  if (adverse >= 2 && adverse / comparable.length >= 0.4) return 'red';
  if (adverse >= 1) return 'yellow';
  return comparable.length >= 3 ? 'green' : 'unknown';
}
const DEFAULT_SCENARIOS = [
  { key: 'pessimistic', title: 'Стресс-сценарий', adjustment: -5, uncertainty: 8, description: 'Ухудшение внешней конъюнктуры, рост издержек и усиление кадрового дефицита.' },
  { key: 'base', title: 'Базовый сценарий', adjustment: 0, uncertainty: 4, description: 'Продолжение наблюдаемой динамики без дополнительных шоков.' },
  { key: 'optimistic', title: 'Благоприятный сценарий', adjustment: 5, uncertainty: 4, description: 'Улучшение деловой активности и реализация мер поддержки.' },
];

export default function UnifiedRiskForecast({ municipalities = [], officialIndicators = [], programExecution = [], supabase, isSupabaseConfigured, officialDataStatus = 'offline', officialDataSyncedAt = null, investmentSites = [], fuelPrices = [], facilities = [] }) {
  const [mode, setMode] = useState('monitor');
  const [municipalityId, setMunicipalityId] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedIndicator, setSelectedIndicator] = useState('');
  const [horizon, setHorizon] = useState(3);
  const [scenarioKey, setScenarioKey] = useState('base');
  const [shock, setShock] = useState(0);
  const [scenarios, setScenarios] = useState(DEFAULT_SCENARIOS);
  const [scenarioSource, setScenarioSource] = useState('локальные шаблоны');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase || !isSupabaseConfigured) return;
      const result = await supabase.from('forecast_scenarios').select('key,title,summary,investment_growth_rate,sme_growth_rate,score_growth_rate,uncertainty_rate,display_order').eq('is_active', true).order('display_order', { ascending: true });
      if (cancelled || result.error || !Array.isArray(result.data) || !result.data.length) return;
      setScenarios(result.data.map((s) => ({ key: s.key, title: s.title, description: s.summary, adjustment: Number(s.score_growth_rate || 0), uncertainty: Number(s.uncertainty_rate || 5) })));
      setScenarioSource('Supabase');
      if (result.data.some((s) => s.key === 'base')) setScenarioKey('base');
    }
    load();
    return () => { cancelled = true; };
  }, [supabase, isSupabaseConfigured]);

  const indicatorRows = useMemo(() => officialIndicators.concat((programExecution || []).map((item) => ({
    municipality_id: item.municipality_id,
    indicator_code: 'municipal_program_execution_rate',
    indicator_name: 'Исполнение муниципальных программ',
    reference_year: Number(String(item.report_date || '').slice(0, 4)) || null,
    reference_period: item.report_date || '',
    value: item.execution_percent,
    unit: '%',
    source_url: item.source_url,
    verification_status: item.verification_status,
    geographic_level: 'municipality',
  }))), [officialIndicators, programExecution]);
  const series = useMemo(() => buildSeries(indicatorRows), [indicatorRows]);
  const municipalityName = useMemo(() => new Map(municipalities.map((m) => [m.id, m.name])), [municipalities]);
  const filteredSeries = useMemo(() => series.filter((s) =>
    (municipalityId === 'ALL' || s.municipalityId === municipalityId)
    && (category === 'ALL' || s.pillar.key === category)
    && (!search || (s.name + ' ' + s.code + ' ' + (municipalityName.get(s.municipalityId) || '')).toLowerCase().includes(search.toLowerCase()))
  ), [series, municipalityId, category, search, municipalityName]);

  const municipalityRisks = useMemo(() => municipalities.map((m) => {
    const signals = series.filter((s) => s.municipalityId === m.id);
    const comparable = signals.filter((s) => s.adverse != null);
    const adverse = comparable.filter((s) => s.adverse);
    const level = riskLevel(signals);
    return { ...m, signals, comparable, adverse, level };
  }).sort((a,b) => {
    const priority = { red: 0, yellow: 1, green: 2, unknown: 3 };
    return priority[a.level] - priority[b.level] || b.adverse.length - a.adverse.length || a.name.localeCompare(b.name, 'ru-RU');
  }), [municipalities, series]);

  const pillarStats = useMemo(() => PILLARS.map((p) => {
    const rows = series.filter((s) => s.pillar.key === p.key);
    return { ...p, seriesCount: rows.length, municipalities: new Set(rows.map((s) => s.municipalityId)).size, adverseCount: rows.filter((s) => s.adverse === true).length };
  }), [series]);
  const counts = useMemo(() => ({
    red: municipalityRisks.filter((m) => m.level === 'red').length,
    yellow: municipalityRisks.filter((m) => m.level === 'yellow').length,
    green: municipalityRisks.filter((m) => m.level === 'green').length,
    unknown: municipalityRisks.filter((m) => m.level === 'unknown').length,
  }), [municipalityRisks]);
  const indicatorOptions = useMemo(() => {
    const map = new Map();
    series.forEach((s) => {
      const key = s.code + '|' + s.unit;
      if (!map.has(key)) map.set(key, { key, code: s.code, unit: s.unit, name: s.name, pillar: s.pillar });
    });
    return [...map.values()].sort((a,b) => a.pillar.title.localeCompare(b.pillar.title, 'ru-RU') || a.name.localeCompare(b.name, 'ru-RU'));
  }, [series]);
  const activeIndicator = indicatorOptions.find((x) => x.key === selectedIndicator) || indicatorOptions[0] || null;
  const forecastMunicipalityId = municipalityId === 'ALL' ? (series.find((s) => activeIndicator && s.code === activeIndicator.code && s.unit === activeIndicator.unit)?.municipalityId || municipalities[0]?.id || '') : municipalityId;
  const forecastSeries = activeIndicator ? series.filter((s) => s.municipalityId === forecastMunicipalityId && s.code === activeIndicator.code && s.unit === activeIndicator.unit).sort((a,b) => b.latest.order - a.latest.order)[0] : null;
  const scenario = scenarios.find((s) => s.key === scenarioKey) || scenarios[0];
  const baseline = forecastSeries?.latest?.numericValue ?? null;
  const observedTrend = forecastSeries?.changePercent;
  const annualTrend = observedTrend == null ? 0 : Math.max(-50, Math.min(50, observedTrend));
  const baseRate = annualTrend + shock + Number(scenario?.adjustment || 0);
  const uncertainty = Math.abs(Number(scenario?.uncertainty || 5));
  const forecastRows = scenario && baseline != null ? [
    { key: 'pessimistic', title: 'Стресс', rate: baseRate - uncertainty, value: baseline * Math.pow(Math.max(0.01, 1 + (baseRate - uncertainty) / 100), horizon) },
    { key: 'base', title: 'Базовый', rate: baseRate, value: baseline * Math.pow(Math.max(0.01, 1 + baseRate / 100), horizon) },
    { key: 'optimistic', title: 'Благоприятный', rate: baseRate + uncertainty, value: baseline * Math.pow(Math.max(0.01, 1 + (baseRate + uncertainty) / 100), horizon) },
  ] : [];
  const maxForecast = Math.max(1, ...forecastRows.map((r) => r.value));
  const municipalRows = officialIndicators.filter((i) => i.verification_status === 'verified' && (i.geographic_level || 'municipality') === 'municipality');
  const coverageCount = new Set(municipalRows.map((i) => i.municipality_id)).size;
  const latestYear = officialIndicators.reduce((max, i) => Math.max(max, Number(i.reference_year) || 0), 0) || null;
  const totalVerified = municipalRows.length;
  const filteredRisks = municipalityRisks.filter((m) => (municipalityId === 'ALL' || m.id === municipalityId) && (!search || m.name.toLocaleLowerCase('ru-RU').includes(search.toLocaleLowerCase('ru-RU'))));
  const filteredIndicators = filteredSeries.slice().sort((a,b) => b.latest.order - a.latest.order || a.name.localeCompare(b.name, 'ru-RU'));
  const syncLabel = officialDataSyncedAt ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(officialDataSyncedAt)) : null;

  const exportCsv = (rows, fileName) => {
    const quote = (v) => {
      let value = String(v == null ? '' : v);
      if (typeof v === 'string' && /^[\s]*[=+\-@\t\r]/.test(value)) value = "'" + value;
      return '"' + value.replaceAll('"', '""') + '"';
    };
    const csv = '\uFEFF' + rows.map((r) => r.map(quote).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  return (
    <section className="panel full-panel unified-system">
      <header className="unified-hero"><div><span className="eyebrow">МОНИТОРИНГ УСТОЙЧИВОСТИ · 22 МУНИЦИПАЛИТЕТА</span><h1>Единая система рисков и прогнозирования</h1><p>Мониторинг подтверждённых показателей, ранние сигналы ухудшения и сценарный анализ на горизонте до трёх лет.</p></div><span className="concept-corner">КОНЦЕПТ</span></header>
      <div className="unified-warning"><strong>Статус аналитики: пилотная система.</strong> Используются подтверждённые муниципальные наблюдения. Региональные и городские рейтинги не смешиваются с муниципальными рядами. Риск — сигнал для внимания, а не вероятность кризиса; прогноз — сценарная оценка, а не официальный прогноз.</div>
      <div className="unified-toolbar">
        <div className="unified-tabs" role="tablist" aria-label="Раздел единой системы">
          <button className={mode === 'monitor' ? 'active' : ''} onClick={() => setMode('monitor')}>Мониторинг рисков</button>
          <button className={mode === 'forecast' ? 'active' : ''} onClick={() => setMode('forecast')}>Сценарный прогноз</button>
          <button className={mode === 'indicators' ? 'active' : ''} onClick={() => setMode('indicators')}>Все показатели</button>
        </div>
        <div className="unified-filters">
          <select value={municipalityId} onChange={(e) => setMunicipalityId(e.target.value)} aria-label="Муниципалитет"><option value="ALL">Все муниципалитеты</option>{municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Группа показателей"><option value="ALL">Все группы</option>{PILLARS.map((p) => <option key={p.key} value={p.key}>{p.title}</option>)}</select>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск показателя или территории…" aria-label="Поиск"/>
        </div>
      </div>

      {mode === 'monitor' && <>
        <div className="unified-kpis">
          <article className="risk-kpi risk-kpi-red"><span className="risk-dot"/><div><small>ВЫСОКОЕ ВНИМАНИЕ</small><strong>{counts.red}</strong><span>несколько негативных сигналов</span></div></article>
          <article className="risk-kpi risk-kpi-yellow"><span className="risk-dot"/><div><small>ТРЕБУЮТ НАБЛЮДЕНИЯ</small><strong>{counts.yellow}</strong><span>есть ухудшающаяся динамика</span></div></article>
          <article className="risk-kpi risk-kpi-green"><span className="risk-dot"/><div><small>БЕЗ НЕГАТИВНЫХ СИГНАЛОВ</small><strong>{counts.green}</strong><span>достаточно сопоставимых рядов</span></div></article>
          <article className="risk-kpi risk-kpi-neutral"><span className="risk-dot"/><div><small>НЕДОСТАТОЧНО ДАННЫХ</small><strong>{counts.unknown}</strong><span>нельзя достоверно классифицировать</span></div></article>
        </div>
        <section className="unified-section">
          <div className="unified-section-head"><div><h2>Пять основных направлений проекта</h2><p>Дополнительные показатели также доступны в полном реестре.</p></div><span>{totalVerified.toLocaleString('ru-RU')} подтверждённых наблюдений</span></div>
          <div className="unified-pillar-grid">{pillarStats.filter((p) => ['employment','income','budget','migration','investment'].includes(p.key)).map((p) => <article className="unified-pillar" key={p.key}><div><strong>{p.title}</strong><span>{p.municipalities}/{municipalities.length}</span></div><div className="unified-track"><i style={{ width: Math.min(100, p.municipalities / Math.max(1, municipalities.length) * 100) + '%' }}/></div><p>{p.seriesCount} рядов · {p.adverseCount} сигналов ухудшения</p><small>{p.note}</small></article>)}</div>
        </section>
        <section className="unified-section">
          <div className="unified-section-head"><div><h2>Матрица рисков муниципалитетов</h2><p>Зона формируется по динамике сопоставимых периодов, а не по старому демонстрационному баллу.</p></div><button className="outline-button" onClick={() => exportCsv([['Муниципалитет','Уровень внимания','Сопоставимых сигналов','Негативных сигналов','Показатели с ухудшением'], ...filteredRisks.map((m) => [m.name,RISK_LABEL[m.level],m.comparable.length,m.adverse.length,m.adverse.map((s) => s.name).join(', ')])], 'yugra-risk-monitor.csv')}>Экспорт CSV</button></div>
          <div className="table-scroll"><table className="ranking-table risk-table"><thead><tr><th>Муниципалитет</th><th>Статус</th><th>Сигналы</th><th>Ухудшения</th><th>Что требует внимания</th></tr></thead><tbody>{filteredRisks.map((m) => <tr key={m.id}><td>{m.name}</td><td><span className={'risk-zone-badge risk-zone-' + m.level}>{RISK_LABEL[m.level]}</span></td><td>{m.comparable.length}</td><td>{m.adverse.length}</td><td>{m.adverse.slice(0, 3).map((s) => s.name).join('; ') || (m.level === 'unknown' ? 'Недостаточно сопоставимых рядов' : 'Негативных сигналов не выявлено')}</td></tr>)}</tbody></table></div>
        </section>
        <section className="unified-section">
          <div className="unified-section-head"><div><h2>Ранние сигналы</h2><p>Изменения относительно предыдущего сопоставимого периода. Порог ±5% — технический фильтр пилота.</p></div><span>{filteredIndicators.length} рядов</span></div>
          <div className="table-scroll"><table className="ranking-table"><thead><tr><th>Муниципалитет</th><th>Направление</th><th>Показатель</th><th>Последнее значение</th><th>Изменение</th><th>Период</th><th>Источник</th></tr></thead><tbody>{filteredIndicators.filter((s) => s.adverse != null).sort((a,b) => Number(b.adverse)-Number(a.adverse) || Math.abs(b.changePercent)-Math.abs(a.changePercent)).slice(0,100).map((s) => <tr key={s.key}><td>{municipalityName.get(s.municipalityId) || s.municipalityId}</td><td>{s.pillar.title}</td><td>{s.name}</td><td>{fmt(s.latest.numericValue,2)} {s.unit}</td><td className={s.adverse ? 'trend-negative' : 'trend-positive'}>{signed(s.changePercent)}</td><td>{s.latest.reference_period || s.latest.reference_year}</td><td>{s.latest.source_url ? <a href={s.latest.source_url} target="_blank" rel="noreferrer">Источник ↗</a> : '—'}</td></tr>)}</tbody></table></div>
        </section>
      </>}

      {mode === 'forecast' && <section className="unified-section unified-forecast">
        <div className="unified-section-head"><div><h2>Сценарное прогнозирование показателей</h2><p>Выберите показатель и муниципалитет — система построит три траектории.</p></div><span>Сценарии: {scenarioSource}</span></div>
        <div className="unified-forecast-controls">
          <label>Показатель<select value={activeIndicator?.key || ''} onChange={(e) => setSelectedIndicator(e.target.value)}>{indicatorOptions.map((i) => <option key={i.key} value={i.key}>{i.pillar.title} · {i.name} ({i.unit})</option>)}</select></label>
          <label>Горизонт<select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}><option value={1}>1 год</option><option value={2}>2 года</option><option value={3}>3 года</option></select></label>
          <label>Сценарное отклонение от тренда <strong>{shock > 0 ? '+' : ''}{fmt(shock,1)} п.п.</strong><input type="range" min="-15" max="15" step="0.5" value={shock} onChange={(e) => setShock(Number(e.target.value))}/></label>
        </div>
        <div className="unified-base-card"><div><span>Муниципалитет расчёта</span><strong>{municipalityName.get(forecastMunicipalityId) || '—'}</strong></div><div><span>Последнее подтверждённое значение</span><strong>{fmt(baseline,2)} {forecastSeries?.unit || ''}</strong></div><div><span>Наблюдаемое изменение</span><strong>{signed(observedTrend)}</strong></div><div><span>Базовый период</span><strong>{forecastSeries?.latest?.reference_period || forecastSeries?.latest?.reference_year || '—'}</strong></div></div>
        {forecastRows.length ? <div className="unified-scenario-grid">{forecastRows.map((r) => <article key={r.key} className={'unified-scenario scenario-' + r.key}><span>{r.title}</span><strong>{fmt(r.value,2)} <small>{forecastSeries?.unit}</small></strong><p>{r.rate > 0 ? '+' : ''}{fmt(r.rate,1)}% в год · горизонт {horizon} г.</p><div className="unified-track"><i style={{ width: Math.max(2, r.value / maxForecast * 100) + '%' }}/></div></article>)}</div> : <div className="empty-state"><span>Нет выбранного ряда для прогноза</span><p>Для выбранного показателя и территории пока нет подтверждённого значения.</p></div>}
        <div className="unified-method-note"><strong>Как читать расчёт.</strong> Если доступны два сопоставимых периода, базовая траектория продолжает наблюдаемое изменение; при отсутствии истории используется нулевой тренд и это не считается статистическим прогнозом. Стресс- и благоприятная траектории задают диапазон чувствительности. Это what-if модель, не прогноз вероятности.</div>
        <div className="unified-section-head"><div><h3>Допущения сценариев</h3><p>Настройки из базы сценариев проекта.</p></div><select value={scenarioKey} onChange={(e) => setScenarioKey(e.target.value)}>{scenarios.map((s) => <option key={s.key} value={s.key}>{s.title}</option>)}</select></div>
        <p>{scenario?.description || 'Сценарные допущения загружены из базы проекта.'}</p>
      </section>}

      {mode === 'indicators' && <section className="unified-section">
        <div className="unified-section-head"><div><h2>Полный реестр отслеживаемых показателей</h2><p>Подтверждённые муниципальные наблюдения с периодом, единицей и первоисточником.</p></div><button className="outline-button" onClick={() => exportCsv([['Муниципалитет','Группа','Показатель','Код','Значение','Единица','Год','Период','Источник'], ...filteredIndicators.map((s) => [municipalityName.get(s.municipalityId) || s.municipalityId,s.pillar.title,s.name,s.code,s.latest.numericValue,s.unit,s.latest.reference_year,s.latest.reference_period,s.latest.source_url])], 'yugra-indicator-register.csv')}>Экспорт реестра CSV</button></div>
        <div className="table-scroll"><table className="ranking-table"><thead><tr><th>Муниципалитет</th><th>Группа</th><th>Показатель</th><th>Значение</th><th>Единица</th><th>Период</th><th>Изменение</th><th>Источник</th></tr></thead><tbody>{filteredIndicators.map((s) => <tr key={s.key}><td>{municipalityName.get(s.municipalityId) || s.municipalityId}</td><td>{s.pillar.title}</td><td>{s.name}<small className="unified-code">{s.code}</small></td><td>{fmt(s.latest.numericValue,2)}</td><td>{s.unit}</td><td>{s.latest.reference_period || s.latest.reference_year}</td><td className={s.adverse === true ? 'trend-negative' : s.changePercent != null ? 'trend-positive' : ''}>{signed(s.changePercent)}</td><td>{s.latest.source_url ? <a href={s.latest.source_url} target="_blank" rel="noreferrer">Открыть ↗</a> : '—'}</td></tr>)}</tbody></table>{filteredIndicators.length === 0 && <div className="empty-state"><span>Нет показателей по заданным фильтрам</span><p>Измените территорию, группу или поисковый запрос.</p></div>}</div>
      </section>}

      <footer className="unified-footer"><span>Охват: {coverageCount} из {municipalities.length} муниципалитетов · {totalVerified} подтверждённых наблюдений · последний год в базе: {latestYear || '—'}</span><span>{syncLabel ? 'Обновлено ' + syncLabel : officialDataStatus === 'connected' ? 'Данные загружены из Supabase' : 'Состояние синхронизации не подтверждено'}</span><span>Дополнительный контекст: {investmentSites.length} инвестплощадок · {fuelPrices.length} наблюдений цен · {facilities.length} объектов инфраструктуры · {programExecution.length} бюджетных отчётов. Эти наборы не смешиваются с основным рейтингом без сопоставимой методики.</span></footer>
    </section>
  );
}
