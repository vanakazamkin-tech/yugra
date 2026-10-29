import React, { useEffect, useMemo, useState } from 'react';
import data from '../data/municipalities-detailed.json';
import { UgraMap, UgraMapList } from './components/UgraMap';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { fetchMunicipalities } from './lib/municipalities';
import Forecasting from './components/Forecasting';
import { FALLBACK_DATA_SOURCES, fetchOfficialData, DATA_CATEGORY_LABELS, DATA_STATUS_LABELS } from './lib/officialData';

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
const formatReferencePeriod = (item) => {
  const period = item?.reference_period;
  if (!period || period === 'annual') return String(item?.reference_year ?? '—');
  const quarterLabels = { Q1: 'I квартал', Q2: 'II квартал', Q3: 'III квартал', Q4: 'IV квартал' };
  const quarter = String(period).match(/^(\d{4})-(Q[1-4])$/);
  if (quarter) {
    const note = String(item?.notes || '').toLocaleLowerCase('ru-RU');
    const indicatorCode = String(item?.indicator_code || '');
    const isNineMonthCumulative = quarter[2] === 'Q3'
      && (indicatorCode.endsWith('_q3')
        || indicatorCode.startsWith('employees_')
        || note.includes('январь–сентябрь')
        || note.includes('январь-сентябрь'));
    if (isNineMonthCumulative) return `${quarter[1]} · 9 месяцев (январь–сентябрь)`;
    return `${quarter[1]} · ${quarterLabels[quarter[2]]}`;
  }
  const half = String(period).match(/^(\d{4})-H([12])$/);
  if (half) return `${half[1]} · ${half[2] === '1' ? 'I' : 'II'} полугодие`;
  const date = String(period).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (date) return `на ${new Intl.DateTimeFormat('ru-RU').format(new Date(`${period}T00:00:00`))}`;
  return `${item?.reference_year ?? ''} · ${period}`.trim();
};
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
const SURGUT_EMPLOYMENT_SECTORS = [
  { code: 'employees_mining', name: 'Добыча полезных ископаемых' },
  { code: 'employees_manufacturing', name: 'Обрабатывающие производства' },
  { code: 'employees_energy', name: 'Электроэнергия, газ и пар' },
  { code: 'employees_water_supply', name: 'Водоснабжение и обращение с отходами' },
  { code: 'employees_construction', name: 'Строительство' },
  { code: 'employees_trade', name: 'Торговля и ремонт автотранспорта' },
  { code: 'employees_transport', name: 'Транспортировка и хранение' },
  { code: 'employees_hospitality', name: 'Гостиницы и общественное питание' },
  { code: 'employees_information_communication', name: 'Информация и связь' },
  { code: 'employees_finance', name: 'Финансы и страхование' },
  { code: 'employees_real_estate', name: 'Операции с недвижимостью' },
  { code: 'employees_professional_scientific', name: 'Профессиональная и научная деятельность' },
  { code: 'employees_admin_services', name: 'Административные услуги' },
  { code: 'employees_public_admin', name: 'Государственное управление' },
  { code: 'employees_education', name: 'Образование' },
  { code: 'employees_healthcare', name: 'Здравоохранение и социальные услуги' },
];
const OFFICIAL_TREND_SERIES = [
  { code: 'average_employees_q1', title: 'Среднесписочная численность работников', periodLabel: 'I квартал', unit: 'человек', definition: 'Организации без субъектов малого предпринимательства; январь–март каждого года.' },
  { code: 'average_employees_h1', title: 'Среднесписочная численность работников', periodLabel: 'Первое полугодие', unit: 'человек', definition: 'Организации без субъектов малого предпринимательства; январь–июнь каждого года.' },
  { code: 'average_employees_q3', title: 'Среднесписочная численность работников', periodLabel: 'Девять месяцев', unit: 'человек', definition: 'Накопительный показатель за январь–сентябрь; организации без субъектов малого предпринимательства.' },
  { code: 'average_employees_annual', title: 'Среднесписочная численность работников', periodLabel: 'За год', unit: 'человек', definition: 'Итог января–декабря; организации без субъектов малого предпринимательства.' },
  { code: 'own_production_shipments_q1', title: 'Отгрузка собственной продукции и услуг', periodLabel: 'I квартал', unit: 'тыс. руб.', definition: 'Накопительный итог за январь–март, без субъектов малого предпринимательства.' },
  { code: 'own_production_shipments_h1', title: 'Отгрузка собственной продукции и услуг', periodLabel: 'Первое полугодие', unit: 'тыс. руб.', definition: 'Накопительный итог за январь–июнь, без субъектов малого предпринимательства.' },
  { code: 'own_production_shipments_q3', title: 'Отгрузка собственной продукции и услуг', periodLabel: 'Девять месяцев', unit: 'тыс. руб.', definition: 'Накопительный итог за январь–сентябрь, без субъектов малого предпринимательства.' },
  { code: 'own_production_shipments_annual', title: 'Отгрузка собственной продукции и услуг', periodLabel: 'За год', unit: 'тыс. руб.', definition: 'Итог января–декабря, без субъектов малого предпринимательства.' },
  { code: 'resale_goods_q1', title: 'Продажа товаров несобственного производства', periodLabel: 'I квартал', unit: 'тыс. руб.', definition: 'Накопительный итог за январь–март, без субъектов малого предпринимательства.' },
  { code: 'resale_goods_h1', title: 'Продажа товаров несобственного производства', periodLabel: 'Первое полугодие', unit: 'тыс. руб.', definition: 'Накопительный итог за январь–июнь, без субъектов малого предпринимательства.' },
  { code: 'resale_goods_q3', title: 'Продажа товаров несобственного производства', periodLabel: 'Девять месяцев', unit: 'тыс. руб.', definition: 'Накопительный итог за январь–сентябрь, без субъектов малого предпринимательства.' },
  { code: 'resale_goods_annual', title: 'Продажа товаров несобственного производства', periodLabel: 'За год', unit: 'тыс. руб.', definition: 'Итог января–декабря, без субъектов малого предпринимательства.' },
  { code: 'fixed_capital_investment_local_budget', title: 'Инвестиции за счёт средств местного бюджета', periodLabel: 'За год', unit: 'тыс. руб.', definition: 'Отдельная статья муниципальных бюджетных вложений; не общий объём всех инвестиций.' },
  { code: 'fixed_capital_investment_enterprises_non_sme', title: 'Инвестиции организаций без субъектов малого предпринимательства', periodLabel: 'За год', unit: 'тыс. руб.', definition: 'Общий объём инвестиций организаций на территории муниципалитета, без субъектов малого предпринимательства; не смешивать с вложениями местного бюджета.' },
  { code: 'investment_per_capita_no_budget', title: 'Инвестиции на душу населения без бюджетных средств', periodLabel: 'За год', unit: 'руб./чел.', definition: 'Объём инвестиций в основной капитал на душу населения без бюджетных средств; доступные наблюдения относятся к 2021 и 2024 годам.' },
  { code: 'avg_monthly_salary_large_medium_nco', title: 'Среднемесячная зарплата в крупных и средних организациях и НКО', periodLabel: 'За год', unit: 'руб.', definition: 'Среднемесячная номинальная зарплата работников крупных и средних предприятий и НКО; доступные наблюдения относятся к 2021 и 2024 годам.' },
];
const OFFICIAL_COMPARISON_SERIES = [
  { code: 'average_employees_q1', label: 'Численность работников · I квартал', unit: 'человек', definition: 'Среднесписочная численность работников организаций без субъектов малого предпринимательства; накопительный показатель за январь–март.' },
  { code: 'average_employees_h1', label: 'Численность работников · полугодие', unit: 'человек', definition: 'Среднесписочная численность работников организаций без субъектов малого предпринимательства; январь–июнь.' },
  { code: 'average_monthly_salary_q1', label: 'Среднемесячная зарплата · I квартал', unit: 'руб.', definition: 'Среднемесячная начисленная зарплата работников организаций без субъектов малого предпринимательства за январь–март.' },
  { code: 'average_monthly_salary_h1', label: 'Среднемесячная зарплата · полугодие', unit: 'руб.', definition: 'Среднемесячная начисленная зарплата работников организаций без субъектов малого предпринимательства за январь–июнь.' },
  { code: 'retail_turnover_q1', label: 'Оборот розничной торговли · I квартал', unit: 'тыс. руб.', definition: 'Накопительный оборот розничной торговли без субъектов малого предпринимательства за январь–март.' },
  { code: 'retail_turnover_h1', label: 'Оборот розничной торговли · полугодие', unit: 'тыс. руб.', definition: 'Накопительный оборот розничной торговли без субъектов малого предпринимательства за январь–июнь.' },
  { code: 'retail_specialized_food_q1', label: 'Розничная торговля продовольствием · I квартал', unit: 'тыс. руб.', definition: 'Оборот продовольственных товаров, напитков и табачных изделий в специализированных магазинах за январь–март.' },
  { code: 'retail_specialized_food_h1', label: 'Розничная торговля продовольствием · полугодие', unit: 'тыс. руб.', definition: 'Оборот продовольственных товаров, напитков и табачных изделий в специализированных магазинах за январь–июнь.' },
  { code: 'food_service_turnover_q1', label: 'Общественное питание · I квартал', unit: 'тыс. руб.', definition: 'Оборот общественного питания без субъектов малого предпринимательства за январь–март.' },
  { code: 'food_service_turnover_h1', label: 'Общественное питание · полугодие', unit: 'тыс. руб.', definition: 'Оборот общественного питания без субъектов малого предпринимательства за январь–июнь.' },
  { code: 'own_production_shipments_q1', label: 'Отгрузка собственной продукции · I квартал', unit: 'тыс. руб.', definition: 'Отгрузка продукции, работ и услуг собственными силами без субъектов малого предпринимательства за январь–март.' },
  { code: 'own_production_shipments_h1', label: 'Отгрузка собственной продукции · полугодие', unit: 'тыс. руб.', definition: 'Отгрузка продукции, работ и услуг собственными силами без субъектов малого предпринимательства за январь–июнь.' },
  { code: 'resale_goods_q1', label: 'Продажа перепроданных товаров · I квартал', unit: 'тыс. руб.', definition: 'Продажа товаров несобственного производства без субъектов малого предпринимательства за январь–март.' },
  { code: 'resale_goods_h1', label: 'Продажа перепроданных товаров · полугодие', unit: 'тыс. руб.', definition: 'Продажа товаров несобственного производства без субъектов малого предпринимательства за январь–июнь.' },
  { code: 'fairs_count_q1', label: 'Количество проведённых ярмарок · I квартал', unit: 'единиц', definition: 'Количество ярмарок, проведённых в январе–марте 2026 года. Это не количество участников или торговых мест.' },
  { code: 'registered_individual_entrepreneurs_2026_04', label: 'Зарегистрированные индивидуальные предприниматели · на 1 апреля', unit: 'человек', definition: 'Моментный показатель государственного реестра на 1 апреля 2026 года. Это количество зарегистрированных ИП, не число рабочих мест.' },
  { code: 'population_settlement', label: 'Численность населения городов · на 1 января', unit: 'тыс. человек', geographicLevel: 'settlement', definition: 'Оценка численности населения города/населённого пункта из сборника Росстата. Сравниваются города одного уровня; значения не относятся автоматически ко всему району.' },
  { code: 'population_municipality', label: 'Численность населения муниципального образования · на 1 января', unit: 'человек', definition: 'Численность населения муниципального образования или городского округа на 1 января. В сравнении учитывается только уровень муниципального образования и одинаковый год.' },
  { code: 'fixed_capital_investment_local_budget', label: 'Инвестиции за счёт местного бюджета · год', unit: 'тыс. руб.', definition: 'Отдельная статья вложений из местного бюджета; не общий объём инвестиций.' },
  { code: 'fixed_capital_investment_enterprises_non_sme', label: 'Инвестиции организаций без субъектов МСП · год', unit: 'тыс. руб.', definition: 'Общий объём инвестиций организаций на территории муниципалитета без субъектов малого предпринимательства.' },
];
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
  const [officialDataSources, setOfficialDataSources] = useState(FALLBACK_DATA_SOURCES);
  const [officialIndicators, setOfficialIndicators] = useState([]);
  const [investmentSites, setInvestmentSites] = useState([]);
  const [programExecution, setProgramExecution] = useState([]);
  const [fuelPrices, setFuelPrices] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [facilityFilter, setFacilityFilter] = useState('all');
  const [facilitySearch, setFacilitySearch] = useState('');
  const [indicatorSearch, setIndicatorSearch] = useState('');
  const [indicatorMunicipalityFilter, setIndicatorMunicipalityFilter] = useState('all');
  const [officialDataStatus, setOfficialDataStatus] = useState(isSupabaseConfigured ? 'loading' : 'offline');
  const [officialDataError, setOfficialDataError] = useState('');

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

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setOfficialDataStatus('offline');
      return undefined;
    }

    let cancelled = false;
    const loadOfficialData = async () => {
      try {
        const result = await fetchOfficialData(supabase);
        if (cancelled) return;
        setOfficialDataSources(result.sources);
        setOfficialIndicators(result.indicators);
        setInvestmentSites(result.investmentSites);
        setProgramExecution(result.programExecution || []);
        setFuelPrices(result.fuelPrices || []);
        setFacilities(result.facilities || []);
        setOfficialDataStatus('connected');
        setOfficialDataError('');
      } catch (error) {
        if (cancelled) return;
        setOfficialDataStatus('error');
        setOfficialDataError(error?.message || 'Не удалось загрузить каталог официальных данных');
      }
    };

    loadOfficialData();
    const intervalId = window.setInterval(loadOfficialData, 300_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
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
  const [riskYellowThreshold, setRiskYellowThreshold] = useState(285);
  const [riskGreenThreshold, setRiskGreenThreshold] = useState(330);
  const [riskSearch, setRiskSearch] = useState('');
  const [selectedTrendSeries, setSelectedTrendSeries] = useState('average_employees_h1');
  const [selectedSectorYear, setSelectedSectorYear] = useState('2026');
  const [selectedSectorPeriod, setSelectedSectorPeriod] = useState('Q1');
  const [selectedSettlementPopulationId, setSelectedSettlementPopulationId] = useState('surgut');
  const [selectedOfficialComparisonCode, setSelectedOfficialComparisonCode] = useState('own_production_shipments_q1');
  const [selectedOfficialComparisonPeriod, setSelectedOfficialComparisonPeriod] = useState('2026|2026-Q1');
  const [supportMunicipalityId, setSupportMunicipalityId] = useState('megion');
  const [supportInvestmentChange, setSupportInvestmentChange] = useState(8);
  const [supportSmeChange, setSupportSmeChange] = useState(5);
  const [supportScoreChange, setSupportScoreChange] = useState(4);

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
  const [reportIncludeOfficialData, setReportIncludeOfficialData] = useState(false);
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

  const extendedInsights = useMemo(() => {
    const growthRows = municipalities.filter((m) => numericValue(m.investments?.growthPercent) != null);
    const assessmentRows = municipalities.filter((m) => numericValue(m.assessmentScore) != null);
    const investmentRows = municipalities.filter((m) => numericValue(m.investments?.volumeBillion) != null);
    const topInvestment = [...investmentRows].sort((a, b) => Number(b.investments.volumeBillion) - Number(a.investments.volumeBillion))[0] || null;
    const growthAbove100 = growthRows.filter((m) => Number(m.investments.growthPercent) > 100).length;
    return {
      avgGrowth: growthRows.length ? growthRows.reduce((sum, m) => sum + Number(m.investments.growthPercent), 0) / growthRows.length : null,
      growthCoverage: growthRows.length,
      growthAbove100,
      avgAssessment: assessmentRows.length ? assessmentRows.reduce((sum, m) => sum + Number(m.assessmentScore), 0) / assessmentRows.length : null,
      assessmentCoverage: assessmentRows.length,
      topInvestment,
      investmentCoverage: investmentRows.length,
    };
  }, [municipalities]);

  const officialDataSummary = useMemo(() => {
    const municipalIds = new Set(officialIndicators
      .filter((item) => (item.geographic_level || 'municipality') === 'municipality')
      .map((item) => item.municipality_id));
    const settlements = new Set(officialIndicators
      .filter((item) => item.geographic_level === 'settlement')
      .map((item) => item.geographic_name || item.municipality_id));
    const yearValues = officialIndicators.map((item) => Number(item.reference_year)).filter(Number.isFinite);
    return {
      recordCount: officialIndicators.length,
      municipalityCount: municipalIds.size,
      settlementCount: settlements.size,
      latestYear: yearValues.length ? Math.max(...yearValues) : null,
      sourceCount: officialDataSources.length,
      investmentSiteCount: investmentSites.length,
    };
  }, [officialIndicators, officialDataSources, investmentSites]);

  const populationByMunicipality = useMemo(() => {
    const chosen = new Map();
    const candidates = officialIndicators.filter((item) =>
      ['population_municipality', 'population_settlement', 'population_municipality_history'].includes(item.indicator_code)
      && numericValue(item.value) != null
    );
    const scopePriority = (item) => (
      item.geographic_level === 'municipality' || item.indicator_code === 'population_municipality' || item.indicator_code === 'population_municipality_history' ? 0 : 1
    );
    candidates.sort((a, b) =>
      scopePriority(a) - scopePriority(b) || Number(b.reference_year) - Number(a.reference_year)
    );
    candidates.forEach((item) => {
      if (!chosen.has(item.municipality_id)) chosen.set(item.municipality_id, item);
    });
    return chosen;
  }, [officialIndicators]);

  const formatPopulationIndicator = (item) => {
    if (!item) return '—';
    if (item.unit === 'тыс. человек') return `${formatNumber(item.value, 1)} тыс. чел.`;
    if (item.unit === 'человек') return `${formatNumber(item.value)} чел.`;
    return `${formatNumber(item.value, 1)} ${item.unit}`;
  };

  const officialDataQuality = useMemo(() => {
    const municipalRows = officialIndicators.filter((item) => (item.geographic_level || 'municipality') === 'municipality');
    const municipalCoverage = new Set(municipalRows.map((item) => item.municipality_id));
    const latestYear = officialIndicators.reduce((max, item) => {
      const year = Number(item.reference_year);
      return Number.isFinite(year) ? Math.max(max, year) : max;
    }, 0);
    const uniqueIndicators = new Set(officialIndicators.map((item) => item.indicator_code).filter(Boolean));
    const sourceCounts = officialDataSources.reduce((counts, source) => {
      const status = source.import_status || 'identified';
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {});
    const makePillar = (key, title, description, codes, includePrograms = false) => {
      const rows = officialIndicators.filter((item) => codes.includes(item.indicator_code));
      const municipalIndicatorRows = rows.filter((item) => (item.geographic_level || 'municipality') === 'municipality');
      const covered = new Set(municipalIndicatorRows.map((item) => item.municipality_id));
      if (includePrograms) programExecution.forEach((item) => covered.add(item.municipality_id));
      const years = rows.map((item) => Number(item.reference_year)).filter(Number.isFinite);
      const periods = new Set(rows.map((item) => item.reference_period || 'annual'));
      return {
        key, title, description,
        rows: rows.length + (includePrograms ? programExecution.length : 0),
        municipalityCount: covered.size,
        firstYear: years.length ? Math.min(...years) : null,
        lastYear: years.length ? Math.max(...years) : null,
        periodCount: periods.size,
      };
    };
    return {
      totalRows: officialIndicators.length,
      municipalityCount: municipalCoverage.size,
      settlementPopulationCount: new Set(officialIndicators.filter((item) => item.indicator_code === 'population_settlement' && item.geographic_level === 'settlement').map((item) => item.geographic_name || item.municipality_id)).size,
      indicatorCount: uniqueIndicators.size,
      latestYear: latestYear || null,
      pendingSources: (sourceCounts.identified || 0) + (sourceCounts.ready_for_import || 0) + (sourceCounts.access_issue || 0),
      pillars: [
        makePillar('employment', 'Занятость', 'Среднесписочная численность работников в обследуемых организациях; это не полный показатель занятости всего населения.', ['average_employees_q1', 'average_employees_h1']),
        makePillar('income', 'Доходы и заработная плата', 'Есть отдельные показатели зарплаты; полного муниципального ряда доходов населения пока нет.', ['average_monthly_salary_q1', 'average_monthly_salary_h1', 'avg_monthly_salary_large_medium_nco']),
        makePillar('budget', 'Местный бюджет', 'Есть вложения за счёт местного бюджета и отдельные отчёты муниципальных программ, но не полная панель доходов и расходов.', ['fixed_capital_investment_local_budget'], true),
        makePillar('migration', 'Миграция', 'Сопоставимый подтверждённый муниципальный ряд прибывших и выбывших пока не импортирован.', ['migration_arrivals', 'migration_departures', 'migration_balance']),
        makePillar('investment', 'Инвестиции', 'Доступны отдельные значения инвестиций организаций и инвестиций на душу населения; охват периодами различается.', ['fixed_capital_investment_enterprises_non_sme', 'investment_per_capita_no_budget']),
      ],
    };
  }, [officialIndicators, officialDataSources, programExecution]);

  const filteredFacilities = useMemo(() => {
    const query = facilitySearch.trim().toLocaleLowerCase('ru-RU');
    return facilities.filter((facility) => {
      const matchesType = facilityFilter === 'all' || facility.facility_category === facilityFilter;
      const searchText = [facility.name_short, facility.name_full, facility.address]
        .filter(Boolean).join(' ').toLocaleLowerCase('ru-RU');
      return matchesType && (!query || searchText.includes(query));
    });
  }, [facilities, facilityFilter, facilitySearch]);

  const filteredOfficialIndicators = useMemo(() => {
    const query = indicatorSearch.trim().toLocaleLowerCase('ru-RU');
    return [...officialIndicators]
      .filter((item) => indicatorMunicipalityFilter === 'all' || item.municipality_id === indicatorMunicipalityFilter)
      .filter((item) => {
        const text = [item.geographic_name, item.indicator_name, item.municipality_id, item.unit, item.notes]
          .filter(Boolean).join(' ').toLocaleLowerCase('ru-RU');
        return !query || text.includes(query);
      })
      .sort((a, b) => Number(b.reference_year) - Number(a.reference_year)
        || String(b.reference_period || '').localeCompare(String(a.reference_period || ''))
        || String(a.geographic_name || '').localeCompare(String(b.geographic_name || ''), 'ru-RU'));
  }, [officialIndicators, indicatorSearch, indicatorMunicipalityFilter]);

  const programExecutionSummary = useMemo(() => ({
    count: programExecution.length,
    latest: programExecution.length ? programExecution[0] : null,
    averageExecution: programExecution.length
      ? programExecution.reduce((sum, item) => sum + Number(item.execution_percent || 0), 0) / programExecution.length
      : null,
  }), [programExecution]);

  const investmentSiteSummary = useMemo(() => {
    const greenfield = investmentSites.filter((site) => site.site_type?.toLocaleLowerCase('ru-RU') === 'гринфилд');
    const brownfield = investmentSites.filter((site) => site.site_type?.toLocaleLowerCase('ru-RU') === 'браунфилд');
    const largest = [...investmentSites].filter((site) => numericValue(site.area_hectares) != null)
      .sort((a, b) => Number(b.area_hectares) - Number(a.area_hectares))[0] || null;
    return { count: investmentSites.length, greenfieldCount: greenfield.length, brownfieldCount: brownfield.length, largest };
  }, [investmentSites]);

  const modalOfficialIndicators = useMemo(() => {
    if (!activeModalItem) return [];
    return officialIndicators
      .filter((item) => item.municipality_id === activeModalItem.id)
      .sort((a, b) => Number(b.reference_year) - Number(a.reference_year) || a.indicator_name.localeCompare(b.indicator_name, 'ru-RU'));
  }, [officialIndicators, activeModalItem]);

  const surgutPopulationTrend = useMemo(() => {
    const rows = officialIndicators
      .filter((item) => item.indicator_code === 'population_municipality_history' && item.municipality_id === 'surgut')
      .slice()
      .sort((a,b) => Number(a.reference_year)-Number(b.reference_year));
    const values = rows.map((item) => Number(item.value)).filter(Number.isFinite);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 1;
    const points = rows.map((item,index) => ({
      ...item,
      x: rows.length < 2 ? 400 : 38 + index / (rows.length - 1) * 724,
      y: 174 - ((Number(item.value) - min) / Math.max(1, max - min)) * 126,
    }));
    return { rows: points, min, max, latest: points[points.length - 1] || null, first: points[0] || null };
  }, [officialIndicators]);

  const settlementPopulationOptions = useMemo(() => {
    const seen = new Map();
    officialIndicators.filter((item) => item.indicator_code === 'population_settlement' && item.geographic_level === 'settlement' && numericValue(item.value) != null)
      .forEach((item) => {
        if (!seen.has(item.municipality_id)) seen.set(item.municipality_id, {
          id: item.municipality_id,
          name: item.geographic_name || municipalities.find((m) => m.id === item.municipality_id)?.name || item.municipality_id,
        });
      });
    return [...seen.values()].sort((a,b) => a.name.localeCompare(b.name,'ru-RU'));
  }, [officialIndicators, municipalities]);

  const effectiveSettlementPopulationId = settlementPopulationOptions.some((item) => item.id === selectedSettlementPopulationId)
    ? selectedSettlementPopulationId : settlementPopulationOptions[0]?.id || '';

  const settlementPopulationTrend = useMemo(() => {
    const rows = officialIndicators.filter((item) => item.indicator_code === 'population_settlement'
      && item.geographic_level === 'settlement'
      && item.municipality_id === effectiveSettlementPopulationId
      && numericValue(item.value) != null).slice()
      .sort((a,b) => Number(a.reference_year)-Number(b.reference_year));
    const values = rows.map((item) => numericValue(item.value));
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 1;
    const points = rows.map((item,index) => ({
      ...item, numericValue: numericValue(item.value),
      x: rows.length < 2 ? 400 : 44 + index / (rows.length - 1) * 712,
      y: 168 - ((numericValue(item.value) - min) / Math.max(0.000001, max - min)) * 112,
    }));
    return { name: points[0]?.geographic_name || settlementPopulationOptions.find((item) => item.id === effectiveSettlementPopulationId)?.name || 'Город',
      rows: points, first: points[0] || null, latest: points[points.length - 1] || null };
  }, [officialIndicators, effectiveSettlementPopulationId, settlementPopulationOptions]);

  const surgutSectorEmployment = useMemo(() => {
    const year = Number(selectedSectorYear);
    const periodKey = selectedSectorPeriod === 'annual' ? 'annual' : `${year}-${selectedSectorPeriod}`;
    const totalCode = {
      Q1: 'average_employees_q1',
      H1: 'average_employees_h1',
      Q3: 'average_employees_q3',
      annual: 'average_employees_annual',
    }[selectedSectorPeriod];
    const totalRow = officialIndicators.find((item) =>
      item.municipality_id === 'surgut'
      && item.indicator_code === totalCode
      && Number(item.reference_year) === year
      && String(item.reference_period || 'annual') === periodKey
      && numericValue(item.value) != null
    );
    const rows = SURGUT_EMPLOYMENT_SECTORS.map((sector) => {
      const item = officialIndicators.find((candidate) =>
        candidate.municipality_id === 'surgut'
        && candidate.indicator_code === sector.code
        && Number(candidate.reference_year) === year
        && String(candidate.reference_period || 'annual') === periodKey
        && numericValue(candidate.value) != null
      );
      const value = item ? numericValue(item.value) : null;
      return {
        ...sector,
        item: item || null,
        value,
        sharePercent: value != null && numericValue(totalRow?.value) > 0 ? value / Number(totalRow.value) * 100 : null,
      };
    }).filter((item) => item.value != null).sort((a,b) => b.value-a.value);
    const total = totalRow ? numericValue(totalRow.value) : null;
    const listedTotal = rows.reduce((sum,item)=>sum+item.value,0);
    return {
      year, periodKey, total, totalRow, rows, listedTotal,
      coveragePercent: total && total > 0 ? listedTotal / total * 100 : null,
      periodLabel: {Q1:'I квартал (январь–март)',H1:'Полугодие (январь–июнь)',Q3:'9 месяцев (январь–сентябрь)',annual:'Полный год (январь–декабрь)'}[selectedSectorPeriod],
    };
  }, [officialIndicators, selectedSectorYear, selectedSectorPeriod]);

  const surgutComparableTrend = useMemo(() => {
    const config = OFFICIAL_TREND_SERIES.find((series) => series.code === selectedTrendSeries) || OFFICIAL_TREND_SERIES[0];
    const rows = officialIndicators
      .filter((item) => item.municipality_id === 'surgut' && item.indicator_code === config.code && numericValue(item.value) != null)
      .slice()
      .sort((a,b) => Number(a.reference_year)-Number(b.reference_year));
    const values = rows.map((item) => numericValue(item.value));
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 1;
    const points = rows.map((item,index) => ({
      ...item,
      numericValue: numericValue(item.value),
      x: rows.length < 2 ? 400 : 44 + index / (rows.length - 1) * 712,
      y: 168 - ((numericValue(item.value) - min) / Math.max(1, max - min)) * 112,
      changePercent: index > 0 && values[index - 1] !== 0 ? (values[index] / values[index - 1] - 1) * 100 : null,
    }));
    return { ...config, rows: points, first: points[0] || null, latest: points[points.length - 1] || null };
  }, [officialIndicators, selectedTrendSeries]);

  const officialComparisonSeriesOptions = useMemo(() => OFFICIAL_COMPARISON_SERIES.filter((series) => {
    const geographyLevel = series.geographicLevel || 'municipality';
    const periods = new Map();
    officialIndicators.filter((item) =>
      item.indicator_code === series.code
      && (item.geographic_level || 'municipality') === geographyLevel
      && numericValue(item.value) != null
    ).forEach((item) => {
      const periodKey = `${item.reference_year}|${item.reference_period || 'annual'}`;
      if (!periods.has(periodKey)) periods.set(periodKey, new Set());
      periods.get(periodKey).add(item.municipality_id);
    });
    return [...periods.values()].some((municipalityIds) => municipalityIds.size >= 2);
  }), [officialIndicators]);

  const effectiveOfficialComparisonCode = officialComparisonSeriesOptions.some((series) => series.code === selectedOfficialComparisonCode)
    ? selectedOfficialComparisonCode
    : officialComparisonSeriesOptions[0]?.code || selectedOfficialComparisonCode;

  const officialComparisonPeriods = useMemo(() => {
    const geographyLevel = OFFICIAL_COMPARISON_SERIES.find((series) => series.code === effectiveOfficialComparisonCode)?.geographicLevel || 'municipality';
    const seen = new Map();
    officialIndicators.filter((item) =>
      item.indicator_code === effectiveOfficialComparisonCode
      && (item.geographic_level || 'municipality') === geographyLevel
      && numericValue(item.value) != null
    ).forEach((item) => {
      const key = String(item.reference_year) + '|' + String(item.reference_period || 'annual');
      if (!seen.has(key)) seen.set(key, {
        key,
        year: Number(item.reference_year),
        period: item.reference_period || 'annual',
        municipalityIds: new Set(),
      });
      seen.get(key).municipalityIds.add(item.municipality_id);
    });
    const periodRank = (period) => {
      if (period === 'annual') return 50;
      const quarter = String(period).match(/Q([1-4])$/);
      if (quarter) return Number(quarter[1]) * 10;
      const half = String(period).match(/H([12])$/);
      if (half) return Number(half[1]) * 10 + 5;
      return 99;
    };
    // Only offer periods with at least two distinct geographic entities of the same level.
    return [...seen.values()]
      .filter((item) => item.municipalityIds.size >= 2)
      .map(({ municipalityIds, ...item }) => item)
      .sort((a,b) => a.year-b.year || periodRank(a.period)-periodRank(b.period));
  }, [officialIndicators, effectiveOfficialComparisonCode]);

  const effectiveOfficialComparisonPeriod = officialComparisonPeriods.some((period) => period.key === selectedOfficialComparisonPeriod)
    ? selectedOfficialComparisonPeriod
    : officialComparisonPeriods[officialComparisonPeriods.length - 1]?.key || '';

  const officialComparisonConfig = OFFICIAL_COMPARISON_SERIES.find((series) => series.code === effectiveOfficialComparisonCode) || OFFICIAL_COMPARISON_SERIES[0];

  const officialComparisonRows = useMemo(() => {
    const geographyLevel = officialComparisonConfig.geographicLevel || 'municipality';
    return officialIndicators.filter((item) =>
      item.indicator_code === effectiveOfficialComparisonCode
      && (item.geographic_level || 'municipality') === geographyLevel
      && `${item.reference_year}|${item.reference_period || 'annual'}` === effectiveOfficialComparisonPeriod
      && numericValue(item.value) != null
    ).map((item) => ({
      ...item,
      numericValue: numericValue(item.value),
      municipalityName: geographyLevel === 'settlement'
        ? item.geographic_name || municipalities.find((m) => m.id === item.municipality_id)?.name || item.municipality_id
        : municipalities.find((m) => m.id === item.municipality_id)?.name || item.geographic_name || item.municipality_id,
    })).sort((a,b) => b.numericValue-a.numericValue);
  }, [officialIndicators, effectiveOfficialComparisonCode, effectiveOfficialComparisonPeriod, officialComparisonConfig, municipalities]);

  const riskRows = useMemo(() => {
    const query = riskSearch.trim().toLocaleLowerCase('ru-RU');
    return municipalities.map((municipality) => {
      const score = numericValue(municipality.score);
      const level = score == null ? 'unknown' : score >= riskGreenThreshold ? 'green' : score >= riskYellowThreshold ? 'yellow' : 'red';
      return { ...municipality, conceptScore: score, riskLevel: level };
    }).filter((item) => !query || item.name.toLocaleLowerCase('ru-RU').includes(query))
      .sort((a,b) => {
        const priority = { red: 0, yellow: 1, green: 2, unknown: 3 };
        return priority[a.riskLevel] - priority[b.riskLevel] || (a.conceptScore ?? Infinity) - (b.conceptScore ?? Infinity);
      });
  }, [municipalities, riskSearch, riskYellowThreshold, riskGreenThreshold]);

  const riskCounts = useMemo(() => ({
    red: municipalities.filter((m) => numericValue(m.score) != null && Number(m.score) < riskYellowThreshold).length,
    yellow: municipalities.filter((m) => numericValue(m.score) != null && Number(m.score) >= riskYellowThreshold && Number(m.score) < riskGreenThreshold).length,
    green: municipalities.filter((m) => numericValue(m.score) != null && Number(m.score) >= riskGreenThreshold).length,
    missing: municipalities.filter((m) => numericValue(m.score) == null).length,
  }), [municipalities, riskYellowThreshold, riskGreenThreshold]);

  const pillarCoverage = useMemo(() => {
    const idsFor = (codes) => new Set(officialIndicators.filter((item) => codes.includes(item.indicator_code)).map((item) => item.municipality_id));
    return [
      { key: 'employment', title: 'Занятость', description: 'Среднесписочная численность работников и рынок труда', ids: idsFor(['average_employees_q1']) },
      { key: 'income', title: 'Доходы населения', description: 'Заработная плата и связанные показатели доходов', ids: idsFor(['average_monthly_salary_q1', 'avg_monthly_salary_large_medium_nco']) },
      { key: 'budget', title: 'Местный бюджет', description: 'В прототипе есть только отдельные отчёты по муниципальным программам, не полная бюджетная панель', ids: new Set(programExecution.map((item) => item.municipality_id)) },
      { key: 'migration', title: 'Миграция', description: 'Официальный сопоставимый муниципальный ряд пока не импортирован', ids: new Set() },
      { key: 'investment', title: 'Инвестиции', description: 'Есть отдельные официальные оценки инвестиций на душу населения', ids: idsFor(['investment_per_capita_no_budget']) },
    ];
  }, [officialIndicators, programExecution]);

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
  const reportOfficialIndicators = useMemo(() => {
    const ids = new Set(reportItems.map((item) => item.id));
    return officialIndicators
      .filter((item) => ids.has(item.municipality_id) && item.verification_status === 'verified')
      .slice()
      .sort((a,b) => Number(b.reference_year)-Number(a.reference_year)
        || String(b.reference_period || '').localeCompare(String(a.reference_period || ''))
        || String(a.indicator_name || '').localeCompare(String(b.indicator_name || ''), 'ru-RU'));
  }, [reportItems, officialIndicators]);
  const comparisonMetricDef = METRIC_BY_KEY[comparisonMetric] || METRICS[0];
  const reportChartMetricDef = METRIC_BY_KEY[reportChartMetric] || METRICS[0];
  const reportPrintFields = reportFields.filter((key) => METRIC_BY_KEY[key]);

  const requestSort = (key) => setSortConfig((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
  const downloadFilteredOfficialIndicatorsCsv = () => {
    const headers = [
      'Территория',
      'Уровень географии',
      'Показатель',
      'Значение',
      'Единица измерения',
      'Год',
      'Период',
      'Источник данных',
      'URL источника',
      'Статус проверки',
      'Примечание',
    ];
    const rows = filteredOfficialIndicators.map((item) => {
      const municipality = municipalities.find((entry) => entry.id === item.municipality_id);
      const geography = item.geographic_level === 'settlement'
        ? 'Населённый пункт'
        : item.geographic_level === 'region' ? 'Регион' : 'Муниципальное образование';
      return [
        item.geographic_name || municipality?.name || item.municipality_id,
        geography,
        item.indicator_name,
        item.value,
        item.unit,
        item.reference_year,
        formatReferencePeriod(item),
        item.source_id,
        item.source_url,
        item.verification_status,
        item.notes || '',
      ];
    });
    const escape = (value) => '"' + String(value == null ? '' : value).replaceAll('"', '""') + '"';
    const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(escape).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'yugra-official-indicators-filtered.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const downloadSurgutSectorEmploymentCsv = () => {
    const headers = ['Территория','Отрасль','Среднесписочная численность работников','Единица измерения','Период','Доля от общей численности, %','Источник','URL источника','Примечание'];
    const rows = surgutSectorEmployment.rows.map((sector) => [
      'Сургут', sector.name, sector.value, 'человек',
      `${surgutSectorEmployment.year} · ${surgutSectorEmployment.periodLabel}`,
      sector.sharePercent == null ? '' : sector.sharePercent,
      sector.item?.source_id || '', sector.item?.source_url || '', sector.item?.notes || '',
    ]);
    const escape = (value) => '"' + String(value == null ? '' : value).replaceAll('"','""') + '"';
    const csv = '\uFEFF' + [headers, ...rows].map((row)=>row.map(escape).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8;'}));
    const anchor = document.createElement('a');
    anchor.href=url;
    anchor.download=`yugra-surgut-sector-employment-${surgutSectorEmployment.year}-${selectedSectorPeriod}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const downloadSurgutComparableTrendCsv = () => {
    const headers = [
      'Территория',
      'Показатель',
      'Значение',
      'Единица измерения',
      'Период',
      'Изменение к предыдущему периоду, %',
      'Источник данных',
      'URL источника',
      'Примечание',
    ];
    const rows = surgutComparableTrend.rows.map((item) => [
      item.geographic_name || 'Сургут',
      surgutComparableTrend.title,
      item.numericValue,
      surgutComparableTrend.unit,
      formatReferencePeriod(item),
      item.changePercent == null ? '' : item.changePercent,
      item.source_id,
      item.source_url,
      item.notes || '',
    ]);
    const escape = (value) => '"' + String(value == null ? '' : value).replaceAll('"', '""') + '"';
    const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(escape).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'yugra-surgut-' + surgutComparableTrend.code + '.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const downloadOfficialComparisonCsv = () => {
    const headers = ['Территория / населённый пункт', 'Географический уровень', 'Показатель', 'Значение', 'Единица измерения', 'Период', 'Источник', 'URL источника'];
    const rows = officialComparisonRows.map((item) => [
      item.municipalityName,
      item.geographic_level === 'settlement' ? 'Населённый пункт' : 'Муниципальное образование',
      officialComparisonConfig.label,
      item.numericValue,
      officialComparisonConfig.unit,
      formatReferencePeriod(item),
      item.source_id || '',
      item.source_url || '',
    ]);
    const escape = (value) => '"' + String(value == null ? '' : value).replaceAll('"', '""') + '"';
    const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(escape).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'yugra-official-municipal-comparison.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };
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
    const template = { reportTitle, reportScope, reportSelectedIds, reportFields, reportIncludeSummary, reportIncludeChart, reportIncludeTable, reportIncludeMethodology, reportIncludeOfficialData, reportChartMetric };
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
      if (typeof template.reportIncludeOfficialData === 'boolean') setReportIncludeOfficialData(template.reportIncludeOfficialData);
      if (template.reportChartMetric && METRIC_BY_KEY[template.reportChartMetric]) setReportChartMetric(template.reportChartMetric);
      setReportTemplateSaved(true);
    } catch { setReportTemplateSaved(false); }
  };
  const exportReportCsv = () => downloadCsv(reportItems, reportPrintFields, 'yugra-analytical-report');

  const renderTableRows = (items) => items.map((m, index) => {
    const population = populationByMunicipality.get(m.id);
    return <tr key={m.id} onMouseEnter={() => setHoveredRegionId(m.id)} onMouseLeave={() => setHoveredRegionId(null)}>
      <td className="row-number">{String(index + 1).padStart(2, '0')}</td>
      <td className="municipality-cell"><button className="municipality-link" onClick={() => setActiveModalItem(m)}>{m.name}</button></td>
      <td><span className={`group-badge ${m.group2024 === 'A' ? 'group-a' : 'group-b'}`}><i />Группа {m.group2024}</span></td>
      <td className="score-cell"><span className="demo-value">{formatNumber(m.score, 1)}</span><small className="cell-subnote">демо</small></td>
      <td className="number-cell"><span className="demo-value">{numericValue(m.investments?.volumeBillion) == null ? '—' : formatNumber(m.investments.volumeBillion, 1)}</span>{numericValue(m.investments?.volumeBillion) != null && <small className="cell-subnote">млрд ₽ · демо</small>}</td>
      <td className="number-cell"><span className="demo-value">{numericValue(m.investments?.growthPercent) == null ? '—' : `${formatNumber(m.investments.growthPercent, 1)}%`}</span><small className="cell-subnote">демо</small></td>
      <td className="number-cell"><span className="demo-value">{formatNumber(m.smeCount)}</span><small className="cell-subnote">демо</small></td>
      <td className="number-cell"><span className="demo-value">{numericValue(m.assessmentScore) == null ? '—' : `${formatNumber(m.assessmentScore, 2)} / 5`}</span><small className="cell-subnote">демо</small></td>
      <td className="official-population-cell">
        <strong>{formatPopulationIndicator(population)}</strong>
        {population && <small className="cell-subnote">{population.geographic_level === 'settlement' ? (population.geographic_name || 'населённый пункт') : 'муниципальное образование'} · {population.reference_year}</small>}
      </td>
      <td><button className="icon-button" aria-label={`Открыть паспорт: ${m.name}`} onClick={() => setActiveModalItem(m)}><Icon name="arrow"/></button></td>
    </tr>;
  });

  const SortButton = ({ label, column }) => (
    <button
      type="button"
      className="sort-button"
      aria-pressed={sortConfig.key === column}
      aria-label={`Сортировать по полю «${label}»${sortConfig.key === column ? (sortConfig.direction === 'asc' ? ', по возрастанию' : ', по убыванию') : ''}`}
      onClick={() => requestSort(column)}
    >{label}<span aria-hidden="true" className={`sort-state ${sortConfig.key === column ? 'sort-state-active' : ''}`}>{sortConfig.key === column ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</span></button>
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
        <p>Демонстрационные поля рейтинга · Сформировано: {reportDate()} · В выборке: {reportSummary.count} муниципалитетов</p>
        {reportIncludeSummary && <><h2>Сводка</h2>{renderReportSummary()}</>}
        {reportIncludeChart && reportItems.length > 0 && <><h2>Сравнение показателя: {reportChartMetricDef.label}</h2>{renderReportChart()}</>}
        {reportIncludeTable && <><h2>Детализация показателей</h2>{renderReportTable()}</>}
        {reportIncludeOfficialData && <section className="print-official-data">
          <h2>Проверенные официальные наблюдения ({reportOfficialIndicators.length})</h2>
          <p>Отдельный слой фактических данных с первоисточниками. Географический уровень указан в каждой строке; поселковые данные не трактуются автоматически как данные всего района.</p>
          {reportOfficialIndicators.length ? <table className="report-official-data-table">
            <thead><tr><th>Территория / уровень</th><th>Показатель</th><th>Значение</th><th>Период</th><th>Примечание / источник</th></tr></thead>
            <tbody>{reportOfficialIndicators.map((item) => {
              const municipality = municipalities.find((entry) => entry.id === item.municipality_id);
              const geography = item.geographic_level === 'settlement' ? 'Населённый пункт' : item.geographic_level === 'region' ? 'Регион' : 'Муниципальное образование';
              return <tr key={item.id}>
                <td><strong>{item.geographic_name || municipality?.name || item.municipality_id}</strong><br/><small>{geography}</small></td>
                <td>{item.indicator_name}</td>
                <td><strong>{formatNumber(item.value, 2)}</strong><br/><small>{item.unit}</small></td>
                <td>{formatReferencePeriod(item)}</td>
                <td>{item.notes && <small>{item.notes}</small>}{item.source_url && <><br/><a href={item.source_url} target="_blank" rel="noreferrer">Первоисточник</a></>}</td>
              </tr>;
            })}</tbody>
          </table> : <p>Для выбранной выборки нет подтверждённых официальных наблюдений.</p>}
        </section>}
        {reportIncludeMethodology && <p className="print-methodology">Демонстрационные поля каталога загружаются из Supabase или резервного локального набора. Подтверждённые официальные наблюдения выводятся отдельно с периодом, территориальным уровнем и первоисточником. Перед использованием в управленческих решениях необходимо проверить методику и полноту охвата.</p>}
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
            <button aria-current={activeTab === 'risk' ? 'page' : undefined} className={activeTab === 'risk' ? 'nav-item active' : 'nav-item'} onClick={() => navigateToTab('risk')}><Icon name="chart"/>Риски</button>
            <button aria-current={activeTab === 'compare' ? 'page' : undefined} className={activeTab === 'compare' ? 'nav-item active' : 'nav-item'} onClick={() => navigateToTab('compare')}><Icon name="compare"/>Сравнение</button>
            <button aria-current={activeTab === 'reports' ? 'page' : undefined} className={activeTab === 'reports' ? 'nav-item active' : 'nav-item'} onClick={() => navigateToTab('reports')}><Icon name="file"/>Отчёты</button>
            <button title="Режим прогнозирования" aria-label="Режим прогнозирования" aria-current={activeTab === 'forecast' ? 'page' : undefined} className={activeTab === 'forecast' ? 'nav-item active nav-item-forecast' : 'nav-item nav-item-forecast'} onClick={() => navigateToTab('forecast')}><Icon name="chart"/>Прогноз</button>
            <button aria-current={activeTab === 'data' ? 'page' : undefined} className={activeTab === 'data' ? 'nav-item active' : 'nav-item'} onClick={() => navigateToTab('data')}><Icon name="table"/>Данные</button>
            <button aria-current={activeTab === 'about' ? 'page' : undefined} className={activeTab === 'about' ? 'nav-item active' : 'nav-item'} onClick={() => navigateToTab('about')}><Icon name="info"/>О проекте</button>
          </nav>
          <div className="header-motto"><span className="concept-corner">КОНЦЕПТ</span><span className="motto-mark"/>ЛЮДИ · ЗЕМЛЯ · ПРИРОДА</div>
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

            <div className="dashboard-grid dashboard-grid-home">
              <section className="map-panel panel">
                <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="pin"/></span><div><h2>Карта Югры</h2><p>Нажмите на территорию для подробностей</p></div></div><span className="section-tag">ИНТЕРАКТИВНАЯ</span></div>
                <div className="map-stage"><UgraMap municipalities={municipalities} hoveredId={hoveredRegionId} onHover={setHoveredRegionId} onSelect={setActiveModalItem}/><div className="map-watermark" aria-hidden="true"><img src="/images/khanty-prosperity-seal.svg" alt=""/></div></div>
                <div className="map-legend"><span><i className="legend-dot high"/>Группа A</span><span><i className="legend-dot mid"/>Группа B</span><span className="legend-hint">Выберите район на карте</span></div>
                <div className="map-card-footer"><span><Icon name="leaf"/> Территория тайги и рек</span><button onClick={() => navigateToTab('map')}>Открыть карту <Icon name="arrow"/></button></div>
              </section>

              <section className="ranking-panel panel">
                <div className="section-heading ranking-heading"><div className="heading-label"><span className="heading-icon"><Icon name="chart"/></span><div><h2>Сводная таблица муниципалитетов</h2><p>Демо-показатели помечены; население — с годом и географическим уровнем</p></div></div><button className="primary-button" onClick={() => navigateToTab('rating')}>Полный рейтинг <Icon name="arrow"/></button></div>
                <div className="table-meta"><span>НАЙДЕНО <strong>{sortedMunicipalities.length}</strong> ИЗ {municipalities.length}</span><span className="table-sort-hint"><Icon name="sort"/> Сортировка · значения «демо» не официальная статистика</span></div>
                <div className="table-scroll"><table className="ranking-table"><thead><tr><th className="num-col">№</th><th><SortButton label="Муниципальное образование" column="name"/></th><th><SortButton label="Группа" column="group2024"/></th><th><SortButton label="Балл · демо" column="score"/></th><th><SortButton label="Инвестиции · демо" column="investments"/></th><th><SortButton label="Динамика · демо" column="growthPercent"/></th><th><SortButton label="МСП · демо" column="smeCount"/></th><th><SortButton label="Оценка бизнеса · демо" column="assessmentScore"/></th><th><span className="action-heading">Население · источник</span></th><th><span className="action-heading">Паспорт</span></th></tr></thead><tbody>{renderTableRows(sortedMunicipalities)}</tbody></table>
                  {sortedMunicipalities.length === 0 && <div className="empty-state"><span>Ничего не найдено</span><p>Измените фильтры или сбросьте текущий срез.</p><button className="outline-button" onClick={resetFilters}>Сбросить фильтры</button></div>}
                </div>
                <div className="table-footer"><span>Данные муниципальных образований</span><button className="text-action" onClick={() => downloadCsv(sortedMunicipalities, DEFAULT_REPORT_FIELDS, 'yugra-current-slice')}><Icon name="download"/>Выгрузить срез CSV</button></div>
              </section>
            </div>



            <section className="insight-grid" aria-label="Дополнительные аналитические показатели">
              <article className="insight-card">
                <span className="insight-card-kicker">ИНВЕСТИЦИОННАЯ ДИНАМИКА</span>
                <strong>{extendedInsights.avgGrowth == null ? '—' : `${formatNumber(extendedInsights.avgGrowth, 1)}%`}</strong>
                <span>Среднее изменение инвестиций</span>
                <small>по {extendedInsights.growthCoverage} из {municipalities.length} территорий</small>
              </article>
              <article className="insight-card">
                <span className="insight-card-kicker">ТЕРРИТОРИЯ-ЛИДЕР</span>
                <strong className="insight-card-name">{extendedInsights.topInvestment?.name || '—'}</strong>
                <span>Наибольший указанный объём инвестиций</span>
                <small>{extendedInsights.topInvestment ? formatBillion(extendedInsights.topInvestment.investments.volumeBillion) : 'Нет данных'} · охват {extendedInsights.investmentCoverage}/{municipalities.length}</small>
              </article>
              <article className="insight-card">
                <span className="insight-card-kicker">ДЕЛОВОЙ КЛИМАТ</span>
                <strong>{extendedInsights.avgAssessment == null ? '—' : `${formatNumber(extendedInsights.avgAssessment, 2)} / 5`}</strong>
                <span>Средняя оценка бизнеса</span>
                <small>по {extendedInsights.assessmentCoverage} из {municipalities.length} территорий</small>
              </article>
              <article className="insight-card">
                <span className="insight-card-kicker">РОСТ ВЫШЕ 100%</span>
                <strong>{extendedInsights.growthCoverage ? extendedInsights.growthAbove100 : '—'}</strong>
                <span>Территорий с положительной динамикой</span>
                <small>из {extendedInsights.growthCoverage} с доступным показателем</small>
              </article>
            </section>
            <p className="data-quality-note">Все сводные карточки выше — демонстрационные расчёты из концептуального набора и не являются официальной статистикой. Проверенные значения и охват источников показаны отдельно ниже.</p>
            <section className="official-coverage-teaser panel" aria-labelledby="home-official-coverage-title">
              <div className="official-coverage-copy">
                <span className="eyebrow"><span className="eyebrow-diamond"/> ФАКТИЧЕСКИЙ СЛОЙ ДАННЫХ</span>
                <h2 id="home-official-coverage-title">Отдельно от демонстрационных показателей</h2>
                <p>Официальные значения содержат первоисточник, период, единицу измерения и уровень территории. Их покрытие пока неоднородно — недостающие значения не заменяются демо-числами.</p>
              </div>
              <div className="official-coverage-metrics">
                <article><span>Проверенных наблюдений</span><strong>{officialDataSummary.recordCount}</strong><small>в Supabase</small></article>
                <article><span>Муниципалитетов с данными своего уровня</span><strong>{officialDataSummary.municipalityCount} / {municipalities.length}</strong><small>городские поселения отдельно</small></article>
                <article><span>Источников в каталоге</span><strong>{officialDataSources.length}</strong><small>включая источники, ожидающие импорта</small></article>
              </div>
              <div className="official-coverage-footer"><span className={`official-coverage-status official-coverage-status--${officialDataStatus}`}><i/>{officialDataStatus === 'connected' ? 'Официальный слой подключён' : officialDataStatus === 'loading' ? 'Загрузка официального слоя' : officialDataStatus === 'error' ? 'Ошибка чтения официального слоя' : 'Демонстрационный режим'}</span><button className="primary-button" onClick={() => navigateToTab('data')}>Открыть центр данных <Icon name="arrow"/></button></div>
            </section>
          </>}

          {activeTab === 'data' && <section className="data-page">
            <section className="data-page-hero panel">
              <div><span className="eyebrow"><span className="eyebrow-diamond"/> ЦЕНТР ДАННЫХ</span><h1>Источники и проверенные показатели</h1><p>Официальные наблюдения отделены от демонстрационного набора. Здесь видно покрытие, происхождение данных и наборы, подготовленные к импорту.</p></div>
              <span className={`official-status-chip official-status--${officialDataStatus}`}>{officialDataStatus === 'connected' ? 'БАЗА ПОДКЛЮЧЕНА' : officialDataStatus === 'loading' ? 'ЗАГРУЗКА' : officialDataStatus === 'error' ? 'ОШИБКА ЗАГРУЗКИ' : 'ДЕМО-РЕЖИМ'}</span>
            </section>
            <div className="data-page-summary"><article><span>Источников в каталоге</span><strong>{officialDataSources.length}</strong></article><article><span>Проверенных наблюдений</span><strong>{officialDataSummary.recordCount}</strong></article><article><span>Инвестиционных площадок</span><strong>{officialDataSummary.investmentSiteCount}</strong></article><article><span>Отчётов по программам</span><strong>{programExecution.length}</strong></article><article><span>Записей цен на топливо</span><strong>{fuelPrices.length}</strong></article><article><span>Школ и детсадов</span><strong>{facilities.length}</strong></article></div>
            <section className="data-quality-panel panel" aria-labelledby="data-quality-title">
              <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="chart"/></span><div><h2 id="data-quality-title">Качество и покрытие данных</h2><p>Фактический охват подключённой базы; демонстрационные поля рейтинга здесь не учитываются</p></div></div><span className="section-tag">ОФИЦИАЛЬНЫЙ СЛОЙ</span></div>
              <div className="data-quality-kpis">
                <article><span>Подтверждённых наблюдений</span><strong>{officialDataQuality.totalRows}</strong><small>{officialDataQuality.indicatorCount} различных кодов показателей</small></article>
                <article><span>Территорий с муниципальными наблюдениями</span><strong>{officialDataQuality.municipalityCount} / {municipalities.length}</strong><small>муниципальный уровень; отдельно есть население по {officialDataQuality.settlementPopulationCount} городам и населённым пунктам</small></article>
                <article><span>Последний год в базе</span><strong>{officialDataQuality.latestYear ?? '—'}</strong><small>это не означает наличие полного набора за год</small></article>
                <article><span>Источников, ожидающих импорта или доступ</span><strong>{officialDataQuality.pendingSources}</strong><small>найденные, подготовленные и требующие доступа наборы</small></article>
              </div>
              <div className="data-quality-pillar-grid">{officialDataQuality.pillars.map((pillar) => <article className="data-quality-pillar" key={pillar.key}>
                <div className="data-quality-pillar-top"><strong>{pillar.title}</strong><span>{pillar.municipalityCount} террит.</span></div>
                <div className="data-quality-pillar-track"><i style={{width:Math.min(100,pillar.municipalityCount/municipalities.length*100)+'%'}}/></div>
                <div className="data-quality-pillar-meta"><span>{pillar.rows} записей</span><span>{pillar.firstYear == null ? 'Нет временного ряда' : `${pillar.firstYear}–${pillar.lastYear}`}</span></div>
                <p>{pillar.description}</p>
              </article>)}</div>
              <p className="data-quality-footnote">Покрытие означает наличие хотя бы одного наблюдения по группе, а не полноту набора. Для сравнения проверяйте единицы измерения, методику, период, территориальный уровень и первоисточник.</p>
            </section>
            {surgutPopulationTrend.rows.length > 1 && <section className="population-trend-panel panel" aria-labelledby="population-trend-title">
              <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="chart"/></span><div><h2 id="population-trend-title">Историческая динамика населения Сургута</h2><p>Официальный годовой ряд Росстата · численность на 1 января</p></div></div><span className="section-tag">{surgutPopulationTrend.rows.length} НАБЛЮДЕНИЙ</span></div>
              <div className="population-trend-kpis"><article><span>Начало ряда</span><strong>{formatNumber(surgutPopulationTrend.first.value)} чел.</strong><small>{surgutPopulationTrend.first.reference_year} год</small></article><article><span>Последнее значение</span><strong>{formatNumber(surgutPopulationTrend.latest.value)} чел.</strong><small>{surgutPopulationTrend.latest.reference_year} год</small></article><article><span>Изменение за период</span><strong>{formatNumber((surgutPopulationTrend.latest.value/surgutPopulationTrend.first.value-1)*100,1)}%</strong><small>за весь доступный ряд, не годовой темп</small></article></div>
              <div className="population-trend-chart-wrap">
                <svg className="population-trend-chart" viewBox="0 0 800 230" role="img" aria-label="График изменения численности населения Сургута с 2009 по 2025 год">
                  <line x1="38" y1="174" x2="762" y2="174" stroke="#d9d9ca" strokeWidth="1"/>
                  <line x1="38" y1="111" x2="762" y2="111" stroke="#e5e3d7" strokeWidth="1" strokeDasharray="4 5"/>
                  <line x1="38" y1="48" x2="762" y2="48" stroke="#e5e3d7" strokeWidth="1" strokeDasharray="4 5"/>
                  <polyline points={surgutPopulationTrend.rows.map((item)=>`${item.x},${item.y}`).join(' ')} fill="none" stroke="#3d7050" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  {surgutPopulationTrend.rows.map((item,index)=><circle key={item.id} cx={item.x} cy={item.y} r={index===surgutPopulationTrend.rows.length-1?5:3} fill={index===surgutPopulationTrend.rows.length-1?'#b78a49':'#3d7050'} stroke="#fffdf8" strokeWidth="1.5"><title>{item.reference_year}: {formatNumber(item.value)} человек</title></circle>)}
                  <text x="38" y="204" fill="#7c8979" fontSize="12">{surgutPopulationTrend.first.reference_year}</text>
                  <text x="400" y="204" textAnchor="middle" fill="#7c8979" fontSize="12">{surgutPopulationTrend.rows[Math.floor(surgutPopulationTrend.rows.length/2)].reference_year}</text>
                  <text x="762" y="204" textAnchor="end" fill="#7c8979" fontSize="12">{surgutPopulationTrend.latest.reference_year}</text>
                </svg>
              </div>
              <p className="source-panel-note">Источник: <a href={surgutPopulationTrend.latest.source_url} target="_blank" rel="noreferrer">муниципальный паспорт Росстата ↗</a>. Ряд относится к численности городского округа на 1 января. Это историческое наблюдение, не прогноз.</p>
            </section>}
            <section className="population-trend-panel panel" aria-labelledby="settlement-population-trend-title">
              <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="chart"/></span><div><h2 id="settlement-population-trend-title">Динамика населения городов Югры</h2><p>Оценки Росстата на 1 января · уровень населённого пункта, отдельно от района</p></div></div><span className="section-tag">{settlementPopulationTrend.rows.length} НАБЛЮДЕНИЙ</span></div>
              <label className="official-trend-select"><span>Выберите город</span><select value={effectiveSettlementPopulationId} onChange={(event)=>setSelectedSettlementPopulationId(event.target.value)}>{settlementPopulationOptions.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              {settlementPopulationTrend.rows.length > 1 ? <>
                <div className="population-trend-kpis">
                  <article><span>Первый период</span><strong>{formatNumber(settlementPopulationTrend.first.numericValue,1)} тыс. чел.</strong><small>{settlementPopulationTrend.first.reference_year} год</small></article>
                  <article><span>Последнее значение</span><strong>{formatNumber(settlementPopulationTrend.latest.numericValue,1)} тыс. чел.</strong><small>{settlementPopulationTrend.latest.reference_year} год</small></article>
                  <article><span>Изменение между периодами</span><strong className={settlementPopulationTrend.latest.numericValue>=settlementPopulationTrend.first.numericValue?'trend-positive':'trend-negative'}>{formatNumber((settlementPopulationTrend.latest.numericValue/settlementPopulationTrend.first.numericValue-1)*100,1)}%</strong><small>{settlementPopulationTrend.first.reference_year} → {settlementPopulationTrend.latest.reference_year}, не годовой темп</small></article>
                </div>
                <div className="population-trend-chart-wrap">
                  <svg className="population-trend-chart" viewBox="0 0 800 220" role="img" aria-label={`Изменение численности населения города ${settlementPopulationTrend.name} между доступными наблюдениями`}>
                    <line x1="44" y1="168" x2="756" y2="168" stroke="#d9d9ca" strokeWidth="1"/>
                    <line x1="44" y1="112" x2="756" y2="112" stroke="#e5e3d7" strokeWidth="1" strokeDasharray="4 5"/>
                    <line x1="44" y1="56" x2="756" y2="56" stroke="#e5e3d7" strokeWidth="1" strokeDasharray="4 5"/>
                    <polyline points={settlementPopulationTrend.rows.map((item)=>`${item.x},${item.y}`).join(' ')} fill="none" stroke="#3d7050" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    {settlementPopulationTrend.rows.map((item,index)=><g key={item.id}><circle cx={item.x} cy={item.y} r="5" fill={index===settlementPopulationTrend.rows.length-1?'#b78a49':'#3d7050'} stroke="#fffdf8" strokeWidth="1.5"/><text x={item.x} y={Math.max(23,item.y-12)} textAnchor="middle" fill="#46614b" fontSize="12" fontWeight="700">{formatNumber(item.numericValue,1)}</text><text x={item.x} y="194" textAnchor="middle" fill="#7c8979" fontSize="12">{item.reference_year}</text></g>)}
                  </svg>
                </div>
                <div className="table-scroll official-trend-table-wrap"><table className="ranking-table"><thead><tr><th>Город</th><th>Значение, тыс. чел.</th><th>Период</th><th>Географический уровень</th><th>Источник</th></tr></thead><tbody>{settlementPopulationTrend.rows.map((item)=><tr key={item.id}><td>{item.geographic_name || settlementPopulationTrend.name}</td><td className="score-cell">{formatNumber(item.numericValue,1)}</td><td>{formatReferencePeriod(item)}</td><td>Населённый пункт</td><td><a href={item.source_url} target="_blank" rel="noreferrer">Росстат ↗</a></td></tr>)}</tbody></table></div>
              </> : <div className="empty-state"><span>Для выбранного города пока доступно менее двух наблюдений</span><p>Выберите другой город. Значения населённого пункта не трактуются как данные всего муниципального района.</p></div>}
            </section>
            <section className="population-trend-panel panel" aria-labelledby="economic-trend-title">
              <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="chart"/></span><div><h2 id="economic-trend-title">Сопоставимая динамика экономики Сургута</h2><p>Одинаковые периоды за 2024–2026 годы · официальный муниципальный паспорт</p></div></div><div className="toolbar-actions"><span className="section-tag">{surgutComparableTrend.rows.length} НАБЛЮДЕНИЙ</span><button className="outline-button" onClick={downloadSurgutComparableTrendCsv} disabled={surgutComparableTrend.rows.length===0}><Icon name="download"/>CSV</button></div></div>
              <label className="official-trend-select"><span>Показатель и период сравнения</span><select value={selectedTrendSeries} onChange={(event)=>setSelectedTrendSeries(event.target.value)}>{OFFICIAL_TREND_SERIES.map((series)=><option value={series.code} key={series.code}>{series.title} — {series.periodLabel}</option>)}</select></label>
              <p className="official-trend-definition">{surgutComparableTrend.definition}</p>
              {surgutComparableTrend.rows.length > 1 ? <>
                <div className="population-trend-kpis">
                  <article><span>Первый период</span><strong>{formatNumber(surgutComparableTrend.first.numericValue,1)} {surgutComparableTrend.unit}</strong><small>{surgutComparableTrend.first.reference_year} год</small></article>
                  <article><span>Последний период</span><strong>{formatNumber(surgutComparableTrend.latest.numericValue,1)} {surgutComparableTrend.unit}</strong><small>{surgutComparableTrend.latest.reference_year} год</small></article>
                  <article><span>Изменение к первому периоду</span><strong className={surgutComparableTrend.latest.numericValue>=surgutComparableTrend.first.numericValue?'trend-positive':'trend-negative'}>{formatNumber((surgutComparableTrend.latest.numericValue/surgutComparableTrend.first.numericValue-1)*100,1)}%</strong><small>между первым и последним доступным периодом</small></article>
                </div>
                <div className="population-trend-chart-wrap">
                  <svg className="population-trend-chart" viewBox="0 0 800 220" role="img" aria-label={`Динамика показателя «${surgutComparableTrend.title}», ${surgutComparableTrend.periodLabel}, 2024–2026`}>
                    <line x1="44" y1="168" x2="756" y2="168" stroke="#d9d9ca" strokeWidth="1"/>
                    <line x1="44" y1="112" x2="756" y2="112" stroke="#e5e3d7" strokeWidth="1" strokeDasharray="4 5"/>
                    <line x1="44" y1="56" x2="756" y2="56" stroke="#e5e3d7" strokeWidth="1" strokeDasharray="4 5"/>
                    <polyline points={surgutComparableTrend.rows.map((item)=>`${item.x},${item.y}`).join(' ')} fill="none" stroke="#3d7050" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    {surgutComparableTrend.rows.map((item,index)=><g key={item.id}><circle cx={item.x} cy={item.y} r="5" fill={index===surgutComparableTrend.rows.length-1?'#b78a49':'#3d7050'} stroke="#fffdf8" strokeWidth="1.5"/><text x={item.x} y={Math.max(23,item.y-12)} textAnchor="middle" fill="#46614b" fontSize="12" fontWeight="700">{formatNumber(item.numericValue,0)}</text><text x={item.x} y="194" textAnchor="middle" fill="#7c8979" fontSize="12">{item.reference_year}</text></g>)}
                  </svg>
                </div>
                <div className="table-scroll official-trend-table-wrap"><table className="ranking-table"><thead><tr><th>Период</th><th>Значение, {surgutComparableTrend.unit}</th><th>Изменение к предыдущему</th><th>Источник</th></tr></thead><tbody>{surgutComparableTrend.rows.map((item)=><tr key={item.id}><td>{formatReferencePeriod(item)}</td><td className="score-cell">{formatNumber(item.numericValue,1)}</td><td>{item.changePercent==null?'—':`${item.changePercent>0?'+':''}${formatNumber(item.changePercent,1)}%`}</td><td><a href={item.source_url} target="_blank" rel="noreferrer">Росстат ↗</a></td></tr>)}</tbody></table></div>
              </> : <div className="empty-state"><span>Для выбранного показателя пока недостаточно наблюдений</span><p>Выберите другой показатель или проверьте заполненность источника.</p></div>}
            </section>
            <section className="sector-employment-panel panel" aria-labelledby="sector-employment-title">
              <div className="section-heading">
                <div className="heading-label"><span className="heading-icon"><Icon name="people"/></span><div><h2 id="sector-employment-title">Отраслевая структура занятости Сургута</h2><p>Официальная среднесписочная численность работников в 16 отраслях</p></div></div>
                <div className="toolbar-actions"><span className="section-tag">{surgutSectorEmployment.rows.length} ОТРАСЛЕЙ</span><button className="outline-button" onClick={downloadSurgutSectorEmploymentCsv} disabled={!surgutSectorEmployment.rows.length}><Icon name="download"/>CSV</button></div>
              </div>
              <div className="sector-employment-controls">
                <label className="official-trend-select"><span>Год</span><select value={selectedSectorYear} onChange={(event)=>setSelectedSectorYear(event.target.value)}>{['2024','2025','2026'].map((year)=><option key={year} value={year}>{year}</option>)}</select></label>
                <label className="official-trend-select"><span>Период</span><select value={selectedSectorPeriod} onChange={(event)=>setSelectedSectorPeriod(event.target.value)}><option value="Q1">I квартал</option><option value="H1">Первое полугодие</option><option value="Q3">9 месяцев</option><option value="annual">Полный год</option></select></label>
              </div>
              <p className="official-trend-definition">Численность не включает субъектов малого предпринимательства. Для каждого отраслевого среза показывается среднесписочное число работников за выбранный отчётный период — это не сумма работников за несколько периодов. Отсутствующие значения за 2026 год не прогнозируются.</p>
              {surgutSectorEmployment.rows.length ? <>
                <div className="sector-employment-summary">
                  <article><span>Общая численность по обследуемым видам</span><strong>{formatNumber(surgutSectorEmployment.total)} чел.</strong><small>{surgutSectorEmployment.periodLabel} · Росстат</small></article>
                  <article><span>Покрытие выбранными отраслевыми строками</span><strong>{surgutSectorEmployment.coveragePercent == null ? '—' : `${formatNumber(surgutSectorEmployment.coveragePercent,1)}%`}</strong><small>сумма показанных отраслей к общей численности; перечень не включает все виды деятельности</small></article>
                </div>
                <div className="sector-employment-bars">{surgutSectorEmployment.rows.map((sector,index)=><div className="sector-employment-row" key={sector.code}>
                  <div className="sector-employment-label"><span>{String(index+1).padStart(2,'0')}</span><strong>{sector.name}</strong></div>
                  <div className="sector-employment-track"><i style={{width:Math.max(1,sector.value/Math.max(1,surgutSectorEmployment.rows[0].value)*100)+'%'}}/></div>
                  <strong className="sector-employment-value">{formatNumber(sector.value)}<small> чел.</small></strong>
                  <span className="sector-employment-share">{sector.sharePercent == null ? '—' : `${formatNumber(sector.sharePercent,1)}% от общей занятости`}</span>
                </div>)}</div>
              </> : <div className="empty-state"><span>Для выбранного года и периода данных пока нет</span><p>Выберите другой срез. Например, полный год доступен за 2024 и 2025 годы, но ещё не за 2026-й.</p></div>}
              <p className="source-panel-note">Источник: <a href="https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=71876000202420252026" target="_blank" rel="noreferrer">официальный паспорт Сургута в Росстате ↗</a>. В таблице показаны отрасли с отдельными опубликованными значениями; их сумма может быть меньше общей численности работников.</p>
            </section>
            <section className="official-municipal-comparison panel" aria-labelledby="official-municipal-comparison-title">
              <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="compare"/></span><div><h2 id="official-municipal-comparison-title">Сравнение территорий по официальным данным</h2><p>Сравниваем только одинаковые показатель, период и территориальный уровень</p></div></div><span className="section-tag">{officialComparisonRows.length} ТЕРРИТОРИЙ</span></div>
              <div className="official-comparison-controls">
                <label className="official-trend-select"><span>Показатель</span><select value={effectiveOfficialComparisonCode} onChange={(event)=>{setSelectedOfficialComparisonCode(event.target.value);setSelectedOfficialComparisonPeriod('');}}>{officialComparisonSeriesOptions.map((series)=><option key={series.code} value={series.code}>{series.label}</option>)}</select></label>
                <label className="official-trend-select"><span>Период наблюдения</span><select value={effectiveOfficialComparisonPeriod} onChange={(event)=>setSelectedOfficialComparisonPeriod(event.target.value)}>{officialComparisonPeriods.map((period)=><option key={period.key} value={period.key}>{formatReferencePeriod({reference_year:period.year,reference_period:period.period})}</option>)}</select></label>
              </div>
              <p className="official-trend-definition">{officialComparisonConfig.definition} Пропущенные значения не заменяются нулями; показываются только территории с наблюдением за выбранный период.</p>
              {officialComparisonRows.length ? <>
                <div className="official-comparison-chart">{officialComparisonRows.map((item,index)=><div className="official-comparison-row" key={item.id}>
                  <div className="official-comparison-label"><span>{String(index+1).padStart(2,'0')}</span><strong>{item.municipalityName}</strong></div>
                  <div className="official-comparison-track"><i style={{width:Math.max(1,item.numericValue/Math.max(1,officialComparisonRows[0].numericValue)*100)+'%'}}/></div>
                  <strong className="official-comparison-value">{formatNumber(item.numericValue,1)} <small>{officialComparisonConfig.unit}</small></strong>
                </div>)}</div>
                <div className="official-comparison-footer"><span>{officialComparisonConfig.geographicLevel === 'settlement' ? `Показано ${officialComparisonRows.length} городов/населённых пунктов с подтверждённым наблюдением в выбранном срезе.` : `Показано ${officialComparisonRows.length} из ${municipalities.length} муниципалитетов, по которым есть подтверждённое наблюдение в выбранном срезе.`}</span><button className="text-action" onClick={downloadOfficialComparisonCsv}><Icon name="download"/>Выгрузить срез CSV</button></div>
                <div className="table-scroll official-trend-table-wrap"><table className="ranking-table"><thead><tr><th>{officialComparisonConfig.geographicLevel === 'settlement' ? 'Город / населённый пункт' : 'Муниципальное образование'}</th><th>Значение</th><th>Период</th><th>Источник</th></tr></thead><tbody>{officialComparisonRows.map((item)=><tr key={item.id}><td>{item.municipalityName}</td><td className="score-cell">{formatNumber(item.numericValue,1)} {officialComparisonConfig.unit}</td><td>{formatReferencePeriod(item)}</td><td><a href={item.source_url} target="_blank" rel="noreferrer">Росстат ↗</a></td></tr>)}</tbody></table></div>
              </> : <div className="empty-state"><span>Нет сопоставимых наблюдений для выбранного среза</span><p>Выберите показатель или другой период. Для корректного сравнения нужны одна единица измерения и один территориальный уровень.</p></div>}
            </section>
            <section className="official-data-panel panel" aria-labelledby="official-data-heading">
              <div className="section-heading">
                <div className="heading-label"><span className="heading-icon"><Icon name="check"/></span><div><h2 id="official-data-heading">Слой проверенных официальных данных</h2><p>Отдельно от демонстрационных показателей концепта</p></div></div>
                <span className={`official-status-chip official-status--${officialDataStatus}`}>{officialDataStatus === 'connected' ? 'БАЗА ПОДКЛЮЧЕНА' : officialDataStatus === 'loading' ? 'ЗАГРУЗКА' : officialDataStatus === 'error' ? 'ОШИБКА ЗАГРУЗКИ' : 'ДЕМО-РЕЖИМ'}</span>
              </div>
              <div className="official-data-kpis">
                <article><span>Проверенные наблюдения</span><strong>{officialDataSummary.recordCount}</strong><small>значения с зафиксированными источниками</small></article>
                <article><span>Муниципалитеты с муниципальными данными</span><strong>{officialDataSummary.municipalityCount} <i>/ {municipalities.length}</i></strong><small>покрытие именно уровня муниципального образования</small></article>
                <article><span>Города и населённые пункты</span><strong>{officialDataSummary.settlementCount}</strong><small>отдельно от населения всего муниципалитета</small></article>
                <article><span>Последний год наблюдения</span><strong>{officialDataSummary.latestYear ?? '—'}</strong><small>по подтверждённым значениям</small></article>
                <article><span>Инвестплощадки в базе</span><strong>{officialDataSummary.investmentSiteCount}</strong><small>частичный импорт каталога Мегиона</small></article>
              </div>
              {officialIndicators.length > 0 ? <div className="verified-preview">
                <div className="verified-preview-heading"><strong>Последние проверенные значения</strong><span>Источник и год сохраняются для каждой записи</span></div>
                <div className="verified-preview-list">{officialIndicators.slice(0, 6).map((item) => {
                  const municipality = municipalities.find((m) => m.id === item.municipality_id);
                  const geographyLabel = item.geographic_level === 'settlement' ? 'населённый пункт' : item.geographic_level === 'region' ? 'регион' : 'муниципалитет';
                  return <article key={item.id}><span>{item.geographic_name || municipality?.name || item.municipality_id} · {geographyLabel}</span><strong>{item.indicator_name}</strong><b>{formatNumber(item.value, 1)} <i>{item.unit}</i></b><small>{formatReferencePeriod(item)} · <a href={item.source_url} target="_blank" rel="noreferrer">первоисточник ↗</a></small></article>;
                })}</div>
              </div> : <p className="official-data-empty">Проверенные наблюдения ещё не получены. Проверьте соединение с Supabase и статус импорта у источников; пустые значения намеренно не заполняются догадками.</p>}
              {officialDataStatus === 'error' && officialDataError && <p className="official-data-error">Не удалось обновить официальный слой: {officialDataError}</p>}
            </section>

            <section className="official-indicators-table-panel panel" aria-labelledby="all-official-indicators-heading">
              <div className="section-heading">
                <div className="heading-label"><span className="heading-icon"><Icon name="table"/></span><div><h2 id="all-official-indicators-heading">Все загруженные официальные показатели</h2><p>По всем источникам в базе, с отдельными периодами, единицами и первоисточниками</p></div></div>
                <span className="section-tag">{filteredOfficialIndicators.length} ИЗ {officialIndicators.length}</span>
              </div>
              <div className="official-indicator-toolbar">
                <label className="search-box"><Icon name="search"/><input value={indicatorSearch} onChange={(event) => setIndicatorSearch(event.target.value)} placeholder="Поиск показателя, города или единицы…" aria-label="Поиск официальных показателей"/></label>
                <label className="select-field"><span>Муниципалитет</span><select value={indicatorMunicipalityFilter} onChange={(event) => setIndicatorMunicipalityFilter(event.target.value)}><option value="all">Все территории</option>{municipalities.slice().sort((a,b) => a.name.localeCompare(b.name,'ru-RU')).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
                <button type="button" className="outline-button" onClick={downloadFilteredOfficialIndicatorsCsv} disabled={filteredOfficialIndicators.length === 0}><Icon name="download"/>CSV · {filteredOfficialIndicators.length}</button>
                <button type="button" className="outline-button" onClick={() => {setIndicatorSearch('');setIndicatorMunicipalityFilter('all');}}><Icon name="refresh"/>Сбросить</button>
              </div>
              <div className="official-indicator-table-wrap">
                <table className="fuel-prices-table official-indicator-table">
                  <thead><tr><th>Территория / уровень</th><th>Показатель</th><th>Значение</th><th>Период наблюдения</th><th>Примечание</th><th>Источник</th></tr></thead>
                  <tbody>{filteredOfficialIndicators.map((item) => {
                    const municipality = municipalities.find((m) => m.id === item.municipality_id);
                    const geography = item.geographic_level === 'settlement' ? 'Населённый пункт' : item.geographic_level === 'region' ? 'Регион' : 'Муниципальное образование';
                    return <tr key={item.id}>
                      <td><strong>{item.geographic_name || municipality?.name || item.municipality_id}</strong><small>{geography}</small></td>
                      <td><strong>{item.indicator_name}</strong></td>
                      <td className="official-indicator-value">{formatNumber(item.value, 2)}<small>{item.unit}</small></td>
                      <td>{formatReferencePeriod(item)}</td>
                      <td>{item.notes || '—'}</td>
                      <td><a href={item.source_url} target="_blank" rel="noreferrer">Открыть ↗</a></td>
                    </tr>;
                  })}</tbody>
                </table>
                {filteredOfficialIndicators.length === 0 && <div className="empty-state"><span>Показатели не найдены</span><p>Попробуйте изменить поисковый запрос или территорию.</p><button className="outline-button" onClick={() => {setIndicatorSearch('');setIndicatorMunicipalityFilter('all');}}>Сбросить фильтры</button></div>}
              </div>
              <p className="source-panel-note">В таблице отображаются только записи с проверенным статусом. Годовые, квартальные и моментные показатели не объединяются в один период; примечания помогают отличать показатель муниципального образования от данных по населённому пункту.</p>
            </section>

            {investmentSites.length > 0 && <section className="investment-sites-panel panel" aria-labelledby="investment-sites-heading">
              <div className="section-heading">
                <div className="heading-label"><span className="heading-icon"><Icon name="pin"/></span><div><h2 id="investment-sites-heading">Инвестиционные площадки</h2><p>Реестр открытых данных города Мегиона</p></div></div>
                <span className="section-tag">{investmentSites.length} ПРЕДЛОЖЕНИЙ</span>
              </div>
              <div className="investment-site-kpis" aria-label="Сводка по инвестиционным площадкам">
                <article><span>Уникальные предложения</span><strong>{investmentSiteSummary.count}</strong><small>из исходных 18 строк</small></article>
                <article><span>Гринфилд</span><strong>{investmentSiteSummary.greenfieldCount}</strong><small>площадки без существующей застройки по классификации источника</small></article>
                <article><span>Браунфилд</span><strong>{investmentSiteSummary.brownfieldCount}</strong><small>площадки с существующей застройкой/освоением по классификации источника</small></article>
                <article><span>Крупнейшая карточка</span><strong>{investmentSiteSummary.largest ? `${formatNumber(investmentSiteSummary.largest.area_hectares, 2)} га` : '—'}</strong><small>{investmentSiteSummary.largest?.permitted_use || 'Нет данных'}</small></article>
              </div>
              <div className="investment-sites-list">
                {investmentSites.map((site) => {
                  const municipality = municipalities.find((m) => m.id === site.municipality_id);
                  return <article className="investment-site-row" key={site.id}>
                    <div className="investment-site-main">
                      <span className="investment-site-kicker">{municipality?.name || site.municipality_id} · {site.site_type || 'Тип не указан'}</span>
                      <strong>{site.name}</strong>
                      <span className="investment-site-location">{site.location_text || 'Адрес уточняется в первоисточнике'}</span>
                    </div>
                    <div className="investment-site-meta">
                      <span><small>Площадь</small><strong>{site.area_hectares == null ? '—' : `${formatNumber(site.area_hectares, 2)} га`}</strong></span>
                      <span><small>Разрешённое использование</small><strong>{site.permitted_use || '—'}</strong></span>
                      <span><small>Форма сделки</small><strong>{site.offer_type || '—'}</strong></span>
                    </div>
                    <a className="investment-site-source" href={site.source_url} target="_blank" rel="noreferrer">Официальный источник ↗</a>
                  </article>;
                })}
              </div>
              <p className="source-panel-note">Загружено {investmentSites.length} уникальных предложений из 18 исходных строк официального каталога; один полностью дублирующийся ряд исключён. Реестр относится только к Мегиону и не экстраполируется на другие муниципалитеты.</p>
            </section>}

            {programExecution.length > 0 && <section className="program-execution-panel panel" aria-labelledby="program-execution-title">
              <div className="section-heading">
                <div className="heading-label"><span className="heading-icon"><Icon name="chart"/></span><div><h2 id="program-execution-title">Исполнение муниципальных программ</h2><p>Официальные отчётные срезы Мегиона · отчётная дата указана в каждой строке</p></div></div>
                <span className="section-tag">{programExecution.length} ОТЧЁТА</span>
              </div>
              <div className="program-execution-summary">
                <span>Отчётов с проверенными бюджетными значениями</span><strong>{programExecutionSummary.count}</strong>
                <small>Покрытие пока ограничено Мегионом; это не рейтинг исполнения программ всей Югры.</small>
              </div>
              <div className="program-execution-list">
                {programExecution.map((item) => {
                  const municipality = municipalities.find((m) => m.id === item.municipality_id);
                  return <article key={item.id} className="program-execution-row">
                    <div className="program-execution-copy">
                      <span className="program-report-date">{municipality?.name || item.municipality_id} · отчёт на {new Intl.DateTimeFormat('ru-RU').format(new Date(item.report_date + 'T00:00:00'))}</span>
                      <strong>{item.program_name}</strong>
                    </div>
                    <div className="program-execution-metrics">
                      <span><small>Уточнённый бюджет</small><strong>{formatNumber(item.revised_budget_thousand / 1000, 2)} млн ₽</strong></span>
                      <span><small>Исполнено</small><strong>{formatNumber(item.executed_budget_thousand / 1000, 2)} млн ₽</strong></span>
                      <span><small>Доля исполнения</small><strong>{formatNumber(item.execution_percent, 1)}%</strong></span>
                    </div>
                    <a href={item.source_url} target="_blank" rel="noreferrer">Источник ↗</a>
                  </article>;
                })}
              </div>
              <p className="source-panel-note">Суммы переведены из тысяч рублей в миллионы только для отображения. Процент — исполненные расходы / уточнённые ассигнования; это расчёт приложения по опубликованным цифрам, не отдельный показатель источника.</p>
            </section>}

            {fuelPrices.length > 0 && <section className="fuel-prices-panel panel" aria-labelledby="fuel-prices-heading">
              <div className="section-heading">
                <div className="heading-label"><span className="heading-icon"><Icon name="coins"/></span><div><h2 id="fuel-prices-heading">Цены на топливо по АЗС</h2><p>Мегион и посёлок Высокий · версия источника от 28.10.2026</p></div></div>
                <span className="section-tag">{fuelPrices.length} АЗС</span>
              </div>
              <p className="fuel-unit-note">В паспорте источника единица измерения явно не указана, поэтому значения показаны ровно в том виде, в котором опубликованы. Пустые поля и прочерки не считаются нулевыми ценами; исходные значения сохранены для проверки.</p>
              <div className="fuel-prices-table-wrap">
                <table className="fuel-prices-table">
                  <thead><tr><th>АЗС / компания</th><th>Адрес</th><th>АИ‑92</th><th>АИ‑95</th><th>АИ‑98</th><th>Пропан</th><th>Дизель</th><th>Источник</th></tr></thead>
                  <tbody>{fuelPrices.map((fuel) => <tr key={fuel.id}>
                    <td><strong>{fuel.station_name}</strong><small>{fuel.company_name || 'Компания не указана'}</small></td>
                    <td>{fuel.address || '—'}</td>
                    <td>{fuel.gasoline_92 == null ? '—' : formatNumber(fuel.gasoline_92, 2)}</td>
                    <td>{fuel.gasoline_95 == null ? '—' : formatNumber(fuel.gasoline_95, 2)}</td>
                    <td>{fuel.gasoline_98 == null ? '—' : formatNumber(fuel.gasoline_98, 2)}</td>
                    <td>{fuel.propane == null ? '—' : formatNumber(fuel.propane, 2)}</td>
                    <td>{fuel.diesel == null ? '—' : formatNumber(fuel.diesel, 2)}</td>
                    <td><a href={fuel.source_url} target="_blank" rel="noreferrer">CSV ↗</a></td>
                  </tr>)}</tbody>
                </table>
              </div>
              <p className="source-panel-note">Источник: официальный открытый CSV. Версия от 28.10.2026; наблюдения относятся к девяти строкам выгрузки. Нулевые цены на дизель у двух станций сохранены в исходном payload, но нормализованное ценовое поле оставлено пустым до уточнения смысла «0,00» у владельца набора.</p>
            </section>}

            {facilities.length > 0 && <section className="municipal-facilities-panel panel" aria-labelledby="municipal-facilities-heading">
              <div className="section-heading">
                <div className="heading-label"><span className="heading-icon"><Icon name="people"/></span><div><h2 id="municipal-facilities-heading">Образовательная инфраструктура</h2><p>Официальные данные по школам и дошкольным учреждениям Мегиона и посёлка Высокий</p></div></div>
                <span className="section-tag">{facilities.length} ОБЪЕКТОВ</span>
              </div>
              <div className="facility-toolbar">
                <label className="search-box"><Icon name="search"/><input value={facilitySearch} onChange={(event) => setFacilitySearch(event.target.value)} placeholder="Поиск по названию или адресу…" aria-label="Поиск образовательного объекта"/></label>
                <div className="filter-row" aria-label="Фильтр типа образовательного объекта">
                  {[['all','Все'],['school','Школы'],['preschool','Детские сады']].map(([value,label]) => <button type="button" key={value} className={`filter-pill ${facilityFilter === value ? 'selected' : ''}`} onClick={() => setFacilityFilter(value)}>{label}</button>)}
                </div>
              </div>
              <div className="facility-list-meta">Показано <strong>{filteredFacilities.length}</strong> из {facilities.length} объектов. Численность учеников и детей — среднегодовое значение из источника, не нормативная вместимость.</div>
              <div className="fuel-prices-table-wrap">
                <table className="fuel-prices-table facility-table">
                  <thead><tr><th>Учреждение</th><th>Адрес</th><th>Тип</th><th>Учеников / детей в год</th><th>Штат, %</th><th>Координаты</th><th>Версия данных</th></tr></thead>
                  <tbody>{filteredFacilities.map((facility) => <tr key={facility.id}>
                    <td><strong>{facility.name_short || facility.name_full}</strong><small>{facility.name_full}</small></td>
                    <td>{facility.address || '—'}{facility.postal_code && <small>Индекс: {facility.postal_code}</small>}</td>
                    <td>{facility.facility_category === 'preschool' ? 'Дошкольное' : 'Школа'}</td>
                    <td>{facility.annual_attendance == null ? '—' : formatNumber(facility.annual_attendance)}</td>
                    <td>{facility.staffing_percent == null ? '—' : `${formatNumber(facility.staffing_percent, 1)}%`}</td>
                    <td>{facility.latitude == null || facility.longitude == null ? '—' : <a href={`https://www.openstreetmap.org/?mlat=${facility.latitude}&mlon=${facility.longitude}#map=16/${facility.latitude}/${facility.longitude}`} target="_blank" rel="noreferrer">{formatNumber(facility.latitude, 6)}, {formatNumber(facility.longitude, 6)} ↗</a>}</td>
                    <td>{facility.source_updated_at ? new Intl.DateTimeFormat('ru-RU').format(new Date(facility.source_updated_at + 'T00:00:00')) : '—'}<small><a href={facility.source_url} target="_blank" rel="noreferrer">Первоисточник ↗</a></small></td>
                  </tr>)}</tbody>
                </table>
                {filteredFacilities.length === 0 && <div className="empty-state"><span>Объекты не найдены</span><p>Измените запрос или выберите другой тип учреждения.</p><button className="outline-button" onClick={() => {setFacilitySearch('');setFacilityFilter('all');}}>Сбросить фильтры</button></div>}
              </div>
              <p className="source-panel-note">О дошкольных учреждениях импортированы 17 из 18 строк, доступных в поисковом представлении актуального CSV. Реестр школ содержит 7 объектов по версии от 16.12.2024. Дата обновления паспорта набора не заменяет дату фактической версии файла.</p>
            </section>}

            <section className="source-panel panel" aria-labelledby="source-panel-title">
              <div className="section-heading">
                <div className="heading-label"><span className="heading-icon"><Icon name="file"/></span><div><h2 id="source-panel-title">Источники для расширения аналитики</h2><p>Официальные данные и инвестиционные площадки</p></div></div>
                <span className="section-tag">ВНЕШНИЕ ИСТОЧНИКИ</span>
              </div>
              <div className="source-grid">
                {officialDataSources.slice(0, 8).map((source) => <a className="source-item" key={source.id} href={source.url} target="_blank" rel="noreferrer">
                  <span className="source-item-type">{DATA_CATEGORY_LABELS[source.category] || 'ИСТОЧНИК ДАННЫХ'}</span>
                  <strong>{source.name}</strong>
                  <span>{source.description}</span>
                  <span className="source-coverage">{source.coverage || source.format || 'Покрытие уточняется'}</span>
                  <span className="source-item-link">{DATA_STATUS_LABELS[source.import_status] || 'Статус проверяется'} ↗</span>
                </a>)}
              </div>
              <p className="source-panel-note">Показаны 8 приоритетных источников из каталога ({officialDataSources.length} всего). В разделе «О проекте» доступен полный реестр. Статус показывает, найден ли источник, подготовлен ли импорт или данные уже загружены.</p>
            </section>


          </section>}

          {activeTab === 'forecast' && <Forecasting municipalities={municipalities} supabase={supabase} isSupabaseConfigured={isSupabaseConfigured} />}

          {activeTab === 'map' && <section className="panel full-panel">
            <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="map"/></span><div><h2>Муниципальная карта Югры</h2><p>Выберите территорию на карте или в списке</p></div></div><button className="outline-button" onClick={() => setIsMapListOpen(!isMapListOpen)}>{isMapListOpen ? 'Скрыть список' : 'Показать список'}</button></div>
            <div className={`map-layout ${isMapListOpen ? '' : 'map-only'}`}><div className="map-stage large-map"><UgraMap municipalities={municipalities} hoveredId={hoveredRegionId} onHover={setHoveredRegionId} onSelect={setActiveModalItem}/></div>{isMapListOpen && <div className="map-list"><UgraMapList municipalities={municipalities} hoveredId={hoveredRegionId} onHover={setHoveredRegionId} onSelect={setActiveModalItem}/></div>}</div>
          </section>}

          {activeTab === 'rating' && <section className="panel full-panel ranking-page">
            <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="chart"/></span><div><h2>Рейтинг муниципалитетов</h2><p>Полный рейтинг с поиском, срезами и сортировкой</p></div></div><div className="toolbar-actions"><button className="outline-button" onClick={() => downloadCsv(sortedMunicipalities, DEFAULT_REPORT_FIELDS, 'yugra-rating')}><Icon name="download"/>CSV</button><button className="primary-button" onClick={() => { setReportScope('filtered'); navigateToTab('reports'); }}><Icon name="file"/>Собрать отчёт</button></div></div>
            <div className="rating-filters"><label className="search-box"><Icon name="search"/><input aria-label="Поиск в рейтинге" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Найти муниципалитет…"/></label><div className="filter-row">{[['ALL', 'Все группы'], ['A', 'Группа A'], ['B', 'Группа B']].map(([value, label]) => <button key={value} className={`filter-pill ${selectedGroup === value ? 'selected' : ''}`} onClick={() => setSelectedGroup(value)}>{label}</button>)}</div><button className="text-action" onClick={resetFilters}><Icon name="refresh"/>Сбросить фильтры</button></div>
            <div className="table-meta"><span>В ТАБЛИЦЕ <strong>{sortedMunicipalities.length}</strong> МУНИЦИПАЛИТЕТОВ</span><span className="table-sort-hint">Нажмите на заголовок, чтобы изменить порядок</span></div>
            <div className="table-scroll compare-scroll"><table className="ranking-table compare-table"><thead><tr><th className="num-col">№</th><th><SortButton label="Муниципальное образование" column="name"/></th><th><SortButton label="Группа" column="group2024"/></th><th><SortButton label="Балл" column="score"/></th><th><SortButton label="Инвестиции, млрд ₽" column="investments"/></th><th><SortButton label="МСП, ед." column="smeCount"/></th><th><SortButton label="Оценка бизнеса" column="assessmentScore"/></th><th>Паспорт</th></tr></thead><tbody>{sortedMunicipalities.map((m, i) => <tr key={m.id} onMouseEnter={() => setHoveredRegionId(m.id)} onMouseLeave={() => setHoveredRegionId(null)}><td className="row-number">{String(i + 1).padStart(2, '0')}</td><td><button className="municipality-link" onClick={() => setActiveModalItem(m)}>{m.name}</button></td><td><span className={`group-badge ${m.group2024 === 'A' ? 'group-a' : 'group-b'}`}><i/>{`Группа ${m.group2024}`}</span></td><td className="score-cell">{formatNumber(m.score, 1)}</td><td className="number-cell">{formatNumber(m.investments.volumeBillion, 1)}</td><td className="number-cell">{formatNumber(m.smeCount)}</td><td>{formatNumber(m.assessmentScore, 2)} / 5</td><td><button className="icon-button" onClick={() => setActiveModalItem(m)} aria-label={`Открыть паспорт: ${m.name}`}><Icon name="arrow"/></button></td></tr>)}</tbody></table></div>
          </section>}

          {activeTab === 'risk' && <section className="risk-page">
            <section className="risk-hero panel">
              <div><span className="eyebrow"><span className="eyebrow-diamond"/> МОНИТОРИНГ УСТОЙЧИВОСТИ</span><h1>Светофор муниципальных рисков</h1><p>Демонстрационный экран будущей методики. Сейчас зона рассчитывается только по баллу концептуального набора, а не по подтверждённой модели устойчивости. Пороги можно менять, чтобы показать принцип настройки.</p></div>
              <span className="concept-corner">КОНЦЕПТ</span>
            </section>
            <div className="risk-kpi-grid">
              <article className="risk-kpi risk-kpi-red"><span className="risk-dot"/><div><small>КРАСНАЯ ЗОНА</small><strong>{riskCounts.red}</strong><span>ниже жёлтого порога</span></div></article>
              <article className="risk-kpi risk-kpi-yellow"><span className="risk-dot"/><div><small>ЖЁЛТАЯ ЗОНА</small><strong>{riskCounts.yellow}</strong><span>между порогами</span></div></article>
              <article className="risk-kpi risk-kpi-green"><span className="risk-dot"/><div><small>ЗЕЛЁНАЯ ЗОНА</small><strong>{riskCounts.green}</strong><span>выше зелёного порога</span></div></article>
              <article className="risk-kpi risk-kpi-neutral"><span className="risk-dot"/><div><small>НЕТ ДАННЫХ</small><strong>{riskCounts.missing}</strong><span>балл не задан</span></div></article>
            </div>
            <section className="risk-thresholds panel">
              <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="sliders"/></span><div><h2>Настройка порогов</h2><p>Пример настройки будущего светофора риска</p></div></div><button className="outline-button" onClick={() => {setRiskYellowThreshold(285);setRiskGreenThreshold(330);}}><Icon name="refresh"/>Сбросить пороги</button></div>
              <div className="risk-threshold-controls">
                <label><span><i className="risk-dot yellow"/>Нижняя граница жёлтой зоны</span><strong>{riskYellowThreshold} баллов</strong><input type="range" min="240" max={Math.min(325,riskGreenThreshold-5)} step="5" value={riskYellowThreshold} onChange={(event)=>setRiskYellowThreshold(Math.min(Number(event.target.value),riskGreenThreshold-5))}/><small>Ниже — красная зона</small></label>
                <label><span><i className="risk-dot green"/>Нижняя граница зелёной зоны</span><strong>{riskGreenThreshold} баллов</strong><input type="range" min={Math.max(250,riskYellowThreshold+5)} max="385" step="5" value={riskGreenThreshold} onChange={(event)=>setRiskGreenThreshold(Math.max(Number(event.target.value),riskYellowThreshold+5))}/><small>Выше — зелёная зона</small></label>
              </div>
              <p className="risk-assumption-note">Пороги 285 и 330 заданы для демонстрации, а не утверждены методикой. В рабочей версии их нужно обосновать по распределению реальных показателей, экспертным оценкам и проверке на исторических данных.</p>
            </section>
            <section className="risk-pillars panel">
              <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="chart"/></span><div><h2>Пять групп показателей проекта</h2><p>Покрытие официальными данными в текущем прототипе</p></div></div><button className="outline-button" onClick={()=>navigateToTab('data')}>Открыть центр данных <Icon name="arrow"/></button></div>
              <div className="risk-pillar-grid">{pillarCoverage.map((pillar)=><article className="risk-pillar-card" key={pillar.key}><span className="risk-pillar-number">{String(['employment','income','budget','migration','investment'].indexOf(pillar.key)+1).padStart(2,'0')}</span><strong>{pillar.title}</strong><span className="risk-pillar-coverage">{pillar.ids.size} {pillar.ids.size===1?'территория':'территорий'} с данными</span><div className="risk-pillar-track"><i style={{width:Math.min(100,pillar.ids.size/municipalities.length*100)+'%'}}/></div><p>{pillar.description}</p></article>)}</div>
            </section>
            <section className="risk-table-panel panel">
              <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="table"/></span><div><h2>Список территорий</h2><p>Цветовая зона использует только демонстрационный балл</p></div></div><label className="search-box risk-search"><Icon name="search"/><input value={riskSearch} onChange={(event)=>setRiskSearch(event.target.value)} placeholder="Найти муниципалитет…" aria-label="Поиск территории в светофоре"/></label></div>
              <div className="table-scroll"><table className="ranking-table risk-table"><thead><tr><th>Муниципальное образование</th><th>Демо-балл</th><th>Зона</th><th>Группа набора</th><th>Паспорт</th></tr></thead><tbody>{riskRows.map((item)=><tr key={item.id}><td><button className="municipality-link" onClick={()=>setActiveModalItem(item)}>{item.name}</button></td><td className="score-cell">{item.conceptScore==null?'—':formatNumber(item.conceptScore,1)}</td><td><span className={`risk-zone-badge risk-zone-${item.riskLevel}`}><i/>{({green:'Зелёная',yellow:'Жёлтая',red:'Красная',unknown:'Нет данных'})[item.riskLevel]}</span></td><td>{item.group2024?`Группа ${item.group2024} · демо`:'—'}</td><td><button className="icon-button" onClick={()=>setActiveModalItem(item)} aria-label={`Открыть паспорт: ${item.name}`}><Icon name="arrow"/></button></td></tr>)}</tbody></table>{riskRows.length===0&&<div className="empty-state"><span>Территории не найдены</span><p>Попробуйте изменить запрос.</p></div>}</div>
            </section>
          </section>}

          {activeTab === 'compare' && <section className="panel full-panel compare-page">
            <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="compare"/></span><div><h2>Сравнение муниципалитетов</h2><p>Выберите от двух до четырёх территорий и сравните показатели бок о бок</p></div></div><div className="toolbar-actions"><button className="outline-button" onClick={() => setSelectedCompareIds(DEFAULT_COMPARE_IDS.filter((id) => municipalities.some((m) => m.id === id)))}><Icon name="refresh"/>Сбросить выбор</button><button className="primary-button" onClick={() => { setReportScope('selected'); setReportSelectedIds(selectedCompareIds); navigateToTab('reports'); }}><Icon name="file"/>Отчёт по сравнению</button></div></div>
            <div className="compare-workspace">
              <aside className="compare-picker">
                <div className="picker-title"><div><strong>Территории для сравнения</strong><span>Выбрано {selectedCompareIds.length} из 4</span></div><span className="picker-counter">{selectedCompareIds.length}/4</span></div>
                <label className="search-box picker-search"><Icon name="search"/><input aria-label="Поиск территории для сравнения" value={comparisonSearch} onChange={(e) => setComparisonSearch(e.target.value)} placeholder="Найти муниципалитет…"/></label>
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

            <section className="support-simulation panel" aria-labelledby="support-sim-title">
              <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="compare"/></span><div><h2 id="support-sim-title">Сценарий «до и после» мер поддержки</h2><p>Интерактивная иллюстрация будущей оценки эффекта программ</p></div></div><span className="concept-corner">ДЕМО</span></div>
              <div className="support-sim-warning">Изменения ниже — условные пользовательские допущения. Это не измеренный эффект субсидий и не причинно-следственная оценка.</div>
              <div className="support-sim-controls">
                <label className="select-field"><span>Муниципалитет</span><select value={supportMunicipalityId} onChange={(event)=>setSupportMunicipalityId(event.target.value)}>{municipalities.slice().sort((a,b)=>a.name.localeCompare(b.name,'ru-RU')).map((m)=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
                <label><span>Условное изменение инвестиций</span><strong>+{supportInvestmentChange}%</strong><input type="range" min="0" max="30" step="1" value={supportInvestmentChange} onChange={(event)=>setSupportInvestmentChange(Number(event.target.value))}/></label>
                <label><span>Условное изменение МСП</span><strong>+{supportSmeChange}%</strong><input type="range" min="0" max="20" step="1" value={supportSmeChange} onChange={(event)=>setSupportSmeChange(Number(event.target.value))}/></label>
                <label><span>Условное изменение балла</span><strong>+{supportScoreChange}%</strong><input type="range" min="0" max="15" step="1" value={supportScoreChange} onChange={(event)=>setSupportScoreChange(Number(event.target.value))}/></label>
              </div>
              {(() => {
                const selected = municipalities.find((m)=>m.id===supportMunicipalityId) || municipalities[0];
                const baseInvestments = numericValue(selected?.investments?.volumeBillion);
                const baseSme = numericValue(selected?.smeCount);
                const baseScore = numericValue(selected?.score);
                return <div className="support-sim-results">
                  <div className="support-sim-head"><strong>{selected?.name || 'Муниципалитет'}</strong><span>БАЗОВЫЙ СРЕЗ → УСЛОВНЫЙ СЦЕНАРИЙ</span></div>
                  <div className="support-sim-grid">
                    <article><span>Инвестиции · демо</span><strong>{baseInvestments==null?'—':formatBillion(baseInvestments)}</strong><small>После: {baseInvestments==null?'нет данных':formatBillion(baseInvestments*(1+supportInvestmentChange/100))}</small><em>+{supportInvestmentChange}% · допущение</em></article>
                    <article><span>МСП · демо</span><strong>{baseSme==null?'—':formatNumber(baseSme)}</strong><small>После: {baseSme==null?'нет данных':formatNumber(Math.round(baseSme*(1+supportSmeChange/100)))}</small><em>+{supportSmeChange}% · допущение</em></article>
                    <article><span>Балльный показатель · демо</span><strong>{baseScore==null?'—':formatNumber(baseScore,1)}</strong><small>После: {baseScore==null?'нет данных':formatNumber(baseScore*(1+supportScoreChange/100),1)}</small><em>+{supportScoreChange}% · допущение</em></article>
                  </div>
                </div>;
              })()}
              <p className="source-panel-note">Для реального анализа «до/после» потребуются даты и объём меры поддержки, сопоставимые показатели до и после, а также контроль внешних факторов. Сейчас блок демонстрирует только интерфейс будущей функции.</p>
            </section>
          </section>}

          {activeTab === 'reports' && <section className="panel full-panel reports-page">
            <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="file"/></span><div><h2>Конструктор аналитических отчётов</h2><p>Настройте выборку, показатели и состав документа до экспорта</p></div></div><div className="toolbar-actions"><button className="outline-button" onClick={loadReportTemplate}><Icon name="refresh"/>Загрузить шаблон</button><button className="outline-button" onClick={saveReportTemplate}><Icon name="save"/>{reportTemplateSaved ? 'Сохранено на устройстве' : 'Сохранить шаблон на устройстве'}</button></div></div>
            <div className="report-workspace">
              <aside className="report-config">
                <div className="config-section"><div className="config-section-heading"><span className="config-step">01</span><div><strong>Параметры документа</strong><small>Название и источник данных</small></div></div>
                  <label className="form-field"><span>Название отчёта</span><input value={reportTitle} onChange={(e) => { setReportTitle(e.target.value); setReportTemplateSaved(false); }} placeholder="Введите название отчёта"/></label>
                  <label className="form-field"><span>Источник данных</span><select value={reportScope} onChange={(e) => { setReportScope(e.target.value); setReportTemplateSaved(false); }}><option value="filtered">Текущий срез из каталога ({filteredMunicipalities.length})</option><option value="all">Все муниципалитеты ({municipalities.length})</option><option value="selected">Выбранные вручную ({reportSelectedIds.length})</option></select></label>
                  {reportScope === 'filtered' && <div className="scope-summary"><Icon name="sliders"/><span>Отчёт будет учитывать поиск, группу, быстрый срез и расширенные фильтры на главной.</span></div>}
                  {reportScope === 'selected' && <div className="report-selection-box"><div className="selection-box-heading"><strong>Выбрать муниципалитеты</strong><span>{reportSelectedIds.length} выбрано</span></div><label className="search-box"><Icon name="search"/><input aria-label="Поиск муниципалитета в отчёте" value={reportSelectionSearch} onChange={(e) => setReportSelectionSearch(e.target.value)} placeholder="Поиск в списке…"/></label><div className="report-selection-list">{municipalities.filter((m) => m.name.toLocaleLowerCase('ru-RU').includes(reportSelectionSearch.trim().toLocaleLowerCase('ru-RU'))).map((m) => <label key={m.id} className="report-selection-item"><input type="checkbox" checked={reportSelectedIds.includes(m.id)} onChange={() => toggleReportSelection(m.id)}/><span>{m.name}</span><small>{m.group2024}</small></label>)}</div></div>}
                </div>
                <div className="config-section"><div className="config-section-heading"><span className="config-step">02</span><div><strong>Показатели в таблице</strong><small>Отметьте нужные поля</small></div></div><div className="metric-check-grid">{METRICS.map((metric) => <label className="metric-check" key={metric.key}><input type="checkbox" checked={reportFields.includes(metric.key)} onChange={() => toggleReportField(metric.key)}/><span className="custom-check"><Icon name="check"/></span><span><strong>{metric.label}</strong><small>{metric.unit}</small></span></label>)}</div><div className="selection-actions"><button className="text-action" onClick={() => { setReportFields(DEFAULT_REPORT_FIELDS); setReportTemplateSaved(false); }}>Выбрать все</button><button className="text-action" onClick={() => { setReportFields([]); setReportTemplateSaved(false); }}>Очистить</button></div></div>
                <div className="config-section"><div className="config-section-heading"><span className="config-step">03</span><div><strong>Состав документа</strong><small>Блоки предпросмотра и PDF</small></div></div>
                  <label className="switch-row"><span><strong>Сводные показатели</strong><small>Количество территорий, средний балл, инвестиции, МСП</small></span><input type="checkbox" checked={reportIncludeSummary} onChange={(e) => { setReportIncludeSummary(e.target.checked); setReportTemplateSaved(false); }}/><i/></label>
                  <label className="switch-row"><span><strong>Диаграмма сравнения</strong><small>Показать выбранный показатель по муниципалитетам</small></span><input type="checkbox" checked={reportIncludeChart} onChange={(e) => { setReportIncludeChart(e.target.checked); setReportTemplateSaved(false); }}/><i/></label>
                  {reportIncludeChart && <label className="form-field chart-metric-select"><span>Показатель диаграммы</span><select value={reportChartMetric} onChange={(e) => { setReportChartMetric(e.target.value); setReportTemplateSaved(false); }}>{METRICS.map((metric) => <option key={metric.key} value={metric.key}>{metric.label}</option>)}</select></label>}
                  <label className="switch-row"><span><strong>Детальная таблица</strong><small>Строки по территориям и выбранные колонки</small></span><input type="checkbox" checked={reportIncludeTable} onChange={(e) => { setReportIncludeTable(e.target.checked); setReportTemplateSaved(false); }}/><i/></label>
                  <label className="switch-row"><span><strong>Методика и оговорки</strong><small>Указать происхождение и необходимость проверки данных</small></span><input type="checkbox" checked={reportIncludeMethodology} onChange={(e) => { setReportIncludeMethodology(e.target.checked); setReportTemplateSaved(false); }}/><i/></label>
                  <label className="switch-row"><span><strong>Официальные наблюдения</strong><small>Отдельная таблица с источником, географическим уровнем и периодом · {reportOfficialIndicators.length} значений в текущей выборке</small></span><input type="checkbox" checked={reportIncludeOfficialData} onChange={(e) => { setReportIncludeOfficialData(e.target.checked); setReportTemplateSaved(false); }}/><i/></label>
                </div>
                <div className="report-actions"><button className="primary-button" onClick={handleExportPDF}><Icon name="download"/>Сохранить / печатать PDF</button><button className="outline-button" onClick={exportReportCsv}><Icon name="table"/>Экспорт CSV</button></div>
              </aside>

              <div className="report-preview-column">
                <div className="preview-topline"><div><span className="micro-label">LIVE PREVIEW</span><h3>Предпросмотр отчёта</h3></div><span className="preview-status"><i/>Обновляется автоматически</span></div>
                <article className="report-document-preview">
                  <div className="report-document-brand"><span className="report-doc-emblem"><img src="/images/khanty-prosperity-seal.svg" alt=""/></span><div><strong>ЮГРА</strong><small>аналитическая платформа муниципалитетов</small></div><span className="document-year">КОНЦЕПТ</span></div>
                  <div className="report-doc-rule" aria-hidden="true"/>
                  <span className="report-doc-kicker">АНАЛИТИЧЕСКИЙ ОТЧЁТ · {reportDate().toLocaleUpperCase('ru-RU')}</span><h2>{reportTitle || 'Название отчёта не задано'}</h2><p className="report-doc-subtitle">Рейтинговые поля и часть базовых метрик — демонстрационный набор. В выборке: <strong>{reportSummary.count}</strong> муниципалитетов. Подтверждённые официальные наблюдения, если включены, приводятся отдельно с собственным периодом, территориальным уровнем и ссылкой на источник.</p>
                  {reportIncludeSummary && <section className="report-preview-section"><div className="report-preview-section-heading"><h4>Ключевые показатели выборки</h4><span>01 / СВОДКА</span></div>{renderReportSummary()}</section>}
                  {reportIncludeChart && <section className="report-preview-section"><div className="report-preview-section-heading"><h4>{reportChartMetricDef.label}</h4><span>02 / СРАВНЕНИЕ</span></div><p className="chart-unit-note">{reportChartMetricDef.unit === 'место' ? 'Для места в рейтинге более длинная полоса означает более высокую позицию.' : `Значение показателя в ${reportChartMetricDef.unit}.`}</p>{reportItems.some((m) => reportChartMetricDef.get(m) != null) ? renderReportChart() : <p className="report-empty-note">Нет заполненных значений этого показателя в выбранной выборке.</p>}</section>}
                  {reportIncludeTable && <section className="report-preview-section"><div className="report-preview-section-heading"><h4>Детализация</h4><span>03 / ТАБЛИЦА</span></div>{reportPrintFields.length === 0 ? <p className="report-empty-note">Выберите хотя бы один показатель для таблицы.</p> : renderReportTable()}</section>}
                  {reportIncludeOfficialData && <section className="report-preview-section report-official-section">
                    <div className="report-preview-section-heading"><h4>Проверенные официальные наблюдения</h4><span>ОТДЕЛЬНЫЙ СТАТИСТИЧЕСКИЙ СЛОЙ</span></div>
                    <p className="report-official-intro">{reportOfficialIndicators.length} наблюдений по выбранным территориям. Эти значения не смешиваются с демонстрационными баллами, инвестиционными объёмами и оценками из локального набора. Уровень географии указан в каждой строке.</p>
                    {reportOfficialIndicators.length ? <div className="report-official-data-table-wrap"><table className="report-official-data-table">
                      <thead><tr><th>Территория / уровень</th><th>Показатель</th><th>Значение</th><th>Период</th><th>Примечание / источник</th></tr></thead>
                      <tbody>{reportOfficialIndicators.map((item) => {
                        const municipality = municipalities.find((entry) => entry.id === item.municipality_id);
                        const geography = item.geographic_level === 'settlement' ? 'Населённый пункт' : item.geographic_level === 'region' ? 'Регион' : 'Муниципальное образование';
                        return <tr key={item.id}>
                          <td><strong>{item.geographic_name || municipality?.name || item.municipality_id}</strong><small>{geography}</small></td>
                          <td>{item.indicator_name}</td>
                          <td><strong>{formatNumber(item.value, 2)}</strong><small>{item.unit}</small></td>
                          <td>{formatReferencePeriod(item)}</td>
                          <td>{item.notes && <small>{item.notes}</small>}{item.source_url && <a href={item.source_url} target="_blank" rel="noreferrer">Росстат / первоисточник ↗</a>}</td>
                        </tr>;
                      })}</tbody>
                    </table></div> : <p className="report-empty-note">Для выбранной выборки нет подтверждённых официальных наблюдений.</p>}
                  </section>}
                  {reportIncludeMethodology && <div className="report-method-note"><Icon name="info"/><p>Источник данных: {lastSyncedAt ? 'Supabase (последняя успешная загрузка)' : 'резервный локальный набор'}. Перед официальной публикацией сверяйте первоисточники, период наблюдения и методику расчёта.</p></div>}
                  <div className="report-doc-footer"><span>ЮГРА · ЛЮДИ · ЗЕМЛЯ · ПРИРОДА</span><span>Сформировано {reportDate()}</span></div>
                </article>
              </div>
            </div>
          </section>}
          {activeTab === 'about' && <section className="about-page">
            <section className="about-hero panel">
              <span className="eyebrow"><span className="eyebrow-diamond"/> О ПРОЕКТЕ</span>
              <div className="about-hero-layout">
                <div>
                  <h1>Югра — концепт аналитической платформы</h1>
                  <p>Концепт платформы раннего выявления социально-экономических рисков по 22 муниципальным образованиям Югры для Департамента экономического развития округа и муниципальных администраций. Целевая идея — единая база показателей, светофор рисков и сценарии на 1–3 года, включая санкционный стресс. Сейчас сайт демонстрирует продуктовую логику; доступ к полным рядам и научно проверенная прогнозная модель ещё не реализованы.</p>
                </div>
                <div className="about-stamp"><strong>DEMO</strong><span>КОНЦЕПТ</span><span>НЕ ОФИЦИАЛЬНАЯ СТАТИСТИКА</span></div>
              </div>
              <div className="concept-warning"><Icon name="info"/><p><strong>Внимание: демонстрационная версия.</strong> Часть показателей в текущем наборе предназначена для демонстрации интерфейса и логики аналитики; она не подтверждена первичными официальными источниками. Не используйте значения, рейтинг и прогноз для принятия решений до проверки и замены исходных данных.</p></div>
            </section>

            <section className="about-section panel">
              <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="chart"/></span><div><h2>Что умеет прототип</h2><p>Функции, которые готовятся к работе с проверенной статистикой</p></div></div></div>
              <div className="about-capability-grid">
                <article><span>01</span><strong>Единая база</strong><p>Пять групп показателей: занятость, доходы, местный бюджет, миграция и инвестиции. Импорт расширяется по мере доступности источников.</p></article>
                <article><span>02</span><strong>Карта и светофор</strong><p>Округ и 22 муниципалитета на одной панели; концепт настраиваемых зелёной, жёлтой и красной зон.</p></article>
                <article><span>03</span><strong>Сценарии на 1–3 года</strong><p>Базовый, сдержанный, ускоренный и санкционный стресс-сценарии с редактируемыми допущениями.</p></article>
                <article><span>04</span><strong>Оценка мер поддержки</strong><p>Демонстрация сравнения «до и после» и подготовка аналитической справки для руководства.</p></article>
              </div>
            </section>

            <section className="about-section panel">
              <div className="section-heading"><div className="heading-label"><span className="heading-icon"><Icon name="file"/></span><div><h2>Источники и методика</h2><p>Приоритет — первичные, проверяемые и сопоставимые данные</p></div></div></div>
              <div className="about-source-list">
                {officialDataSources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
                  <strong>{source.name}</strong>
                  <span>{source.description}</span>
                  <span className="source-coverage">{source.coverage || source.format || 'Покрытие уточняется'}</span>
                  <span className={`source-status source-status--${source.import_status || 'identified'}`}>{DATA_STATUS_LABELS[source.import_status] || 'Статус проверяется'}</span>
                  <span className="source-item-link">Открыть источник ↗</span>
                </a>)}
              </div>
              <div className="about-methodology"><h3>Правила публикации данных</h3><ol>
                <li>Для каждого значения сохраняются источник, год наблюдения, единица измерения и дата загрузки.</li>
                <li>Региональные данные не подставляются вместо муниципальных; отсутствующие значения отображаются как «нет данных».</li>
                <li>Рассчитанные показатели и сценарные оценки маркируются отдельно от официальной статистики.</li>
                <li>Перед публикацией проверяются названия муниципалитетов, периодичность, сопоставимость методик и полнота охвата.</li>
              </ol></div>
            </section>
          </section>}
        </main>

        <footer className="site-footer"><div className="footer-brand"><span className="footer-emblem"><img src="/images/khanty-prosperity-seal.svg" alt=""/></span><span><strong>ЮГРА</strong><small>Земля традиций</small></span></div><p>Ханты · Манси · Северная культура</p><div className="footer-right"><span>ЛЮДИ · ЗЕМЛЯ · ПРИРОДА</span><span className="footer-ornament" aria-hidden="true"/></div></footer>
      </div>

      {activeModalItem && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setActiveModalItem(null); }}><section className="municipality-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-intro">
        <div className="modal-ornament" aria-hidden="true"/><div className="modal-topline"><span className="eyebrow"><span className="eyebrow-diamond"/> ПАСПОРТ ТЕРРИТОРИИ</span><button autoFocus className="close-button" onClick={() => setActiveModalItem(null)} aria-label="Закрыть"><Icon name="close"/></button></div>
        <h2 id="modal-title">{activeModalItem.name}</h2><p className="modal-intro" id="modal-intro">Демонстрационные показатели проекта приведены отдельно от проверенной официальной статистики.</p>
        <div className="modal-group-line"><span className={`group-badge ${activeModalItem.group2024 === 'A' ? 'group-a' : 'group-b'}`}><i/>Группа {activeModalItem.group2024}</span><span>Рейтинг № {activeModalItem.rank2024}</span></div>
        <div className="modal-demo-label"><Icon name="info"/> ДЕМО-НАБОР · ЗНАЧЕНИЯ НЕ ПРОВЕРЕНЫ КАК ОФИЦИАЛЬНАЯ СТАТИСТИКА</div>
        <div className="modal-stats"><div><span>Итоговый балл · демо</span><strong>{formatNumber(activeModalItem.score, 1)}</strong></div><div><span>Инвестиции · демо</span><strong>{formatBillion(activeModalItem.investments?.volumeBillion)}</strong></div><div><span>Динамика инвестиций · демо</span><strong className="growth-value">{numericValue(activeModalItem.investments?.growthPercent) == null ? '—' : `${formatNumber(activeModalItem.investments.growthPercent)}%`}</strong></div><div><span>Субъекты МСП · демо</span><strong>{formatNumber(activeModalItem.smeCount)}</strong></div><div><span>Оценка бизнеса · демо</span><strong>{formatNumber(activeModalItem.assessmentScore, 2)} / 5.0</strong></div></div>
        <section className="modal-official-data" aria-labelledby="modal-official-heading">
          <div className="modal-official-heading"><h3 id="modal-official-heading">Подтверждённые официальные показатели</h3><span>{modalOfficialIndicators.length} знач.</span></div>
          {modalOfficialIndicators.length > 0 ? <div className="modal-official-list">
            {modalOfficialIndicators.map((item) => <article key={item.id} className="modal-official-row">
              <div><strong>{item.indicator_name}</strong><span>{item.geographic_name || activeModalItem.name} · {item.geographic_level === 'settlement' ? 'населённый пункт' : item.geographic_level === 'region' ? 'регион' : 'муниципалитет'} · {formatReferencePeriod(item)} · {item.unit}</span></div>
              <b>{formatPopulationIndicator(item)}</b>
              <a href={item.source_url} target="_blank" rel="noreferrer">Источник ↗</a>
            </article>)}
          </div> : <p className="modal-no-official">Для этой территории пока нет проверенных официальных показателей в базе. Новые значения будут добавляться только после проверки источника, периода и территориальной привязки.</p>}
        </section>
        {investmentSites.filter((site) => site.municipality_id === activeModalItem.id).length > 0 && <section className="modal-official-data" aria-labelledby="modal-sites-heading">
          <div className="modal-official-heading"><h3 id="modal-sites-heading">Инвестиционные площадки</h3><span>{investmentSites.filter((site) => site.municipality_id === activeModalItem.id).length} объектов</span></div>
          <div className="modal-official-list">{investmentSites.filter((site) => site.municipality_id === activeModalItem.id).map((site) => <article key={site.id} className="modal-official-row modal-site-row">
            <div><strong>{site.name}</strong><span>{site.location_text || 'Адрес указан в первоисточнике'} · {site.site_type || 'тип не указан'}</span><span>Использование: {site.permitted_use || 'не указано'} · {site.offer_type || 'условия уточняются'}</span></div>
            <b>{site.area_hectares == null ? '—' : `${formatNumber(site.area_hectares, 2)} га`}</b>
            <a href={site.source_url} target="_blank" rel="noreferrer">Первоисточник ↗</a>
          </article>)}</div>
        </section>}
        {facilities.filter((facility) => facility.municipality_id === activeModalItem.id).length > 0 && <section className="modal-official-data modal-facilities-passport" aria-labelledby="modal-facilities-heading">
          <div className="modal-official-heading"><h3 id="modal-facilities-heading">Образовательная инфраструктура</h3><span>{facilities.filter((facility) => facility.municipality_id === activeModalItem.id).length} объектов</span></div>
          <p className="modal-no-official">В реестре доступны школы и дошкольные учреждения с адресами и координатами. Дата версии указана у каждого объекта; данные школ относятся к версии 16.12.2024.</p>
          <details className="modal-facilities-details">
            <summary>Показать список учреждений</summary>
            <div className="modal-official-list">{facilities.filter((facility) => facility.municipality_id === activeModalItem.id).map((facility) => <article key={facility.id} className="modal-official-row modal-site-row">
              <div><strong>{facility.name_short || facility.name_full}</strong><span>{facility.facility_category === 'preschool' ? 'Дошкольное учреждение' : 'Школа'} · {facility.address || 'адрес не указан'}</span><span>Среднегодовое число детей/учеников: {formatNumber(facility.annual_attendance)} · штат: {facility.staffing_percent == null ? '—' : `${formatNumber(facility.staffing_percent, 1)}%`}</span><span>Версия данных: {facility.source_updated_at ? new Intl.DateTimeFormat('ru-RU').format(new Date(facility.source_updated_at + 'T00:00:00')) : 'не указана'}</span></div>
              <a href={facility.source_url} target="_blank" rel="noreferrer">Источник ↗</a>
            </article>)}</div>
          </details>
        </section>}
        {programExecution.filter((item) => item.municipality_id === activeModalItem.id).length > 0 && <section className="modal-official-data" aria-labelledby="modal-programs-heading">
          <div className="modal-official-heading"><h3 id="modal-programs-heading">Исполнение муниципальных программ</h3><span>{programExecution.filter((item) => item.municipality_id === activeModalItem.id).length} отчёта</span></div>
          <div className="modal-official-list">{programExecution.filter((item) => item.municipality_id === activeModalItem.id).map((item) => <article key={item.id} className="modal-official-row">
            <div><strong>{item.program_name}</strong><span>Отчёт на {new Intl.DateTimeFormat('ru-RU').format(new Date(item.report_date + 'T00:00:00'))} · уточнённый бюджет {formatNumber(item.revised_budget_thousand / 1000, 2)} млн ₽</span></div>
            <b>{formatNumber(item.execution_percent, 1)}%</b>
            <a href={item.source_url} target="_blank" rel="noreferrer">Первоисточник ↗</a>
          </article>)}</div>
        </section>}
        <button className="primary-button modal-print" onClick={() => { setReportScope('selected'); setReportSelectedIds([activeModalItem.id]); setActiveModalItem(null); navigateToTab('reports'); }}><Icon name="file"/>Создать отчёт по территории</button>
      </section></div>}
    </div>
  );
};

export default InvestmentDetails;
