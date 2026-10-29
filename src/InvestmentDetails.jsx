import React, { useEffect, useMemo, useState } from 'react';
import data from '../data/municipalities-detailed.json';
import { UgraMap, UgraMapList } from './components/UgraMap';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { fetchMunicipalities } from './lib/municipalities';
import Forecasting from './components/Forecasting';

const Icon = ({ name, className = '' }) => {
  const paths = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-7h6v7"/></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></>,
    table: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16M15 10v10"/></>,
    file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M4 17v4h16v-4"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    chart: <><path d="M4 20V11h4v9M10 20V5h4v15M16 20v-8h4v8"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    chevron: <path d="m6 9 6 6 6-6"/>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    people: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    coins: <><ellipse cx="9" cy="6" rx="6" ry="3"/><path d="M3 6v5c0 1.66 2.69 3 6 3a11 11 0 0 0 2-.18"/><path d="M3 11v5c0 1.66 2.69 3 6 3 1.5 0 2.87-.28 3.92-.74"/><ellipse cx="17" cy="14" rx="4" ry="2.2"/><path d="M13 14v5c0 1.2 1.8 2 4 2s4-.8 4-2v-5"/></>,
    leaf: <><path d="M20 4c-8 0-14 3.5-14 10a6 6 0 0 0 6 6c6.5 0 8-8 8-16Z"/><path d="M4 21c2-5 6-8 12-12"/></>,
    sort: <><path d="m8 7 4-4 4 4M12 3v18M16 17l-4 4-4-4"/></>,
    sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></>,
    compare: <><path d="M4 5h7v14H4zM13 5h7v14h-7z"/><path d="M6 9h3M6 12h3M15 9h3M15 12h3"/></>,
    save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/></>,
    refresh: <><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7h.01"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={`ui-icon ${className}`} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.file}</svg>;
};

const numericValue = (value) => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
const formatNumber = (value, maximumFractionDigits = 0) => {
  const number = numericValue(value);
  return number == null ? '—' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits }).format(number);
};
const formatBillion = (value) => numericValue(value) == null ? '—' : `${formatNumber(value, 1)} млрд ₽`;
const reportDate = () => new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());

const METRICS = [
  { key: 'score', label: 'Итоговый балл', short: 'Балл', unit: 'баллов', get: (m) => numericValue(m.score), format: (m) => formatNumber(m.score, 1) },
  { key: 'rank2024', label: 'Место в рейтинге', short: 'Место', unit: 'место', get: (m) => numericValue(m.rank2024), format: (m) => numericValue(m.rank2024) == null ? '—' : `№ ${formatNumber(m.rank2024)}` },
  { key: 'investments', label: 'Инвестиции без добычи', short: 'Инвестиции', unit: 'млрд ₽', get: (m) => numericValue(m.investments?.volumeBillion), format: (m) => formatBillion(m.investments?.volumeBillion) },
  { key: 'growthPercent', label: 'Динамика инвестиций', short: 'Динамика', unit: '%', get: (m) => numericValue(m.investments?.growthPercent), format: (m) => numericValue(m.investments?.growthPercent) == null ? '—' : `${formatNumber(m.investments?.growthPercent, 0)}%` },
  { key: 'smeCount', label: 'Субъекты МСП', short: 'МСП', unit: 'ед.', get: (m) => numericValue(m.smeCount), format: (m) => formatNumber(m.smeCount) },
  { key: 'assessmentScore', label: 'Оценка бизнеса', short: 'Бизнес', unit: 'из 5', get: (m) => numericValue(m.assessmentScore), format: (m) => numericValue(m.assessmentScore) == null ? '—' : `${formatNumber(m.assessmentScore, 2)} / 5` },
];
const METRIC_BY_KEY = Object.fromEntries(METRICS.map((metric) => [metric.key, metric]));
const DEFAULT_COMPARE_IDS = ['surgutsky', 'khanty-mansiysk', 'surgut'];
const DEFAULT_REPORT_FIELDS = ['score', 'rank2024', 'investments', 'growthPercent', 'smeCount', 'assessmentScore'];

const metricValue = (municipality, key) => METRIC_BY_KEY[key]?.get(municipality) ?? '';
const metricText = (municipality, key) => METRIC_BY_KEY[key]?.format(municipality) ?? '';
const csvEscape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const downloadCsv = (items, fields, filename) => {
  const headers = ['Муниципальное образование', 'Группа', ...fields.map((key) => METRIC_BY_KEY[key]?.label || key)];
  const rows = items.map((item) => [item.name, `Группа ${item.group2024}`, ...fields.map((key) => metricText(item, key))]);
  const content = '\uFEFF' + [headers, ...rows].map((row) => row.map(csvEscape).join(';')).join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const InvestmentDetails = () => {
  // Локальный JSON остаётся резервом на случай отсутствия ключа/сети/доступа к таблице.
  const [municipalities, setMunicipalities] = useState(data.municipalities);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? 'loading' : 'unconfigured');
  const [syncMessage, setSyncMessage] = useState('');
  const [syncAttempt, setSyncAttempt] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setSyncStatus('unconfigured');
      setSyncMessage('Добавьте VITE_SUPABASE_ANON_KEY в .env.local и в Vercel.');
      return undefined;
    }

    let cancelled = false;
    let inFlight = false;
    let hasSyncedSuccessfully = false;

    const syncMunicipalities = async () => {
      if (inFlight || cancelled) return;
      inFlight = true;
      if (!cancelled && !hasSyncedSuccessfully) setSyncStatus('loading');
      try {
        const rows = await fetchMunicipalities(supabase);
        if (cancelled) return;
        setMunicipalities(rows);
        setLastSyncedAt(new Date());
        hasSyncedSuccessfully = true;
        setSyncStatus('connected');
        setSyncMessage('');
      } catch (error) {
        if (cancelled) return;
        setSyncStatus('error');
        setSyncMessage(error?.message || 'Не удалось загрузить данные из Supabase');
      } finally {
        inFlight = false;
      }
    };

    syncMunicipalities();
    const intervalId = window.setInterval(syncMunicipalities, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
    // lastSyncedAt не включается намеренно: интервал должен создаваться один раз.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncAttempt]);

  const syncTimeLabel = lastSyncedAt
    ? new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(lastSyncedAt)
    : null;
  const [activeTab, setActiveTab] = useState('catalog');
  const navigateToTab = (tab) => {
    setActiveTab(tab);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [activeSlice, setActiveSlice] = useState('all');
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ minScore: '', maxScore: '', minInvestments: '', minSme: '', minGrowth: '', minAssessment: '' });
  const [activeModalItem, setActiveModalItem] = useState(null);
  const [hoveredRegionId, setHoveredRegionId] = useState(null);
  const [isMapListOpen, setIsMapListOpen] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });

  // Сравнение: до четырёх территорий и один главный показатель для диаграммы.
  const [comparisonSearch, setComparisonSearch] = useState('');
  const [selectedCompareIds, setSelectedCompareIds] = useState(() => DEFAULT_COMPARE_IDS.filter((id) => municipalities.some((m) => m.id === id)));
  const [comparisonMetric, setComparisonMetric] = useState('score');

  // Конструктор отчёта: источник данных, поля, блоки и шаблон настроек.
  const [reportTitle, setReportTitle] = useState('Социально-экономический обзор муниципалитетов Югры');
  const [reportScope, setReportScope] = useState('filtered');
  const [reportSelectedIds, setReportSelectedIds] = useState(() => DEFAULT_COMPARE_IDS.filter((id) => municipalities.some((m) => m.id === id)));
  const [reportSelectionSearch, setReportSelectionSearch] = useState('');
  const [reportFields, setReportFields] = useState(DEFAULT_REPORT_FIELDS);
  const [reportIncludeSummary, setReportIncludeSummary] = useState(true);
  const [reportIncludeChart, setReportIncludeChart] = useState(true);
  const [reportIncludeTable, setReportIncludeTable] = useState(true);
  const [reportIncludeMethodology, setReportIncludeMethodology] = useState(true);
  const [reportChartMetric, setReportChartMetric] = useState('investments');
  const [reportTemplateSaved, setReportTemplateSaved] = useState(false);
  
  useEffect(() => {
    if (!activeModalItem) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setActiveModalItem(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [activeModalItem]);


  const filteredMunicipalities = useMemo(() => municipalities.filter((m) => {
    const name = m.name.toLocaleLowerCase('ru-RU');
    const matchesGroup = selectedGroup === 'ALL' || m.group2024 === selectedGroup;
    const matchesSearch = name.includes(searchTerm.trim().toLocaleLowerCase('ru-RU'));
    const matchesSlice = activeSlice === 'all'
      || (activeSlice === 'top' && numericValue(m.rank2024) != null && Number(m.rank2024) <= 5)
      || (activeSlice === 'investment' && numericValue(m.investments?.volumeBillion) != null && Number(m.investments.volumeBillion) >= 50)
      || (activeSlice === 'growth' && numericValue(m.investments?.growthPercent) != null && Number(m.investments.growthPercent) >= 103)
      || (activeSlice === 'business' && numericValue(m.assessmentScore) != null && Number(m.assessmentScore) >= 4.5);
    const matchesScoreMin = filters.minScore === '' || (numericValue(m.score) != null && Number(m.score) >= Number(filters.minScore));
    const matchesScoreMax = filters.maxScore === '' || (numericValue(m.score) != null && Number(m.score) <= Number(filters.maxScore));
    const matchesInvestment = filters.minInvestments === '' || (numericValue(m.investments?.volumeBillion) != null && Number(m.investments.volumeBillion) >= Number(filters.minInvestments));
    const matchesSme = filters.minSme === '' || (numericValue(m.smeCount) != null && Number(m.smeCount) >= Number(filters.minSme));
    const matchesGrowth = filters.minGrowth === '' || (numericValue(m.investments?.growthPercent) != null && Number(m.investments.growthPercent) >= Number(filters.minGrowth));
    const matchesAssessment = filters.minAssessment === '' || (numericValue(m.assessmentScore) != null && Number(m.assessmentScore) >= Number(filters.minAssessment));
    return matchesGroup && matchesSearch && matchesSlice && matchesScoreMin && matchesScoreMax && matchesInvestment && matchesSme && matchesGrowth && matchesAssessment;
  }), [municipalities, selectedGroup, searchTerm, activeSlice, filters]);

  const sortedMunicipalities = useMemo(() => [...filteredMunicipalities].sort((a, b) => {
    const getValue = (item) => sortConfig.key === 'investments' ? numericValue(item.investments?.volumeBillion) : sortConfig.key === 'growthPercent' ? numericValue(item.investments?.growthPercent) : numericValue(item[sortConfig.key]) ?? item[sortConfig.key];
    const aValue = getValue(a);
    const bValue = getValue(b);
    if (aValue == null && bValue != null) return 1;
    if (bValue == null && aValue != null) return -1;
    if (typeof aValue === 'string' || typeof bValue === 'string') {
      const result = String(aValue ?? '').localeCompare(String(bValue ?? ''), 'ru-RU');
      return sortConfig.direction === 'asc' ? result : -result;
    }
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  }), [filteredMunicipalities, sortConfig]);

  const totals = useMemo(() => {
    const list = filteredMunicipalities;
    const scored = list.filter((m) => numericValue(m.score) != null);
    const investmentRows = list.filter((m) => numericValue(m.investments?.volumeBillion) != null);
    const smeRows = list.filter((m) => numericValue(m.smeCount) != null);
    return {
      count: list.length,
      averageScore: scored.length ? scored.reduce((sum, m) => sum + Number(m.score), 0) / scored.length : null,
      scoredCount: scored.length,
      investments: investmentRows.length ? investmentRows.reduce((sum, m) => sum + Number(m.investments.volumeBillion), 0) : null,
      investmentCount: investmentRows.length,
      sme: smeRows.length ? smeRows.reduce((sum, m) => sum + Number(m.smeCount), 0) : null,
      smeCount: smeRows.length,
    };
  }, [filteredMunicipalities]);

  const comparisonItems = useMemo(() => municipalities.filter((m) => selectedCompareIds.includes(m.id)), [municipalities, selectedCompareIds]);
  const comparisonCandidates = useMemo(() => municipalities.filter((m) => m.name.toLocaleLowerCase('ru-RU').includes(comparisonSearch.trim().toLocaleLowerCase('ru-RU'))), [municipalities, comparisonSearch]);
  const reportItems = useMemo(() => {
    if (reportScope === 'all') return [...municipalities].sort((a, b) => a.name.localeCompare(b.name, 'ru-RU'));
    if (reportScope === 'selected') return municipalities.filter((m) => reportSelectedIds.includes(m.id));
    return [...filteredMunicipalities];
  }, [reportScope, municipalities, reportSelectedIds, filteredMunicipalities]);
  const reportSummary = useMemo(() => {
    const scored = reportItems.filter((m) => numericValue(m.score) != null);
    const investmentRows = reportItems.filter((m) => numericValue(m.investments?.volumeBillion) != null);
    const smeRows = reportItems.filter((m) => numericValue(m.smeCount) != null);
    const assessmentRows = reportItems.filter((m) => numericValue(m.assessmentScore) != null);
    return {
      count: reportItems.length,
      avgScore: scored.length ? scored.reduce((s, m) => s + Number(m.score), 0) / scored.length : null,
      investments: investmentRows.length ? investmentRows.reduce((s, m) => s + Number(m.investments.volumeBillion), 0) : null,
      investmentCoverage: investmentRows.length,
      sme: smeRows.length ? smeRows.reduce((s, m) => s + Number(m.smeCount), 0) : null,
      smeCoverage: smeRows.length,
      avgAssessment: assessmentRows.length ? assessmentRows.reduce((s, m) => s + Number(m.assessmentScore), 0) / assessmentRows.length : null,
    };
  }, [reportItems]);
  const comparisonMetricDef = METRIC_BY_KEY[comparisonMetric] || METRICS[0];
  const reportChartMetricDef = METRIC_BY_KEY[reportChartMetric] || METRICS[0];
  const reportPrintFields = reportFields.filter((key) => METRIC_BY_KEY[key]);

  const requestSort = (key) => setSortConfig((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
  const handleExportPDF = () => window.print();
  const resetFilters = () => {
    setSearchTerm(''); setSelectedGroup('ALL'); setActiveSlice('all');
    setFilters({ minScore: '', maxScore: '', minInvestments: '', minSme: '', minGrowth: '', minAssessment: '' });
  };
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const toggleCompare = (id) => setSelectedCompareIds((current) => {
    if (current.includes(id)) return current.filter((item) => item !== id);
    if (current.length >= 4) return current;
    return [...current, id];
  });
  const toggleReportSelection = (id) => { setReportTemplateSaved(false); setReportSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); };
  const toggleReportField = (key) => { setReportTemplateSaved(false); setReportFields((current) => current.includes(key) ? current.filter((field) => field !== key) : [...current, key]); };
  const saveReportTemplate = () => {
    const template = { reportTitle, reportScope, reportSelectedIds, reportFields, reportIncludeSummary, reportIncludeChart, reportIncludeTable, reportIncludeMethodology, reportChartMetric };
    try { localStorage.setItem('yugra-report-template-v1', JSON.stringify(template)); setReportTemplateSaved(true); }
    catch { setReportTemplateSaved(false); }
  };
  const loadReportTemplate = () => {
    try {
      const raw = localStorage.getItem('yugra-report-template-v1');
      if (!raw) return;
      const template = JSON.parse(raw);
      if (template.reportTitle) setReportTitle(template.reportTitle);
      if (template.reportScope) setReportScope(template.reportScope);
      if (Array.isArray(template.reportSelectedIds)) setReportSelectedIds(template.reportSelectedIds);
      if (Array.isArray(template.reportFields)) setReportFields(template.reportFields.filter((key) => METRIC_BY_KEY[key]));
      if (typeof template.reportIncludeSummary === 'boolean') setReportIncludeSummary(template.reportIncludeSummary);
      if (typeof template.reportIncludeChart === 'boolean') setReportIncludeChart(template.reportIncludeChart);
      if (typeof template.reportIncludeTable === 'boolean') setReportIncludeTable(template.reportIncludeTable);
      if (typeof template.reportIncludeMethodology === 'boolean') setReportIncludeMethodology(template.reportIncludeMethodology);
      if (template.reportChartMetric && METRIC_BY_KEY[template.reportChartMetric]) setReportChartMetric(template.reportChartMetric);
      setReportTemplateSaved(true);
    } catch { setReportTemplateSaved(false); }
  };
  const exportReportCsv = () => downloadCsv(reportItems, reportPrintFields, 'yugra-analytical-report');

  const renderTableRows = (items) => items.map((m, index) => (
    <tr key={m.id} onMouseEnter={() => setHoveredRegionId(m.id)} onMouseLeave={() => setHoveredRegionId(null)}>
      <td className="row-number">{String(index + 1).padStart(2, '0')}</td>
      <td className="municipality-cell"><button className="municipality-link" onClick={() => setActiveModalItem(m)}>{m.name}</button></td>
      <td><span className={`group-badge ${m.group2024 === 'A' ? 'group-a' : 'group-b'}`}><i />Группа {m.group2024}</span></td>
      <td className="score-cell">{formatNumber(m.score, 1)}</td>
      <td className="number-cell">{numericValue(m.investments?.volumeBillion) == null ? '—' : <>{formatNumber(m.investments.volumeBillion, 1)} <small>млрд ₽</small></>}</td>
      <td className="number-cell">{formatNumber(m.smeCount)}</td>
      <td><button className="icon-button" aria-label={`Открыть паспорт: ${m.name}`} onClick={() => setActiveModalItem(m)}><Icon name="arrow"/></button></td>
    </tr>
  ));

  const SortButton = ({ label, column }) => (
    <button className="sort-button" onClick={() => requestSort(column)}>{label}<span className={`sort-state ${sortConfig.key === column ? 'sort-state-active' : ''}`}>{sortConfig.key === column ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</span></button>
  );

  const renderReportSummary = () => (
    <div className="report-summary-grid">
      <div><span>Муниципалитеты в отчёте</span><strong>{reportSummary.count}</strong></div>
      <div><span>Средний итоговый балл</span><strong>{formatNumber(reportSummary.avgScore, 1)}</strong></div>
      <div><span>Объём инвестиций</span><strong>{formatNumber(reportSummary.investments, 1)} <small>млрд ₽</small></strong><small>данные по {reportSummary.investmentCoverage} из {reportSummary.count}</small></div>
      <div><span>Субъекты МСП</span><strong>{formatNumber(reportSummary.sme)}</strong><small>данные по {reportSummary.smeCoverage} из {reportSummary.count}</small></div>
      <div><span>Средняя оценка бизнеса</span><strong>{formatNumber(reportSummary.avgAssessment, 2)} <small>/ 5</small></strong></div>
    </div>
  );

  const renderReportChart = () => {
    const chartItems = reportItems.filter((m) => reportChartMetricDef.get(m) != null);
    const rawValues = chartItems.map((m) => reportChartMetricDef.get(m));
    const maxValue = Math.max(...rawValues, 1);
    const rankMax = Math.max(...municipalities.map((m) => Number(m.rank2024 || 0)), 1);
    return <div className="report-chart-list">{chartItems.map((m) => {
      const value = reportChartMetricDef.get(m);
      const barValue = reportChartMetric === 'rank2024' ? rankMax + 1 - value : value;
      const denominator = reportChartMetric === 'rank2024' ? rankMax : maxValue;
      const width = Math.max(2, Math.min(100, denominator ? (barValue / denominator) * 100 : 0));
      return <div className="report-chart-row" key={m.id}><span className="report-chart-name">{m.name}</span><span className="report-chart-track"><i style={{ width: `${width}%` }}/></span><strong>{reportChartMetricDef.format(m)}</strong></div>;
    })}</div>;
  };

  const renderReportTable = () => (
    <div className="table-scroll report-table-scroll"><table className="ranking-table report-table"><thead><tr><th>№</th><th>Муниципальное образование</th><th>Группа</th>{reportPrintFields.map((key) => <th key={key}>{METRIC_BY_KEY[key].label}</th>)}</tr></thead>
      <tbody>{reportItems.map((m, index) => <tr key={m.id}><td>{String(index + 1).padStart(2, '0')}</td><td>{m.name}</td><td>Группа {m.group2024}</td>{reportPrintFields.map((key) => <td key={key}>{metricText(m, key)}</td>)}</tr>)}</tbody>
    </table>{reportItems.length === 0 && <div className="empty-state"><span>Нет данных для отчёта</span><p>Выберите другой источник данных или отметьте муниципалитеты.</p></div>}</div>
  );

  return (
    <div className="yugra-app">
      <section className="print-report">
        <div className="print-report-kicker">ЮГРА · АНАЛИТИЧЕСКАЯ ПЛАТФОРМА</div>
        <h1>{reportTitle || 'Аналитический отчёт по муниципалитетам Югры'}</h1>
        <p>Срез данных: 2024 · Сформировано: {reportDate()} · В выборке: {reportSummary.count} муниципалитетов</p>
        {reportIncludeSummary && <><h2>Сводка</h2>{renderReportSummary()}</>}
        {reportIncludeChart && reportItems.length > 0 && <><h2>Сравнение показателя: {reportChartMetricDef.label}</h2>{renderReportChart()}</>}
        {reportIncludeTable && <><h2>Детализация показателей</h2>{renderReportTable()}</>}
        {reportIncludeMethodology && <p className="print-methodology">Источник данных: {lastSyncedAt ? 'Supabase (последняя успешная загрузка)' : 'резервный локальный набор'}. Отчёт отражает выбранную выборку и настройки конструктора. Перед официальным использованием проверьте первоисточники, период наблюдения и методику расчёта.</p>}
      </section>

      <a className="skip-link" href="#main-content">Перейти к содержимому</a>
      <div className="site-shell print:hidden">
        <header className="site-header">
          <button className="brand-lockup" onClick={() => navigateToTab('catalog')} aria-label="Югра — на главную">
            <span className="brand-emblem"><img src="/images/khanty-prosperity-seal.svg" alt="" /></span>
            <span className="brand-copy"><span className="brand-title">ЮГРА</span><span className="brand-subtitle">Земля традиций</span></span>
          </button>
          <nav className="main-nav" aria-label="Основная навигация">
            <button aria-current={activeTab === 'catalog' ? 'page' : undefined} className={activeTab === 'catalog' ? 'nav-item active' : 'nav-item'} onClick={() => navigateToTab('catalog')}><Icon name="home"/>Главная</button>
            <button aria-current={activeTab === 'map' ? 'page' : undefined} className={activeTab === 'map' ? 'nav-item active' : 'nav-item'} onClick={() => navigateToTab('map')}><Icon name="map"/>Карта</button>
            <button aria-current={activeTab === 'rating' ? 'page' : undefined} className={activeTab === 'rating' ? 'nav-item active' : 'nav-item'} onClick={() => navigateToTab('rating')}><Icon name="chart"/>Рейтинг</button>
            <button aria-current={activeTab === 'compare' ? 'page' : undefined} className={activeTab === 'compare' ? 'nav-item active' : 'nav-item'} onClick={() => navigateToTab('compare')}><Icon name="compare"/>Сравнение</button>
            <button aria-current={activeTab === 'reports' ? 'page' : undefined} className={activeTab === 'reports' ? 'nav-item active' : 'nav-item'} onClick={() => navigateToTab('reports')}><Icon name="file"/>Отчёты</button>
            <button title="Режим прогнозирования" aria-label="Режим прогнозирования" aria-current={activeTab === 'forecast' ? 'page' : undefined} className={activeTab === 'forecast' ? 'nav-item active nav-item-forecast' : 'nav-item nav-item-forecast'} onClick={() => navigateToTab('forecast')}><Icon name="chart"/>Прогноз</button>
          </nav>
          <div className="header-motto"><span className="motto-mark"/>ЛЮДИ · ЗЕМЛЯ · ПРИРОДА</div>
        </header>
        <div className="ornament-divider" aria-hidden="true" />
        <div className={`sync-status sync-status--${syncStatus}`} role="status" aria-live="polite">
          <span className="sync-status-dot" aria-hidden="true" />
          {syncStatus === 'connected' && syncTimeLabel && <span>Данные подключены · обновлено в {syncTimeLabel}</span>}
          {syncStatus === 'loading' && <span>Обновляем данные…</span>}
          {syncStatus === 'unconfigured' && <span>Демонстрационные данные · подключение к базе не настроено</span>}
          {syncStatus === 'error' && <span>{lastSyncedAt && syncTimeLabel ? `Не удалось обновить · последние данные на ${syncTimeLabel}` : 'Не удалось подключиться · показываем резервные данные'}</span>}
          {syncStatus === 'error' && syncMessage && <span className="sync-status-detail" title={syncMessage}>Подробности: {syncMessage}</span>}
          {syncStatus === 'error' && <button className="sync-retry" onClick={() => setSyncAttempt((attempt) => attempt + 1)}><Icon name="refresh"/>Повторить</button>}
        </div>

        <main id="main-content">
          {activeTab === 'catalog' && <>
            <section className="intro-panel panel">
              <div className="intro-top">
                <div className="intro-copy">
                  <div className="eyebrow"><span className="eyebrow-diamond"/> ХАНТЫ · МАНСИ · ЮГРА</div>
                  <h1>Каталог муниципальных <em>образований</em></h1>
                  <p>Изучайте территории, сравнивайте социально-экономические показатели и собирайте собственные аналитические срезы.</p>
                </div>
                <div className="intro-art" aria-label="Гравюра с традиционными жителями Севера и оленями">
                  <div className="intro-art-image"><img src="/images/khanty-mansi-engraving.jpg" alt="Гравюра: жители Севера в традиционной одежде и северные олени" /></div>
                  <div className="intro-art-caption"><span>Культура Севера</span><img src="/images/khanty-prosperity-seal.svg" alt="" /></div>
                  <div className="intro-art-edge" aria-hidden="true" />
                </div>
              </div>
              <div className="catalog-toolbar">
                <label className="search-box"><Icon name="search"/><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Поиск по названию муниципалитета…" aria-label="Поиск по названию муниципалитета"/><span className="search-shortcut">⌕</span></label>
                <div className="filter-block"><span className="filter-caption">Группа рейтинга</span><div className="filter-row" aria-label="Фильтр по группе">
                  {[['ALL', 'Все группы'], ['A', 'Группа A'], ['B', 'Группа B']].map(([value, label]) => <button key={value} className={`filter-pill ${selectedGroup === value ? 'selected' : ''}`} onClick={() => setSelectedGroup(value)}>{label}{selectedGroup === value && <span className="filter-check">✓</span>}</button>)}
                </div></div>
              </div>
              <div className="slice-bar"><div className="slice-label"><Icon name="sliders"/> Быстрые срезы</div><div className="slice-options">
                {[['all', 'Все территории'], ['top', 'Топ-5 рейтинга'], ['investment', 'Инвестиции ≥ 50 млрд ₽'], ['growth', 'Рост ≥ 103%'], ['business', 'Оценка бизнеса ≥ 4,5']].map(([value, label]) => <button key={value} className={`slice-chip ${activeSlice === value ? 'active' : ''}`} onClick={() => setActiveSlice(value)}>{label}</button>)}
              </div><button className={`filter-toggle ${advancedFiltersOpen ? 'open' : ''}`} onClick={() => setAdvancedFiltersOpen((open) => !open)}><Icon name="sliders"/>{advancedFiltersOpen ? 'Скрыть фильтры' : 'Расширенные фильтры'}<Icon name="chevron"/></button></div>
              {(searchTerm.trim() || selectedGroup !== 'ALL' || activeSlice !== 'all' || Object.values(filters).some((value) => value !== '')) && <div className="active-filter-summary"><span>Активные фильтры · найдено <strong>{filteredMunicipalities.length}</strong> из {municipalities.length}</span><button className="text-action" onClick={resetFilters}><Icon name="refresh"/>Сбросить</button></div>}
              {advancedFiltersOpen && <div className="advanced-filter-grid">
                <label><span>Балл от</span><input type="number" value={filters.minScore} onChange={(e) => setFilter('minScore', e.target.value)} placeholder="Например, 250"/></label>
                <label><span>Балл до</span><input type="number" value={filters.maxScore} onChange={(e) => setFilter('maxScore', e.target.value)} placeholder="Без ограничения"/></label>
                <label><span>Инвестиции от, млрд ₽</span><input type="number" min="0" value={filters.minInvestments} onChange={(e) => setFilter('minInvestments', e.target.value)} placeholder="0"/></label>
                <label><span>Субъекты МСП от</span><input type="number" min="0" value={filters.minSme} onChange={(e) => setFilter('minSme', e.target.value)} placeholder="0"/></label>
                <label><span>Рост инвестиций от, %</span><input type="number" value={filters.minGrowth} onChange={(e) => setFilter('minGrowth', e.target.value)} placeholder="Без ограничения"/></label>
                <label><span>Оценка бизнеса от, из 5</span><input type="number" min="0" max="5" step="0.1" value={filters.minAssessment} onChange={(e) => setFilter('minAssessment', e.target.value)} placeholder="0"/></label>
                <div className="advanced-filter-footer"><span>Срез включает <strong>{filteredMunicipalities.length}</strong> из {municipalities.length} территорий</span><button className="text-action" onClick={resetFilters}><Icon name="refresh"/>Сбросить всё</button></div>
              </div>}
            </section>

            <section className="stats-grid" aria-label="Сводные показатели">
              <article className="metric-card"><span className="metric-icon"><Icon name="map"/></span><div className="metric-copy"><span className="metric-label">Муниципалитеты</span><strong>{totals.count}</strong><small>в текущем срезе из {municipalities.length}</small></div><span className="metric-index">01</span></article>
              <article className="metric-card"><span className="metric-icon"><Icon name="chart"/></span><div className="metric-copy"><span className="metric-label">Средний балл</span><strong>{formatNumber(totals.averageScore, 1)}</strong><small>по выбранным территориям</small></div><span className="metric-index">02</span></article>
              <article className="metric-card"><span className="metric-icon"><Icon name="coins"/></span><div className="metric-copy"><span className="metric-label">Инвестиции</span><strong>{formatNumber(totals.investments, 1)} <i>млрд ₽</i></strong><small>значения по {totals.investmentCount} из {totals.count} территорий</small></div><span className="metric-index">03</span></article>
              <article className="metric-card"><span className="metric-icon"><Icon name="people"/></span><div className="metric-copy"><span className="metric-label">Субъекты МСП</span><strong>{formatNumber(totals.sme)}</strong><small>значения по {totals.smeCount} из {totals.count} территорий</small></div><span className="metric-index">04</span></article>
            </section>

            <div className="dashboard-grid">
              <section className="map-panel panel">
                <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="pin"/></span><div><h2>Карта Югры</h2><p>Нажмите на территорию для подробностей</p></div></div><span className="section-tag">ИНТЕРАКТИВНАЯ</span></div>
                <div className="map-stage"><UgraMap municipalities={municipalities} hoveredId={hoveredRegionId} onHover={setHoveredRegionId} onSelect={setActiveModalItem}/><div className="map-watermark" aria-hidden="true"><img src="/images/khanty-prosperity-seal.svg" alt=""/></div></div>
                <div className="map-legend"><span><i className="legend-dot high"/>Группа A</span><span><i className="legend-dot mid"/>Группа B</span><span className="legend-hint">Выберите район на карте</span></div>
                <div className="map-card-footer"><span><Icon name="leaf"/> Территория тайги и рек</span><button onClick={() => navigateToTab('map')}>Открыть карту <Icon name="arrow"/></button></div>
              </section>

              <section className="ranking-panel panel">
                <div className="section-heading ranking-heading"><div className="heading-label"><span className="heading-icon"><Icon name="chart"/></span><div><h2>Рейтинг муниципалитетов</h2><p>С учётом текущего набора фильтров</p></div></div><button className="primary-button" onClick={() => navigateToTab('rating')}>Полный рейтинг <Icon name="arrow"/></button></div>
                <div className="table-meta"><span>НАЙДЕНО <strong>{sortedMunicipalities.length}</strong> ИЗ {municipalities.length}</span><span className="table-sort-hint"><Icon name="sort"/> Сортировка по заголовкам</span></div>
                <div className="table-scroll"><table className="ranking-table"><thead><tr><th className="num-col">№</th><th><SortButton label="Муниципальное образование" column="name"/></th><th><SortButton label="Группа" column="group2024"/></th><th><SortButton label="Балл" column="score"/></th><th><SortButton label="Инвестиции" column="investments"/></th><th><SortButton label="МСП" column="smeCount"/></th><th><span className="action-heading">Паспорт</span></th></tr></thead><tbody>{renderTableRows(sortedMunicipalities)}</tbody></table>
                  {sortedMunicipalities.length === 0 && <div className="empty-state"><span>Ничего не найдено</span><p>Измените фильтры или сбросьте текущий срез.</p><button className="outline-button" onClick={resetFilters}>Сбросить фильтры</button></div>}
                </div>
                <div className="table-footer"><span>Данные муниципальных образований</span><button className="text-action" onClick={() => downloadCsv(sortedMunicipalities, DEFAULT_REPORT_FIELDS, 'yugra-current-slice')}><Icon name="download"/>Выгрузить срез CSV</button></div>
              </section>
            </div>
          </>}

          {activeTab === 'forecast' && <Forecasting municipalities={municipalities} supabase={supabase} isSupabaseConfigured={isSupabaseConfigured} />}

          {activeTab === 'map' && <section className="panel full-panel">
            <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="map"/></span><div><h2>Муниципальная карта Югры</h2><p>Выберите территорию на карте или в списке</p></div></div><button className="outline-button" onClick={() => setIsMapListOpen(!isMapListOpen)}>{isMapListOpen ? 'Скрыть список' : 'Показать список'}</button></div>
            <div className={`map-layout ${isMapListOpen ? '' : 'map-only'}`}><div className="map-stage large-map"><UgraMap municipalities={municipalities} hoveredId={hoveredRegionId} onHover={setHoveredRegionId} onSelect={setActiveModalItem}/></div>{isMapListOpen && <div className="map-list"><UgraMapList municipalities={municipalities} hoveredId={hoveredRegionId} onHover={setHoveredRegionId} onSelect={setActiveModalItem}/></div>}</div>
          </section>}

          {activeTab === 'rating' && <section className="panel full-panel ranking-page">
            <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="chart"/></span><div><h2>Рейтинг муниципалитетов</h2><p>Полный рейтинг с поиском, срезами и сортировкой</p></div></div><div className="toolbar-actions"><button className="outline-button" onClick={() => downloadCsv(sortedMunicipalities, DEFAULT_REPORT_FIELDS, 'yugra-rating')}><Icon name="download"/>CSV</button><button className="primary-button" onClick={() => { setReportScope('filtered'); navigateToTab('reports'); }}><Icon name="file"/>Собрать отчёт</button></div></div>
            <div className="rating-filters"><label className="search-box"><Icon name="search"/><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Найти муниципалитет…"/></label><div className="filter-row">{[['ALL', 'Все группы'], ['A', 'Группа A'], ['B', 'Группа B']].map(([value, label]) => <button key={value} className={`filter-pill ${selectedGroup === value ? 'selected' : ''}`} onClick={() => setSelectedGroup(value)}>{label}</button>)}</div><button className="text-action" onClick={resetFilters}><Icon name="refresh"/>Сбросить фильтры</button></div>
            <div className="table-meta"><span>В ТАБЛИЦЕ <strong>{sortedMunicipalities.length}</strong> МУНИЦИПАЛИТЕТОВ</span><span className="table-sort-hint">Нажмите на заголовок, чтобы изменить порядок</span></div>
            <div className="table-scroll compare-scroll"><table className="ranking-table compare-table"><thead><tr><th className="num-col">№</th><th><SortButton label="Муниципальное образование" column="name"/></th><th><SortButton label="Группа" column="group2024"/></th><th><SortButton label="Балл" column="score"/></th><th><SortButton label="Инвестиции, млрд ₽" column="investments"/></th><th><SortButton label="МСП, ед." column="smeCount"/></th><th><SortButton label="Оценка бизнеса" column="assessmentScore"/></th><th>Паспорт</th></tr></thead><tbody>{sortedMunicipalities.map((m, i) => <tr key={m.id} onMouseEnter={() => setHoveredRegionId(m.id)} onMouseLeave={() => setHoveredRegionId(null)}><td className="row-number">{String(i + 1).padStart(2, '0')}</td><td><button className="municipality-link" onClick={() => setActiveModalItem(m)}>{m.name}</button></td><td><span className={`group-badge ${m.group2024 === 'A' ? 'group-a' : 'group-b'}`}><i/>{`Группа ${m.group2024}`}</span></td><td className="score-cell">{formatNumber(m.score, 1)}</td><td className="number-cell">{formatNumber(m.investments.volumeBillion, 1)}</td><td className="number-cell">{formatNumber(m.smeCount)}</td><td>{formatNumber(m.assessmentScore, 2)} / 5</td><td><button className="icon-button" onClick={() => setActiveModalItem(m)} aria-label={`Открыть паспорт: ${m.name}`}><Icon name="arrow"/></button></td></tr>)}</tbody></table></div>
          </section>}

          {activeTab === 'compare' && <section className="panel full-panel compare-page">
            <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="compare"/></span><div><h2>Сравнение муниципалитетов</h2><p>Выберите от двух до четырёх территорий и сравните показатели бок о бок</p></div></div><div className="toolbar-actions"><button className="outline-button" onClick={() => setSelectedCompareIds(DEFAULT_COMPARE_IDS.filter((id) => municipalities.some((m) => m.id === id)))}><Icon name="refresh"/>Сбросить выбор</button><button className="primary-button" onClick={() => { setReportScope('selected'); setReportSelectedIds(selectedCompareIds); navigateToTab('reports'); }}><Icon name="file"/>Отчёт по сравнению</button></div></div>
            <div className="compare-workspace">
              <aside className="compare-picker">
                <div className="picker-title"><div><strong>Территории для сравнения</strong><span>Выбрано {selectedCompareIds.length} из 4</span></div><span className="picker-counter">{selectedCompareIds.length}/4</span></div>
                <label className="search-box picker-search"><Icon name="search"/><input value={comparisonSearch} onChange={(e) => setComparisonSearch(e.target.value)} placeholder="Найти муниципалитет…"/></label>
                <div className="compare-options">{comparisonCandidates.map((m) => {
                  const checked = selectedCompareIds.includes(m.id);
                  const disabled = !checked && selectedCompareIds.length >= 4;
                  return <label key={m.id} className={`compare-option ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleCompare(m.id)}/><span className="compare-checkmark"><Icon name="check"/></span><span className="compare-option-copy"><strong>{m.name}</strong><small>Группа {m.group2024} · место {m.rank2024}</small></span><span className="compare-option-score">{formatNumber(m.score)}</span></label>;
                })}</div>
                <p className="picker-note"><Icon name="info"/> Можно сравнить до четырёх территорий. Используется текущий набор данных; пропущенные показатели обозначены прочерком.</p>
              </aside>
              <div className="compare-analysis">
                <div className="analysis-toolbar"><div><span className="micro-label">ОСНОВНОЙ СРЕЗ</span><h3>Сравнить по показателю</h3></div><label className="select-field"><span>Показатель диаграммы</span><select value={comparisonMetric} onChange={(e) => setComparisonMetric(e.target.value)}>{METRICS.map((metric) => <option key={metric.key} value={metric.key}>{metric.label}</option>)}</select></label></div>
                {comparisonItems.length < 2 ? <div className="empty-state comparison-empty"><span>Нужно выбрать минимум две территории</span><p>Отметьте муниципалитеты в списке слева, чтобы увидеть сравнение.</p></div> : <>
                  <div className="comparison-chart-card"><div className="chart-card-heading"><div><strong>{comparisonMetricDef.label}</strong><span>{comparisonMetricDef.unit === 'место' ? 'Меньший номер означает более высокую позицию' : `Единица измерения: ${comparisonMetricDef.unit}`}</span></div><span className="chart-chip">{comparisonItems.length} территории</span></div>
                    {(() => {
                      const values = comparisonItems.map((m) => comparisonMetricDef.get(m));
                      const maxVal = comparisonMetric === 'rank2024' ? Math.max(...municipalities.map((m) => Number(m.rank2024 || 0)), 1) : Math.max(...values, 1);
                      return comparisonItems.map((m, index) => {
                        const val = comparisonMetricDef.get(m);
                        const barVal = val == null ? 0 : comparisonMetric === 'rank2024' ? maxVal + 1 - val : val;
                        const denom = comparisonMetric === 'rank2024' ? maxVal : Math.max(...values, 1);
                        const width = val == null ? 0 : Math.max(3, Math.min(100, (barVal / denom) * 100));
                        const paletteClass = ['bar-forest', 'bar-ochre', 'bar-moss', 'bar-russet'][index % 4];
                        return <div className="comparison-bar-row" key={m.id}><div className="comparison-bar-label"><span className="comparison-number">0{index + 1}</span><strong>{m.name}</strong></div><div className="comparison-bar-track"><i className={paletteClass} style={{ width: `${width}%` }}/></div><strong className="comparison-bar-value">{comparisonMetricDef.format(m)}</strong></div>;
                      });
                    })()}
                  </div>
                  <div className="compare-value-grid">{comparisonItems.map((m, index) => <article className="compare-value-card" key={m.id}><span className={`compare-color-mark mark-${index + 1}`}/><span className="compare-value-name">{m.name}</span><strong>{comparisonMetricDef.format(m)}</strong><small>Группа {m.group2024} · место {m.rank2024}</small></article>)}</div>
                  <div className="compare-details-card"><div className="section-heading inner-section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="table"/></span><div><h3>Все показатели рядом</h3><p>Разница видна в одном срезе без переключения страниц</p></div></div><button className="outline-button" onClick={() => downloadCsv(comparisonItems, DEFAULT_REPORT_FIELDS, 'yugra-municipality-comparison')}><Icon name="download"/>Выгрузить CSV</button></div>
                    <div className="table-scroll"><table className="ranking-table comparison-data-table"><thead><tr><th>Показатель</th>{comparisonItems.map((m) => <th key={m.id}>{m.name}</th>)}</tr></thead><tbody>{METRICS.map((metric) => <tr key={metric.key}><td className="metric-name-cell">{metric.label}</td>{comparisonItems.map((m) => <td key={m.id} className={metric.key === comparisonMetric ? 'highlight-metric-cell' : ''}>{metric.format(m)}</td>)}</tr>)}</tbody></table></div>
                  </div>
                </>}
              </div>
            </div>
          </section>}

          {activeTab === 'reports' && <section className="panel full-panel reports-page">
            <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="file"/></span><div><h2>Конструктор аналитических отчётов</h2><p>Настройте выборку, показатели и состав документа до экспорта</p></div></div><div className="toolbar-actions"><button className="outline-button" onClick={loadReportTemplate}><Icon name="refresh"/>Загрузить шаблон</button><button className="outline-button" onClick={saveReportTemplate}><Icon name="save"/>{reportTemplateSaved ? 'Сохранено на устройстве' : 'Сохранить шаблон на устройстве'}</button></div></div>
            <div className="report-workspace">
              <aside className="report-config">
                <div className="config-section"><div className="config-section-heading"><span className="config-step">01</span><div><strong>Параметры документа</strong><small>Название и источник данных</small></div></div>
                  <label className="form-field"><span>Название отчёта</span><input value={reportTitle} onChange={(e) => { setReportTitle(e.target.value); setReportTemplateSaved(false); }} placeholder="Введите название отчёта"/></label>
                  <label className="form-field"><span>Источник данных</span><select value={reportScope} onChange={(e) => { setReportScope(e.target.value); setReportTemplateSaved(false); }}><option value="filtered">Текущий срез из каталога ({filteredMunicipalities.length})</option><option value="all">Все муниципалитеты ({municipalities.length})</option><option value="selected">Выбранные вручную ({reportSelectedIds.length})</option></select></label>
                  {reportScope === 'filtered' && <div className="scope-summary"><Icon name="sliders"/><span>Отчёт будет учитывать поиск, группу, быстрый срез и расширенные фильтры на главной.</span></div>}
                  {reportScope === 'selected' && <div className="report-selection-box"><div className="selection-box-heading"><strong>Выбрать муниципалитеты</strong><span>{reportSelectedIds.length} выбрано</span></div><label className="search-box"><Icon name="search"/><input value={reportSelectionSearch} onChange={(e) => setReportSelectionSearch(e.target.value)} placeholder="Поиск в списке…"/></label><div className="report-selection-list">{municipalities.filter((m) => m.name.toLocaleLowerCase('ru-RU').includes(reportSelectionSearch.trim().toLocaleLowerCase('ru-RU'))).map((m) => <label key={m.id} className="report-selection-item"><input type="checkbox" checked={reportSelectedIds.includes(m.id)} onChange={() => toggleReportSelection(m.id)}/><span>{m.name}</span><small>{m.group2024}</small></label>)}</div></div>}
                </div>
                <div className="config-section"><div className="config-section-heading"><span className="config-step">02</span><div><strong>Показатели в таблице</strong><small>Отметьте нужные поля</small></div></div><div className="metric-check-grid">{METRICS.map((metric) => <label className="metric-check" key={metric.key}><input type="checkbox" checked={reportFields.includes(metric.key)} onChange={() => toggleReportField(metric.key)}/><span className="custom-check"><Icon name="check"/></span><span><strong>{metric.label}</strong><small>{metric.unit}</small></span></label>)}</div><div className="selection-actions"><button className="text-action" onClick={() => { setReportFields(DEFAULT_REPORT_FIELDS); setReportTemplateSaved(false); }}>Выбрать все</button><button className="text-action" onClick={() => { setReportFields([]); setReportTemplateSaved(false); }}>Очистить</button></div></div>
                <div className="config-section"><div className="config-section-heading"><span className="config-step">03</span><div><strong>Состав документа</strong><small>Блоки предпросмотра и PDF</small></div></div>
                  <label className="switch-row"><span><strong>Сводные показатели</strong><small>Количество территорий, средний балл, инвестиции, МСП</small></span><input type="checkbox" checked={reportIncludeSummary} onChange={(e) => { setReportIncludeSummary(e.target.checked); setReportTemplateSaved(false); }}/><i/></label>
                  <label className="switch-row"><span><strong>Диаграмма сравнения</strong><small>Показать выбранный показатель по муниципалитетам</small></span><input type="checkbox" checked={reportIncludeChart} onChange={(e) => { setReportIncludeChart(e.target.checked); setReportTemplateSaved(false); }}/><i/></label>
                  {reportIncludeChart && <label className="form-field chart-metric-select"><span>Показатель диаграммы</span><select value={reportChartMetric} onChange={(e) => { setReportChartMetric(e.target.value); setReportTemplateSaved(false); }}>{METRICS.map((metric) => <option key={metric.key} value={metric.key}>{metric.label}</option>)}</select></label>}
                  <label className="switch-row"><span><strong>Детальная таблица</strong><small>Строки по территориям и выбранные колонки</small></span><input type="checkbox" checked={reportIncludeTable} onChange={(e) => { setReportIncludeTable(e.target.checked); setReportTemplateSaved(false); }}/><i/></label>
                  <label className="switch-row"><span><strong>Методика и оговорки</strong><small>Указать происхождение и необходимость проверки данных</small></span><input type="checkbox" checked={reportIncludeMethodology} onChange={(e) => { setReportIncludeMethodology(e.target.checked); setReportTemplateSaved(false); }}/><i/></label>
                </div>
                <div className="report-actions"><button className="primary-button" onClick={handleExportPDF}><Icon name="download"/>Сохранить / печатать PDF</button><button className="outline-button" onClick={exportReportCsv}><Icon name="table"/>Экспорт CSV</button></div>
              </aside>

              <div className="report-preview-column">
                <div className="preview-topline"><div><span className="micro-label">LIVE PREVIEW</span><h3>Предпросмотр отчёта</h3></div><span className="preview-status"><i/>Обновляется автоматически</span></div>
                <article className="report-document-preview">
                  <div className="report-document-brand"><span className="report-doc-emblem"><img src="/images/khanty-prosperity-seal.svg" alt=""/></span><div><strong>ЮГРА</strong><small>аналитическая платформа муниципалитетов</small></div><span className="document-year">2024</span></div>
                  <div className="report-doc-rule" aria-hidden="true"/>
                  <span className="report-doc-kicker">АНАЛИТИЧЕСКИЙ ОТЧЁТ · {reportDate().toLocaleUpperCase('ru-RU')}</span><h2>{reportTitle || 'Название отчёта не задано'}</h2><p className="report-doc-subtitle">Набор данных: 2024 год. В выборке: <strong>{reportSummary.count}</strong> муниципалитетов.</p>
                  {reportIncludeSummary && <section className="report-preview-section"><div className="report-preview-section-heading"><h4>Ключевые показатели выборки</h4><span>01 / СВОДКА</span></div>{renderReportSummary()}</section>}
                  {reportIncludeChart && <section className="report-preview-section"><div className="report-preview-section-heading"><h4>{reportChartMetricDef.label}</h4><span>02 / СРАВНЕНИЕ</span></div><p className="chart-unit-note">{reportChartMetricDef.unit === 'место' ? 'Для места в рейтинге более длинная полоса означает более высокую позицию.' : `Значение показателя в ${reportChartMetricDef.unit}.`}</p>{reportItems.some((m) => reportChartMetricDef.get(m) != null) ? renderReportChart() : <p className="report-empty-note">Нет заполненных значений этого показателя в выбранной выборке.</p>}</section>}
                  {reportIncludeTable && <section className="report-preview-section"><div className="report-preview-section-heading"><h4>Детализация</h4><span>03 / ТАБЛИЦА</span></div>{reportPrintFields.length === 0 ? <p className="report-empty-note">Выберите хотя бы один показатель для таблицы.</p> : renderReportTable()}</section>}
                  {reportIncludeMethodology && <div className="report-method-note"><Icon name="info"/><p>Источник данных: {lastSyncedAt ? 'Supabase (последняя успешная загрузка)' : 'резервный локальный набор'}. Перед официальной публикацией сверяйте первоисточники, период наблюдения и методику расчёта.</p></div>}
                  <div className="report-doc-footer"><span>ЮГРА · ЛЮДИ · ЗЕМЛЯ · ПРИРОДА</span><span>Сформировано {reportDate()}</span></div>
                </article>
              </div>
            </div>
          </section>}
        </main>

        <footer className="site-footer"><div className="footer-brand"><span className="footer-emblem"><img src="/images/khanty-prosperity-seal.svg" alt=""/></span><span><strong>ЮГРА</strong><small>Земля традиций</small></span></div><p>Ханты · Манси · Северная культура</p><div className="footer-right"><span>ЛЮДИ · ЗЕМЛЯ · ПРИРОДА</span><span className="footer-ornament" aria-hidden="true"/></div></footer>
      </div>

      {activeModalItem && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setActiveModalItem(null); }}><section className="municipality-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-ornament" aria-hidden="true"/><div className="modal-topline"><span className="eyebrow"><span className="eyebrow-diamond"/> ПАСПОРТ ТЕРРИТОРИИ</span><button className="close-button" onClick={() => setActiveModalItem(null)} aria-label="Закрыть"><Icon name="close"/></button></div>
        <h2 id="modal-title">{activeModalItem.name}</h2><p className="modal-intro">Ключевые показатели муниципального образования</p>
        <div className="modal-group-line"><span className={`group-badge ${activeModalItem.group2024 === 'A' ? 'group-a' : 'group-b'}`}><i/>Группа {activeModalItem.group2024}</span><span>Рейтинг № {activeModalItem.rank2024}</span></div>
        <div className="modal-stats"><div><span>Итоговый балл</span><strong>{formatNumber(activeModalItem.score, 1)}</strong></div><div><span>Инвестиции без добычи</span><strong>{formatBillion(activeModalItem.investments.volumeBillion)}</strong></div><div><span>Динамика инвестиций</span><strong className="growth-value">{numericValue(activeModalItem.investments?.growthPercent) == null ? '—' : `${formatNumber(activeModalItem.investments.growthPercent)}%`}</strong></div><div><span>Субъекты МСП</span><strong>{formatNumber(activeModalItem.smeCount)}</strong></div><div><span>Оценка предпринимателей</span><strong>{formatNumber(activeModalItem.assessmentScore, 2)} / 5.0</strong></div></div>
        <button className="primary-button modal-print" onClick={() => { setReportScope('selected'); setReportSelectedIds([activeModalItem.id]); setActiveModalItem(null); navigateToTab('reports'); }}><Icon name="file"/>Создать отчёт по территории</button>
      </section></div>}
    </div>
  );
};

export default InvestmentDetails;
