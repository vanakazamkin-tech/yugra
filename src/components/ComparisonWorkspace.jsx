import { useEffect, useMemo, useState } from 'react';
import './ComparisonWorkspace.css';

const toNumber = (value) => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
const formatNumber = (value, digits = 0) => {
  const number = toNumber(value);
  return number == null ? '—' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(number);
};
const normalize = (value) => String(value ?? '').trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
const csvCell = (value) => {
  let text = String(value ?? '');
  const first = text.trimStart()[0];
  if (['=', '+', '-', '@', '\t', '\r'].includes(first)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
};

const DEMO_METRICS = [
  { key: 'rank2024', label: 'Место в наборе 2024', unit: 'место', digits: 0, get: (item) => toNumber(item.rank2024), format: (value) => value == null ? '—' : '№ ' + formatNumber(value), note: 'Меньшее место означает более высокую позицию в демонстрационном наборе.' },
  { key: 'score', label: 'Итоговый балл', unit: 'баллов', digits: 1, get: (item) => toNumber(item.score), format: (value) => formatNumber(value, 1) },
  { key: 'investment', label: 'Инвестиции без добычи', unit: 'млрд ₽', digits: 1, get: (item) => toNumber(item.investments?.volumeBillion), format: (value) => value == null ? '—' : formatNumber(value, 1) + ' млрд ₽' },
  { key: 'growth', label: 'Динамика инвестиций', unit: '%', digits: 1, get: (item) => toNumber(item.investments?.growthPercent), format: (value) => value == null ? '—' : formatNumber(value, 1) + '%' },
  { key: 'sme', label: 'Субъекты МСП', unit: 'ед.', digits: 0, get: (item) => toNumber(item.smeCount), format: (value) => formatNumber(value) },
  { key: 'business', label: 'Оценка бизнеса', unit: 'из 5', digits: 2, get: (item) => toNumber(item.assessmentScore), format: (value) => value == null ? '—' : formatNumber(value, 2) + ' / 5' },
];

const OFFICIAL_CATEGORIES = [
  { key: 'all', label: 'Все темы' },
  { key: 'population', label: 'Население' },
  { key: 'economy', label: 'Экономика' },
  { key: 'investment', label: 'Инвестиции' },
  { key: 'employment', label: 'Занятость' },
  { key: 'income', label: 'Зарплата и доходы' },
  { key: 'budget', label: 'Бюджет' },
  { key: 'business', label: 'Предпринимательство' },
  { key: 'other', label: 'Другие' },
];

function classifyIndicator(item) {
  const code = String(item.indicator_code || '').toLocaleLowerCase('ru-RU');
  const name = normalize(item.indicator_name);
  if (code.includes('population') || name.includes('населен')) return 'population';
  if (code.includes('investment') || name.includes('инвести')) return 'investment';
  if (code.includes('salary') || code.includes('wage') || name.includes('заработ') || name.includes('зарплат') || name.includes('доход')) return 'income';
  if (code.includes('budget') || name.includes('бюджет')) return 'budget';
  if (code.startsWith('employees_') || code.startsWith('average_employees') || code.includes('employment') || name.includes('работник') || name.includes('занятост')) return 'employment';
  if (code.includes('sme') || code.includes('entrepreneur') || code.includes('business') || name.includes('предпринимател') || name.includes('малого бизнеса')) return 'business';
  if (/retail|shipment|resale|trade|production|turnover/.test(code) || name.includes('оборот') || name.includes('отгруз')) return 'economy';
  return 'other';
}

function periodLabel(item) {
  const period = String(item.reference_period || 'annual');
  const year = item.reference_year || '';
  if (period === 'annual') return String(year) + ' · год';
  const match = period.match(/^\d{4}-(Q[1-4]|H[12])$/);
  if (match) {
    const names = { Q1: 'I квартал', Q2: 'II квартал', Q3: '9 месяцев', Q4: 'IV квартал', H1: 'I полугодие', H2: 'II полугодие' };
    return String(year || period.slice(0, 4)) + ' · ' + names[match[1]];
  }
  const date = period.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (date) return String(year || date[1]) + ' · на ' + date[3] + '.' + date[2];
  return [year, period].filter(Boolean).join(' · ');
}

function sortOfficialSeries(items) {
  return [...items].sort((a, b) => Number(b.year) - Number(a.year)
    || String(b.period).localeCompare(String(a.period), 'ru-RU')
    || a.name.localeCompare(b.name, 'ru-RU'));
}

function downloadComparisonCsv(rows, metric, mode, series) {
  const headers = ['Муниципалитет', 'Группа', 'Тип данных', 'Показатель', 'Период', 'Значение', 'Единица измерения', 'Источник'];
  const body = rows.map((row) => [
    row.name,
    row.group2024 ? 'Группа ' + row.group2024 : '',
    mode === 'official' ? 'Проверенное официальное наблюдение' : 'Демонстрационный набор',
    mode === 'official' ? series?.name : metric?.label,
    mode === 'official' ? series?.periodLabel : 'Набор проекта · 2024',
    row.value,
    mode === 'official' ? series?.unit : metric?.unit,
    row.sourceUrl || '',
  ]);
  const csv = '\uFEFF' + [headers, ...body].map((row) => row.map(csvCell).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = mode === 'official' ? 'yugra-official-comparison.csv' : 'yugra-concept-comparison.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const ComparisonWorkspace = ({
  municipalities = [],
  officialIndicators = [],
  selectedMunicipalityIds = [],
  defaultMunicipalityIds = [],
  onSelectionChange,
  onCreateReport,
  onOpenMunicipality,
}) => {
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [mode, setMode] = useState('official');
  const [demoMetricKey, setDemoMetricKey] = useState('investment');
  const [officialCategory, setOfficialCategory] = useState('all');
  const [officialSeriesKey, setOfficialSeriesKey] = useState('');
  const [savedSetAvailable, setSavedSetAvailable] = useState(false);
  const [notice, setNotice] = useState('');

  const municipalityById = useMemo(() => new Map(municipalities.map((item) => [item.id, item])), [municipalities]);
  const selectedMunicipalities = useMemo(
    () => selectedMunicipalityIds.map((id) => municipalityById.get(id)).filter(Boolean),
    [selectedMunicipalityIds, municipalityById]
  );

  const candidates = useMemo(() => {
    const query = normalize(search);
    return municipalities.filter((item) => (
      (groupFilter === 'all' || item.group2024 === groupFilter)
      && (!query || normalize(item.name).includes(query))
    )).slice().sort((a, b) => a.name.localeCompare(b.name, 'ru-RU'));
  }, [municipalities, search, groupFilter]);

  const officialSeries = useMemo(() => {
    const selectedIds = new Set(selectedMunicipalityIds);
    const groups = new Map();
    officialIndicators.forEach((item) => {
      const value = toNumber(item.value);
      const year = Number(item.reference_year);
      const geographicLevel = item.geographic_level || 'municipality';
      const code = String(item.indicator_code || '').trim();
      if (item.verification_status !== 'verified'
        || geographicLevel !== 'municipality'
        || !selectedIds.has(item.municipality_id)
        || !code
        || !Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1
        || value == null
      ) return;
      const period = String(item.reference_period || 'annual');
      const unit = String(item.unit || '').trim();
      const key = [code, year, period, unit, geographicLevel].join('|');
      if (!groups.has(key)) {
        groups.set(key, {
          key, code, year, period, unit,
          name: item.indicator_name || code,
          category: classifyIndicator(item),
          notes: item.notes || '',
          rows: new Map(),
        });
      }
      const group = groups.get(key);
      const current = group.rows.get(item.municipality_id);
      const dateOf = (row) => Date.parse(row?.updated_at || row?.retrieved_at || row?.created_at || '') || 0;
      if (!current || dateOf(item) >= dateOf(current)) {
        group.rows.set(item.municipality_id, {
          value,
          sourceUrl: item.source_url || '',
          sourceName: item.source_name || '',
        });
      }
    });
    return sortOfficialSeries([...groups.values()]
      .filter((item) => item.rows.size >= 2)
      .map((item) => ({
        ...item,
        periodLabel: periodLabel(item),
        coverage: item.rows.size,
      })));
  }, [officialIndicators, selectedMunicipalityIds]);

  const visibleOfficialSeries = useMemo(() => officialSeries.filter((item) => (
    officialCategory === 'all' || item.category === officialCategory
  )), [officialSeries, officialCategory]);

  useEffect(() => {
    if (visibleOfficialSeries.some((item) => item.key === officialSeriesKey)) return;
    setOfficialSeriesKey(visibleOfficialSeries[0]?.key || '');
  }, [visibleOfficialSeries, officialSeriesKey]);

  const selectedOfficialSeries = visibleOfficialSeries.find((item) => item.key === officialSeriesKey)
    || visibleOfficialSeries[0]
    || null;
  const selectedDemoMetric = DEMO_METRICS.find((item) => item.key === demoMetricKey) || DEMO_METRICS[0];

  const comparisonRows = useMemo(() => selectedMunicipalities.map((municipality) => {
    if (mode === 'official') {
      const observation = selectedOfficialSeries?.rows.get(municipality.id);
      return {
        ...municipality,
        value: observation?.value ?? null,
        sourceUrl: observation?.sourceUrl || '',
        sourceName: observation?.sourceName || '',
      };
    }
    return { ...municipality, value: selectedDemoMetric.get(municipality), sourceUrl: '' };
  }), [selectedMunicipalities, mode, selectedOfficialSeries, selectedDemoMetric]);

  const numericValues = comparisonRows.map((item) => item.value).filter((value) => value != null);
  const maxValue = numericValues.length ? Math.max(...numericValues) : null;
  const minValue = numericValues.length ? Math.min(...numericValues) : null;
  const rangeValue = maxValue != null && minValue != null ? maxValue - minValue : null;
  const coverageCount = numericValues.length;
  const selectedMetricName = mode === 'official' ? selectedOfficialSeries?.name : selectedDemoMetric.label;
  const selectedMetricUnit = mode === 'official' ? selectedOfficialSeries?.unit : selectedDemoMetric.unit;
  const isRankMetric = mode === 'demo' && selectedDemoMetric.key === 'rank2024';
  const barMax = numericValues.length ? Math.max(...numericValues.map((value) => Math.abs(value)), 1) : 1;

  const toggleMunicipality = (id) => {
    const exists = selectedMunicipalityIds.includes(id);
    if (exists) {
      onSelectionChange?.(selectedMunicipalityIds.filter((item) => item !== id));
      return;
    }
    if (selectedMunicipalityIds.length >= 4) {
      setNotice('Для одного сравнения можно выбрать не более четырёх территорий.');
      return;
    }
    onSelectionChange?.([...selectedMunicipalityIds, id]);
    setNotice('');
  };

  const applySelection = (ids) => {
    const valid = [...new Set(ids)].filter((id) => municipalityById.has(id)).slice(0, 4);
    onSelectionChange?.(valid);
    setNotice('');
  };

  const resetSelection = () => {
    applySelection(defaultMunicipalityIds.length ? defaultMunicipalityIds : []);
  };

  const saveSelection = () => {
    try {
      localStorage.setItem('yugra-comparison-selection-v1', JSON.stringify(selectedMunicipalityIds));
      setSavedSetAvailable(true);
      setNotice('Состав сравнения сохранён на этом устройстве.');
    } catch {
      setNotice('Не удалось сохранить состав. Проверьте настройки браузера.');
    }
  };

  const loadSelection = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('yugra-comparison-selection-v1') || '[]');
      if (!Array.isArray(stored)) throw new Error('Invalid saved comparison');
      applySelection(stored);
      setNotice('Сохранённый состав загружен.');
    } catch {
      setNotice('Сохранённый состав не найден или повреждён.');
    }
  };

  useEffect(() => {
    try {
      setSavedSetAvailable(Boolean(localStorage.getItem('yugra-comparison-selection-v1')));
    } catch {
      setSavedSetAvailable(false);
    }
  }, []);

  const selectTopFour = () => {
    const topFour = municipalities.slice().filter((item) => toNumber(item.rank2024) != null)
      .sort((a, b) => Number(a.rank2024) - Number(b.rank2024))
      .slice(0, 4).map((item) => item.id);
    applySelection(topFour);
  };

  const exportRows = comparisonRows.map((item) => ({ ...item, value: item.value }));
  const canExport = coverageCount > 0;
  const categoryCount = (key) => officialSeries.filter((item) => key === 'all' || item.category === key).length;

  return (
    <section className="panel full-panel compare-workbench">
      <header className="cw-hero">
        <div>
          <span className="cw-eyebrow">АНАЛИТИЧЕСКИЙ ИНСТРУМЕНТ · ЮГРА</span>
          <h1>Сравнение муниципалитетов</h1>
          <p>Соберите подборку территорий, выберите показатель и получите сопоставление в одной таблице и диаграмме.</p>
        </div>
        <div className="cw-hero-actions">
          <button type="button" className="cw-button cw-button-muted" onClick={saveSelection}>Сохранить набор</button>
          <button type="button" className="cw-button cw-button-muted" onClick={loadSelection} disabled={!savedSetAvailable}>Загрузить набор</button>
          <button type="button" className="cw-button cw-button-primary" disabled={selectedMunicipalityIds.length < 2} onClick={() => onCreateReport?.(selectedMunicipalityIds)}>Собрать отчёт</button>
        </div>
      </header>

      <div className="cw-steps">
        <div className="cw-step cw-step-active"><span>01</span><div><strong>Выберите территории</strong><small>До четырёх муниципалитетов</small></div></div>
        <div className={selectedMunicipalityIds.length >= 2 ? 'cw-step cw-step-active' : 'cw-step'}><span>02</span><div><strong>Выберите данные</strong><small>Официальные или концептуальные</small></div></div>
        <div className={coverageCount >= 2 ? 'cw-step cw-step-active' : 'cw-step'}><span>03</span><div><strong>Сравните результат</strong><small>Диаграмма, таблица и экспорт</small></div></div>
      </div>

      <div className="cw-selection-layout">
        <aside className="cw-picker">
          <div className="cw-panel-heading">
            <div><span className="cw-kicker">ШАГ 1</span><h2>Состав сравнения</h2></div>
            <span className="cw-counter">{selectedMunicipalityIds.length}/4</span>
          </div>
          <div className="cw-selected-list">
            {selectedMunicipalities.length ? selectedMunicipalities.map((item) => (
              <span className="cw-selected-chip" key={item.id}>
                <span>{item.name}</span>
                <button type="button" onClick={() => toggleMunicipality(item.id)} aria-label={'Убрать ' + item.name + ' из сравнения'}>×</button>
              </span>
            )) : <p className="cw-selection-empty">Пока не выбрана ни одна территория.</p>}
          </div>
          <div className="cw-picker-tools">
            <label className="cw-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск муниципалитета…" aria-label="Поиск муниципалитета"/></label>
            <label className="cw-filter"><span>Группа</span><select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}><option value="all">Все</option><option value="A">Группа A</option><option value="B">Группа B</option></select></label>
          </div>
          <div className="cw-picker-list" role="group" aria-label="Выбор муниципалитетов">
            {candidates.map((item) => {
              const checked = selectedMunicipalityIds.includes(item.id);
              const disabled = !checked && selectedMunicipalityIds.length >= 4;
              return (
                <label className={'cw-choice ' + (checked ? 'is-selected' : '') + (disabled ? 'is-disabled' : '')} key={item.id}>
                  <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleMunicipality(item.id)}/>
                  <span className="cw-checkmark" aria-hidden="true">{checked ? '✓' : ''}</span>
                  <span className="cw-choice-copy"><strong>{item.name}</strong><small>Группа {item.group2024 || '—'} · место {item.rank2024 ?? '—'}</small></span>
                  <span className="cw-choice-rank">{item.rank2024 == null ? '—' : '#' + item.rank2024}</span>
                </label>
              );
            })}
            {!candidates.length && <p className="cw-list-empty">Ничего не найдено. Измените запрос или группу.</p>}
          </div>
          <div className="cw-picker-footer">
            <button type="button" className="cw-link-button" onClick={selectTopFour}>Выбрать топ‑4</button>
            <button type="button" className="cw-link-button" onClick={resetSelection}>Вернуть стартовый набор</button>
            <button type="button" className="cw-link-button" onClick={() => applySelection([])}>Очистить</button>
          </div>
          {notice && <p className="cw-notice" role="status">{notice}</p>}
        </aside>

        <div className="cw-results">
          <section className="cw-data-panel">
            <div className="cw-panel-heading">
              <div><span className="cw-kicker">ШАГ 2</span><h2>Что сравниваем</h2></div>
              <span className="cw-coverage-chip">{selectedMunicipalityIds.length} террит. выбрано</span>
            </div>
            <div className="cw-mode-tabs" role="group" aria-label="Тип данных для сравнения">
              <button type="button" className={mode === 'official' ? 'active' : ''} aria-pressed={mode === 'official'} onClick={() => setMode('official')}>Проверенная статистика</button>
              <button type="button" className={mode === 'demo' ? 'active' : ''} aria-pressed={mode === 'demo'} onClick={() => setMode('demo')}>Концептуальный набор</button>
            </div>
            {mode === 'demo' ? (
              <div className="cw-metric-config">
                <label className="cw-metric-select"><span>Показатель</span><select value={demoMetricKey} onChange={(event) => setDemoMetricKey(event.target.value)}>{DEMO_METRICS.map((metric) => <option key={metric.key} value={metric.key}>{metric.label}</option>)}</select></label>
                <p className="cw-source-note">Демонстрационные значения не являются подтверждённой статистикой и не должны использоваться как официальный рейтинг.</p>
                {selectedDemoMetric.note && <p className="cw-metric-note">{selectedDemoMetric.note}</p>}
              </div>
            ) : (
              <div className="cw-metric-config">
                <div className="cw-category-tabs" role="group" aria-label="Тема официального показателя">
                  {OFFICIAL_CATEGORIES.map((item) => (
                    <button type="button" key={item.key} className={officialCategory === item.key ? 'active' : ''} aria-pressed={officialCategory === item.key} onClick={() => setOfficialCategory(item.key)}>
                      {item.label}<small>{categoryCount(item.key)}</small>
                    </button>
                  ))}
                </div>
                <label className="cw-metric-select"><span>Сопоставимый показатель · период · единица измерения</span>
                  <select value={selectedOfficialSeries?.key || ''} onChange={(event) => setOfficialSeriesKey(event.target.value)} disabled={!visibleOfficialSeries.length}>
                    {visibleOfficialSeries.map((item) => <option key={item.key} value={item.key}>{item.name} · {item.periodLabel} · {item.unit || 'единица не указана'} · {item.coverage} террит.</option>)}
                  </select>
                </label>
                {selectedOfficialSeries ? (
                  <div className="cw-official-definition"><span>ПЕРИОД: {selectedOfficialSeries.periodLabel} · ПОКРЫТИЕ: {selectedOfficialSeries.coverage} ИЗ {selectedMunicipalityIds.length}</span><p>{selectedOfficialSeries.notes || 'Сравнение выполняется по одному коду показателя, одинаковому периоду и единице измерения на муниципальном уровне.'}</p></div>
                ) : (
                  <div className="cw-no-series">
                    <strong>Для текущего состава нет общего проверенного показателя.</strong>
                    <p>Нужно выбрать не менее двух территорий, по которым загружен один и тот же подтверждённый муниципальный показатель за совпадающий период и в одинаковых единицах. Попробуйте изменить состав или переключиться на концептуальный набор.</p>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="cw-result-panel">
            <div className="cw-result-heading">
              <div><span className="cw-kicker">ШАГ 3</span><h2>Результат сравнения</h2><p>{selectedMetricName || 'Выберите территории и показатель'}{selectedMetricUnit ? ' · ' + selectedMetricUnit : ''}</p></div>
              <div className="cw-result-actions">
                <button type="button" className="cw-button cw-button-muted" onClick={() => downloadComparisonCsv(exportRows, selectedDemoMetric, mode, selectedOfficialSeries)} disabled={!canExport}>Экспорт CSV</button>
                <button type="button" className="cw-button cw-button-primary" onClick={() => onCreateReport?.(selectedMunicipalityIds)} disabled={selectedMunicipalityIds.length < 2}>Отчёт</button>
              </div>
            </div>
            {selectedMunicipalities.length < 2 ? (
              <div className="cw-empty-result"><strong>Нужно выбрать минимум две территории</strong><p>Добавьте муниципалитеты в левой панели. Выбранные территории появятся здесь в одной таблице и на диаграмме.</p></div>
            ) : !comparisonRows.some((item) => item.value != null) ? (
              <div className="cw-empty-result"><strong>Нет доступных значений для выбранного показателя</strong><p>{mode === 'official' ? 'По текущему набору нет общего проверенного ряда. Попробуйте другую тему или замените одну из территорий.' : 'В концептуальном наборе для этого показателя не заполнены значения у выбранных территорий.'}</p></div>
            ) : (
              <>
                <div className="cw-summary-grid">
                  <article><span>Территорий в сравнении</span><strong>{selectedMunicipalities.length}</strong><small>Максимум — 4</small></article>
                  <article><span>Значения доступны</span><strong>{coverageCount} / {selectedMunicipalities.length}</strong><small>Остальные показаны прочерком</small></article>
                  <article><span>Максимальное значение</span><strong>{mode === 'official' ? formatNumber(maxValue, 2) : selectedDemoMetric.format(maxValue)}</strong><small>В выбранном показателе</small></article>
                  <article><span>Разница между max и min</span><strong>{mode === 'official' ? formatNumber(rangeValue, 2) : selectedDemoMetric.format(rangeValue)}</strong><small>По доступным значениям</small></article>
                </div>
                {coverageCount < selectedMunicipalities.length && <p className="cw-partial-warning">Значения доступны для {coverageCount} из {selectedMunicipalities.length} территорий. Недостающие наблюдения не заменяются нулём.</p>}
                <div className="cw-chart-card">
                  <div className="cw-chart-top"><strong>Сопоставление значений</strong><span>{mode === 'official' ? selectedOfficialSeries?.periodLabel : 'Демонстрационный набор'}</span></div>
                  <div className="cw-bars">
                    {comparisonRows.map((item, index) => {
                      const value = item.value;
                      const width = value == null ? 0 : Math.max(1, Math.abs(value) / barMax * 100);
                      return (
                        <div className="cw-bar-row" key={item.id}>
                          <div className="cw-bar-label"><span className={'cw-bar-index cw-bar-index-' + (index + 1)}>{String(index + 1).padStart(2, '0')}</span><strong>{item.name}</strong></div>
                          <div className="cw-bar-track"><span className={'cw-bar-fill cw-bar-fill-' + (index + 1)} style={{ width: width + '%' }}/></div>
                          <strong className="cw-bar-value">{mode === 'official' ? (value == null ? '—' : formatNumber(value, 2)) : selectedDemoMetric.format(value)}</strong>
                        </div>
                      );
                    })}
                  </div>
                  {isRankMetric && <p className="cw-metric-note">Для места в рейтинге меньшее значение означает более высокую позицию; длина полосы показывает числовое место, а не «лучше/хуже».</p>}
                </div>
                <div className="cw-table-card">
                  <div className="cw-table-heading"><div><strong>Таблица сравнения</strong><span>Нажмите на название территории, чтобы открыть её паспорт.</span></div><span>{coverageCount} значений</span></div>
                  <div className="cw-table-wrap" role="region" tabIndex={0} aria-label="Таблица сравнения муниципалитетов">
                    <table className="cw-table">
                      <thead><tr><th>Муниципалитет</th><th>Группа</th><th>{selectedMetricName || 'Показатель'}</th><th>Отклонение от среднего</th><th>Источник</th></tr></thead>
                      <tbody>
                        {comparisonRows.map((item) => {
                          const average = coverageCount ? numericValues.reduce((sum, value) => sum + value, 0) / coverageCount : null;
                          const deviation = item.value == null || average == null ? null : average === 0 ? null : (item.value - average) / Math.abs(average) * 100;
                          return (
                            <tr key={item.id}>
                              <td><button type="button" className="cw-municipality-link" onClick={() => onOpenMunicipality?.(item)}>{item.name}</button></td>
                              <td><span className={'cw-group-pill cw-group-' + (item.group2024 === 'A' ? 'a' : 'b')}>Группа {item.group2024 || '—'}</span></td>
                              <td className="cw-value-cell">{mode === 'official' ? formatNumber(item.value, 2) : selectedDemoMetric.format(item.value)}</td>
                              <td className="cw-deviation-cell">{deviation == null ? '—' : (deviation > 0 ? '+' : '') + formatNumber(deviation, 1) + '%'}</td>
                              <td>{mode === 'official' ? (item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">Источник ↗</a> : '—') : 'Демо-набор'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="cw-table-footnote">Отклонение рассчитано от среднего только по территориям с доступными значениями. Оно описывает разницу, но само по себе не означает преимущество территории.</p>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </section>
  );
};

export default ComparisonWorkspace;
